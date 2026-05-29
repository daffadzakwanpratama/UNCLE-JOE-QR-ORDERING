const express = require("express");
const { getPool, query } = require("../config/db");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const { formatDateOnly, getTodayDateLabel } = require("../utils/date");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  requireNonEmptyString,
  optionalTrimmedString,
  requirePositiveInteger,
  badRequest,
} = require("../utils/validation");

const router = express.Router();

const SERVICE_FEE_AMOUNT = 2000;
const TAX_RATE = 0.1;
const ORDER_STATUS_FLOW = {
  received: "preparing",
  preparing: "ready",
};
const ORDER_NUMBER_PREFIX = "ORD";
const ORDER_NUMBER_MAX_RETRIES = 5;

function calculateServiceFee(subtotal) {
  return subtotal > 0 ? SERVICE_FEE_AMOUNT : 0;
}

function calculateTaxAmount(subtotal) {
  return subtotal > 0 ? Math.round(subtotal * TAX_RATE) : 0;
}

function calculateDiscountAmount(discount, subtotal) {
  if (!discount || subtotal <= 0) {
    return 0;
  }

  if (subtotal < Number(discount.minPurchase || 0)) {
    return 0;
  }

  if (discount.discountType === "percent") {
    const rawDiscount = Math.round((subtotal * Number(discount.discountValue || 0)) / 100);
    const maxDiscount = Number(discount.maxDiscount || 0);
    const finalDiscount = maxDiscount > 0 ? Math.min(rawDiscount, maxDiscount) : rawDiscount;
    return Math.min(finalDiscount, subtotal);
  }

  return Math.min(Number(discount.discountValue || 0), subtotal);
}

function normalizeOrderItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    menuId: requirePositiveInteger(item.menuId || item.id || 0, "Semua item order harus terhubung ke menu yang valid."),
    qty: requirePositiveInteger(item.qty || 1, "Jumlah item order tidak valid."),
    sizeLabel: optionalTrimmedString(item.sizeLabel || item.size || "", { maxLength: 20 }) || null,
    note: optionalTrimmedString(item.note || "") || null,
  }));
}

function formatOrderDateSegment(date = new Date()) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}${month}${year}`;
}

function buildReadableOrderNumber(dateSegment, sequence) {
  return `${ORDER_NUMBER_PREFIX}-${dateSegment}-${String(sequence).padStart(3, "0")}`;
}

async function generateReadableOrderNumber(connection, date = new Date()) {
  const dateSegment = formatOrderDateSegment(date);
  const orderPrefix = `${ORDER_NUMBER_PREFIX}-${dateSegment}-`;
  const [rows] = await connection.execute(
    `SELECT order_number AS orderNumber
     FROM orders
     WHERE order_number LIKE ?
     ORDER BY id DESC
     LIMIT 1`,
    [`${orderPrefix}%`]
  );

  const latestOrderNumber = String(rows[0]?.orderNumber || "").trim();
  const latestSequence = Number(latestOrderNumber.slice(orderPrefix.length)) || 0;

  return buildReadableOrderNumber(dateSegment, latestSequence + 1);
}

function isDuplicateOrderNumberError(error) {
  return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062;
}

router.get("/", requireAdminAuth, asyncHandler(async (request, response) => {
  const orders = await query(
    `SELECT
        o.id,
        o.order_number AS orderNumber,
        o.customer_name AS customerName,
        o.phone_number AS phoneNumber,
        o.table_number AS tableNumber,
        o.payment_method AS paymentMethod,
        o.status,
        o.subtotal,
        o.service_fee AS serviceFee,
        o.tax_amount AS taxAmount,
        o.discount_amount AS discountAmount,
        o.total,
        o.barista_note AS baristaNote,
        GROUP_CONCAT(
          CONCAT(
            oi.qty,
            "x ",
            oi.menu_name,
            CASE
              WHEN oi.size_label IS NOT NULL AND TRIM(oi.size_label) <> ""
              THEN CONCAT(" (", oi.size_label, ")")
              ELSE ""
            END
          )
          ORDER BY oi.id
          SEPARATOR " | "
        ) AS itemSummary,
        GROUP_CONCAT(
          CASE
            WHEN oi.note IS NOT NULL AND TRIM(oi.note) <> ""
            THEN CONCAT(oi.menu_name, ": ", oi.note)
            ELSE NULL
          END
          ORDER BY oi.id
          SEPARATOR " | "
        ) AS itemNotes,
        o.created_at AS createdAt
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY
        o.id,
        o.order_number,
        o.customer_name,
        o.phone_number,
        o.table_number,
        o.payment_method,
        o.status,
        o.subtotal,
        o.service_fee,
        o.tax_amount,
        o.discount_amount,
        o.total,
        o.barista_note,
        o.created_at
      ORDER BY o.created_at DESC`
  );

  response.json({
    success: true,
    data: orders,
  });
}));

router.get("/:orderNumber", asyncHandler(async (request, response) => {
  const orderNumber = requireNonEmptyString(request.params.orderNumber, "Order number wajib diisi.", { maxLength: 30 });

  const orders = await query(
    `SELECT
        o.id,
        o.order_number AS orderNumber,
        o.customer_name AS customerName,
        o.phone_number AS phoneNumber,
        o.table_number AS tableNumber,
        o.payment_method AS paymentMethod,
        o.status,
        o.subtotal,
        o.service_fee AS serviceFee,
        o.tax_amount AS taxAmount,
        o.discount_amount AS discountAmount,
        o.total,
        o.promo_code AS promoCode,
        o.barista_note AS baristaNote,
        o.created_at AS createdAt
     FROM orders o
     WHERE o.order_number = :orderNumber
     LIMIT 1`,
    { orderNumber }
  );

  const order = orders[0];

  if (!order) {
    return response.status(404).json({
      success: false,
      message: "Order tidak ditemukan.",
    });
  }

  const items = await query(
    `SELECT
        id,
        menu_id AS menuId,
        menu_name AS menuName,
        qty,
        size_label AS sizeLabel,
        note,
        unit_price AS unitPrice,
        line_total AS lineTotal
     FROM order_items
     WHERE order_id = :orderId
     ORDER BY id ASC`,
    { orderId: order.id }
  );

  response.json({
    success: true,
    data: {
      ...order,
      items,
    },
  });
}));

router.patch("/:orderNumber/status", requireAdminAuth, asyncHandler(async (request, response) => {
  const orderNumber = requireNonEmptyString(request.params.orderNumber, "Order number wajib diisi.", { maxLength: 30 });

  const orders = await query(
    `SELECT
        id,
        order_number AS orderNumber,
        status
     FROM orders
     WHERE order_number = :orderNumber
     LIMIT 1`,
    { orderNumber }
  );

  const order = orders[0];

  if (!order) {
    return response.status(404).json({
      success: false,
      message: "Order tidak ditemukan.",
    });
  }

  const currentStatus = String(order.status || "received").toLowerCase();
  const nextStatus = ORDER_STATUS_FLOW[currentStatus];

  if (!nextStatus) {
    return response.status(400).json({
      success: false,
      message: "Status pesanan ini tidak memiliki langkah lanjutan.",
    });
  }

  await query(
    `UPDATE orders
     SET status = :nextStatus
     WHERE id = :id`,
    {
      id: order.id,
      nextStatus,
    }
  );

  response.json({
    success: true,
    message: "Status pesanan berhasil diperbarui.",
    data: {
      orderNumber: order.orderNumber,
      previousStatus: currentStatus,
      status: nextStatus,
    },
  });
}));

router.post("/", asyncHandler(async (request, response) => {
  const {
    customerName = "",
    phoneNumber = "",
    tableNumber = "",
    paymentMethod = "",
    subtotal = 0,
    serviceFee = 0,
    taxAmount = 0,
    discountAmount = 0,
    total = 0,
    promoCode = "",
    baristaNote = "",
    items = [],
  } = request.body || {};
  const normalizedCustomerName = requireNonEmptyString(
    customerName,
    "Customer, meja, dan metode pembayaran wajib diisi.",
    { maxLength: 120 }
  );
  const normalizedTableNumber = requireNonEmptyString(
    tableNumber,
    "Customer, meja, dan metode pembayaran wajib diisi.",
    { maxLength: 30 }
  );
  const normalizedPaymentMethod = requireNonEmptyString(
    paymentMethod,
    "Customer, meja, dan metode pembayaran wajib diisi.",
    { maxLength: 30 }
  );
  const normalizedPhoneNumber = optionalTrimmedString(phoneNumber, { maxLength: 30 });
  const normalizedBaristaNote = optionalTrimmedString(baristaNote);

  if (!Array.isArray(items) || !items.length) {
    throw badRequest("Order harus memiliki minimal satu item.");
  }

  const normalizedItems = normalizeOrderItems(items);
  const menuIds = [...new Set(normalizedItems.map((item) => item.menuId).filter(Boolean))];

  if (menuIds.length !== normalizedItems.length) {
    return response.status(400).json({
      success: false,
      message: "Semua item order harus terhubung ke menu yang valid.",
    });
  }

  const menuPlaceholders = menuIds.map(() => "?").join(", ");
  const menuRows = await getPool().execute(
    `SELECT
        id,
        name,
        price,
        available
     FROM menus
     WHERE id IN (${menuPlaceholders})`,
    menuIds
  );
  const menus = menuRows[0];

  const menuMap = new Map(menus.map((menu) => [Number(menu.id), menu]));
  const invalidItem = normalizedItems.find((item) => !menuMap.has(item.menuId));

  if (invalidItem) {
    return response.status(400).json({
      success: false,
      message: "Ada item menu yang tidak ditemukan di database.",
    });
  }

  const unavailableItem = normalizedItems.find((item) => !Boolean(Number(menuMap.get(item.menuId)?.available)));

  if (unavailableItem) {
    return response.status(400).json({
      success: false,
      message: "Ada menu yang sedang tidak tersedia dan tidak bisa dipesan.",
    });
  }

  const computedItems = normalizedItems.map((item) => {
    const menu = menuMap.get(item.menuId);
    const unitPrice = Number(menu.price || 0);

    return {
      ...item,
      menuName: String(menu.name || "").trim(),
      unitPrice,
      lineTotal: item.qty * unitPrice,
    };
  });

  const computedSubtotal = computedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const computedServiceFee = calculateServiceFee(computedSubtotal);
  const computedTaxAmount = calculateTaxAmount(computedSubtotal);

  let appliedPromoCode = "";
  let computedDiscountAmount = 0;
  let discountRow = null;

  if (promoCode.trim()) {
    const normalizedPromoCode = requireNonEmptyString(promoCode, "Kode promo tidak valid.", { maxLength: 50 }).toUpperCase();
    const discounts = await query(
      `SELECT
          id,
          code,
          discount_type AS discountType,
          discount_value AS discountValue,
          min_purchase AS minPurchase,
          max_discount AS maxDiscount,
          usage_limit AS usageLimit,
          used_count AS usedCount,
          start_date AS startDate,
          end_date AS endDate,
          is_active AS isActive
       FROM discounts
       WHERE code = :code
       LIMIT 1`,
      { code: normalizedPromoCode }
    );

    discountRow = discounts[0] || null;

    if (!discountRow) {
      return response.status(400).json({
        success: false,
        message: "Kode promo tidak ditemukan.",
      });
    }

    const today = getTodayDateLabel();
    const startDate = formatDateOnly(discountRow.startDate);
    const endDate = formatDateOnly(discountRow.endDate);
    const hasStarted = !startDate || startDate <= today;
    const hasNotEnded = !endDate || endDate >= today;
    const isActive = Boolean(Number(discountRow.isActive) || discountRow.isActive);
    const hasQuota = !Number(discountRow.usageLimit || 0)
      || Number(discountRow.usedCount || 0) < Number(discountRow.usageLimit || 0);

    if (!isActive || !hasStarted || !hasNotEnded || !hasQuota) {
      return response.status(400).json({
        success: false,
        message: "Kode promo sudah tidak valid.",
      });
    }

    computedDiscountAmount = calculateDiscountAmount(discountRow, computedSubtotal);

    if (!computedDiscountAmount) {
      return response.status(400).json({
        success: false,
        message: "Kode promo belum memenuhi syarat penggunaan.",
      });
    }

    appliedPromoCode = String(discountRow.code || "").trim().toUpperCase();
  }

  const computedTotal = Math.max(
    0,
    computedSubtotal + computedServiceFee + computedTaxAmount - computedDiscountAmount
  );

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    let createdOrder = null;

    for (let attempt = 0; attempt < ORDER_NUMBER_MAX_RETRIES; attempt += 1) {
      let orderNumber = "";

      try {
        await connection.beginTransaction();
        orderNumber = await generateReadableOrderNumber(connection);

        const [orderResult] = await connection.execute(
          `INSERT INTO orders (
            order_number,
              customer_name,
              phone_number,
              table_number,
              payment_method,
              subtotal,
              service_fee,
              tax_amount,
              discount_amount,
              total,
              promo_code,
              barista_note
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderNumber,
            normalizedCustomerName,
            normalizedPhoneNumber || null,
            normalizedTableNumber,
            normalizedPaymentMethod,
            computedSubtotal,
            computedServiceFee,
            computedTaxAmount,
            computedDiscountAmount,
            computedTotal,
            appliedPromoCode || null,
            normalizedBaristaNote || null,
          ]
        );

        const orderId = orderResult.insertId;

        for (const item of computedItems) {
          await connection.execute(
            `INSERT INTO order_items (
                order_id,
                menu_id,
                menu_name,
                qty,
                size_label,
                note,
                unit_price,
                line_total
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              item.menuId,
              item.menuName,
              item.qty,
              item.sizeLabel,
              item.note,
              item.unitPrice,
              item.lineTotal,
            ]
          );
        }

        if (discountRow && appliedPromoCode) {
          await connection.execute(
            `UPDATE discounts
             SET used_count = used_count + 1
             WHERE id = ?
               AND (
                 usage_limit = 0
                 OR used_count < usage_limit
               )`,
            [discountRow.id]
          );
        }

        await connection.commit();
        createdOrder = {
          id: orderId,
          orderNumber,
        };
        break;
      } catch (error) {
        await connection.rollback();

        if (isDuplicateOrderNumberError(error) && attempt < ORDER_NUMBER_MAX_RETRIES - 1) {
          continue;
        }

        throw error;
      }
    }

    if (!createdOrder) {
      throw new Error("Gagal membuat kode pesanan yang unik.");
    }

    response.status(201).json({
      success: true,
      message: "Order berhasil dibuat.",
      data: {
        id: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        totals: {
          subtotal: computedSubtotal,
          serviceFee: computedServiceFee,
          taxAmount: computedTaxAmount,
          discountAmount: computedDiscountAmount,
          total: computedTotal,
          promoCode: appliedPromoCode,
        },
      },
    });
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
}));

module.exports = router;
