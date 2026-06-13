const express = require("express");
const crypto = require("crypto");
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
    `SELECT order_number AS "orderNumber"
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
  return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062 || error?.code === "23505";
}

router.get("/", requireAdminAuth, asyncHandler(async (request, response) => {
  const orders = await query(
    `SELECT
        o.id,
        o.order_number AS "orderNumber",
        o.customer_name AS "customerName",
        o.phone_number AS "phoneNumber",
        o.table_number AS "tableNumber",
        o.payment_method AS "paymentMethod",
        o.payment_status AS "paymentStatus",
        o.payment_token AS "paymentToken",
        o.status,
        o.subtotal,
        o.service_fee AS "serviceFee",
        o.tax_amount AS "taxAmount",
        o.discount_amount AS "discountAmount",
        o.total,
        o.barista_note AS "baristaNote",
        string_agg(
          CONCAT(
            oi.qty,
            'x ',
            oi.menu_name,
            CASE
              WHEN oi.size_label IS NOT NULL AND TRIM(oi.size_label) <> ''
              THEN CONCAT(' (', oi.size_label, ')')
              ELSE ''
            END
          ),
          ' | ' ORDER BY oi.id
        ) AS "itemSummary",
        string_agg(
          CASE
            WHEN oi.note IS NOT NULL AND TRIM(oi.note) <> ''
            THEN CONCAT(oi.menu_name, ': ', oi.note)
            ELSE NULL
          END,
          ' | ' ORDER BY oi.id
        ) AS "itemNotes",
        o.created_at AS "createdAt"
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY
        o.id,
        o.order_number,
        o.customer_name,
        o.phone_number,
        o.table_number,
        o.payment_method,
        o.payment_status,
        o.payment_token,
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
        o.order_number AS "orderNumber",
        o.customer_name AS "customerName",
        o.phone_number AS "phoneNumber",
        o.table_number AS "tableNumber",
        o.payment_method AS "paymentMethod",
        o.payment_status AS "paymentStatus",
        o.payment_token AS "paymentToken",
        o.status,
        o.subtotal,
        o.service_fee AS "serviceFee",
        o.tax_amount AS "taxAmount",
        o.discount_amount AS "discountAmount",
        o.total,
        o.promo_code AS "promoCode",
        o.barista_note AS "baristaNote",
        o.created_at AS "createdAt"
     FROM orders o
     WHERE o.order_number = :orderNumber
     LIMIT 1`,
    { orderNumber }
  );

  let order = orders[0];

  if (!order) {
    return response.status(404).json({
      success: false,
      message: "Order tidak ditemukan.",
    });
  }

  // FALLBACK SYNC: Jika pembayaran QRIS masih pending di DB kita, cek status langsung ke Midtrans API
  if (String(order.paymentMethod).toLowerCase() === "qris" && String(order.paymentStatus).toLowerCase() === "pending") {
    try {
      const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
      const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";
      const statusUrl = MIDTRANS_IS_PRODUCTION
        ? `https://api.midtrans.com/v2/${order.orderNumber}/status`
        : `https://api.sandbox.midtrans.com/v2/${order.orderNumber}/status`;

      const midtransRes = await fetch(statusUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")}`,
        },
      });

      if (midtransRes.ok) {
        const statusData = await midtransRes.json();
        const transactionStatus = statusData.transaction_status;
        const fraudStatus = statusData.fraud_status;

        let newPaymentStatus = "pending";

        if (transactionStatus === "capture") {
          if (fraudStatus === "accept") {
            newPaymentStatus = "paid";
          }
        } else if (transactionStatus === "settlement") {
          newPaymentStatus = "paid";
        } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
          newPaymentStatus = "failed";
        }

        if (newPaymentStatus !== order.paymentStatus) {
          // Update database
          await query(
            `UPDATE orders
             SET payment_status = :newPaymentStatus
             WHERE id = :id`,
            {
              newPaymentStatus,
              id: order.id,
            }
          );
          // Perbarui objek lokal order untuk respons ini
          order.paymentStatus = newPaymentStatus;
          console.log(`[Midtrans Fallback Sync] Status order ${order.orderNumber} berhasil disinkronkan ke '${newPaymentStatus}'`);
        }
      }
    } catch (fallbackError) {
      console.error("[Midtrans Fallback Sync] Gagal menyinkronkan status order:", fallbackError.message || fallbackError);
    }
  }

  const items = await query(
    `SELECT
        id,
        menu_id AS "menuId",
        menu_name AS "menuName",
        qty,
        size_label AS "sizeLabel",
        note,
        unit_price AS "unitPrice",
        line_total AS "lineTotal"
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

router.patch("/:orderNumber/payment-method", asyncHandler(async (request, response) => {
  const orderNumber = requireNonEmptyString(request.params.orderNumber, "Order number wajib diisi.", { maxLength: 30 });
  const { paymentMethod } = request.body || {};
  const normalizedPaymentMethod = requireNonEmptyString(paymentMethod, "Metode pembayaran wajib diisi.", { maxLength: 30 });

  if (normalizedPaymentMethod.toLowerCase() !== "cash") {
    return response.status(400).json({
      success: false,
      message: "Hanya perpindahan ke metode pembayaran tunai yang didukung saat ini.",
    });
  }

  const orders = await query(
    `SELECT id, order_number, payment_status, payment_method FROM orders WHERE order_number = :orderNumber LIMIT 1`,
    { orderNumber }
  );
  const order = orders[0];

  if (!order) {
    return response.status(404).json({
      success: false,
      message: "Order tidak ditemukan.",
    });
  }

  if (String(order.paymentStatus).toLowerCase() === "paid") {
    return response.status(400).json({
      success: false,
      message: "Pesanan sudah dibayar, metode pembayaran tidak bisa diubah.",
    });
  }

  await query(
    `UPDATE orders SET payment_method = :paymentMethod WHERE id = :id`,
    {
      paymentMethod: normalizedPaymentMethod,
      id: order.id,
    }
  );

  response.json({
    success: true,
    message: "Metode pembayaran berhasil diubah menjadi tunai.",
    data: {
      orderNumber,
      paymentMethod: normalizedPaymentMethod,
    },
  });
}));

router.patch("/:orderNumber/payment-status", requireAdminAuth, asyncHandler(async (request, response) => {
  const orderNumber = requireNonEmptyString(request.params.orderNumber, "Order number wajib diisi.", { maxLength: 30 });
  const { paymentStatus } = request.body || {};
  const normalizedPaymentStatus = requireNonEmptyString(paymentStatus, "Status pembayaran wajib diisi.", { maxLength: 30 });

  if (!["paid", "pending", "failed"].includes(normalizedPaymentStatus.toLowerCase())) {
    return response.status(400).json({
      success: false,
      message: "Status pembayaran tidak valid.",
    });
  }

  const orders = await query(
    `SELECT id, order_number FROM orders WHERE order_number = :orderNumber LIMIT 1`,
    { orderNumber }
  );
  const order = orders[0];

  if (!order) {
    return response.status(404).json({
      success: false,
      message: "Order tidak ditemukan.",
    });
  }

  await query(
    `UPDATE orders SET payment_status = :paymentStatus WHERE id = :id`,
    {
      paymentStatus: normalizedPaymentStatus,
      id: order.id,
    }
  );

  response.json({
    success: true,
    message: "Status pembayaran berhasil diperbarui.",
    data: {
      orderNumber,
      paymentStatus: normalizedPaymentStatus,
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
        price_type AS "priceType",
        price,
        price_hot AS "priceHot",
        price_ice AS "priceIce",
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
    let unitPrice = 0;
    const priceType = menu.priceType || 'single';

    if (priceType === 'hot_ice') {
      const selectedSize = String(item.sizeLabel || '').trim().toLowerCase();
      if (selectedSize === 'hot') {
        unitPrice = Number(menu.priceHot || 0);
      } else if (selectedSize === 'ice') {
        unitPrice = Number(menu.priceIce || 0);
      } else {
        throw badRequest(`Menu '${menu.name}' memerlukan pilihan varian Hot atau Ice.`);
      }
    } else {
      unitPrice = Number(menu.price || 0);
    }

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

    let paymentToken = null;
    let paymentUrl = null;

    // Call Midtrans Snap if payment method is cashless
    if (normalizedPaymentMethod === "qris") {
      try {
        const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
        const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";
        const MIDTRANS_SNAP_URL = MIDTRANS_IS_PRODUCTION
          ? "https://app.midtrans.com/snap/v1/transactions"
          : "https://app.sandbox.midtrans.com/snap/v1/transactions";

        const midtransPayload = {
          transaction_details: {
            order_id: createdOrder.orderNumber,
            gross_amount: computedTotal,
          },
          credit_card: {
            secure: true,
          },
          customer_details: {
            first_name: normalizedCustomerName,
            phone: normalizedPhoneNumber || "",
          },
          item_details: computedItems.map((item) => ({
            id: String(item.menuId),
            price: item.unitPrice,
            quantity: item.qty,
            name: item.menuName.slice(0, 50),
          })).concat(
            computedServiceFee > 0 ? [{
              id: "SERVICE_FEE",
              price: computedServiceFee,
              quantity: 1,
              name: "Biaya Layanan",
            }] : []
          ).concat(
            computedTaxAmount > 0 ? [{
              id: "TAX",
              price: computedTaxAmount,
              quantity: 1,
              name: "Pajak (10%)",
            }] : []
          ).concat(
            computedDiscountAmount > 0 ? [{
              id: "PROMO_DISCOUNT",
              price: -computedDiscountAmount,
              quantity: 1,
              name: `Promo (${appliedPromoCode})`,
            }] : []
          ),
        };

        const midtransRes = await fetch(MIDTRANS_SNAP_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")}`,
          },
          body: JSON.stringify(midtransPayload),
        });

        const midtransData = await midtransRes.json();

        if (midtransRes.ok && midtransData.token) {
          paymentToken = midtransData.token;
          paymentUrl = midtransData.redirect_url;

          // Update payment_token in the database
          await query(
            `UPDATE orders
             SET payment_token = :paymentToken
             WHERE id = :id`,
            {
              paymentToken,
              id: createdOrder.id,
            }
          );
        } else {
          console.error("Midtrans API Error Details:", JSON.stringify(midtransData));
        }
      } catch (midError) {
        console.error("Gagal menghubungi Midtrans:", midError.message || midError);
      }
    }

    response.status(201).json({
      success: true,
      message: "Order berhasil dibuat.",
      data: {
        id: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        paymentToken,
        paymentUrl,
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

// Endpoint Webhook untuk Midtrans Callback
router.post("/payment/notification", asyncHandler(async (request, response) => {
  const notification = request.body || {};
  
  const orderId = notification.order_id;
  const statusCode = notification.status_code;
  const grossAmount = notification.gross_amount;
  const signatureKey = notification.signature_key;
  const transactionStatus = notification.transaction_status;
  const fraudStatus = notification.fraud_status;

  if (!orderId || !statusCode || !grossAmount || !signatureKey) {
    return response.status(400).json({
      success: false,
      message: "Payload notifikasi tidak valid.",
    });
  }

  // 1. Verifikasi tanda tangan keamanan dari Midtrans
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const stringToHash = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const computedSignature = crypto.createHash("sha512").update(stringToHash).digest("hex");

  if (computedSignature !== signatureKey) {
    console.error(`[Midtrans Webhook] Tanda tangan tidak valid untuk order ${orderId}`);
    return response.status(403).json({
      success: false,
      message: "Tanda tangan keamanan tidak valid.",
    });
  }

  console.log(`[Midtrans Webhook] Notifikasi diterima untuk order ${orderId}, status: ${transactionStatus}`);

  // 2. Petakan transaction_status ke payment_status aplikasi kita
  let paymentStatus = "pending";
  
  if (transactionStatus === "capture") {
    if (fraudStatus === "challenge") {
      paymentStatus = "pending";
    } else if (fraudStatus === "accept") {
      paymentStatus = "paid";
    }
  } else if (transactionStatus === "settlement") {
    paymentStatus = "paid";
  } else if (["cancel", "deny", "expire"].includes(transactionStatus)) {
    paymentStatus = "failed";
  } else if (transactionStatus === "pending") {
    paymentStatus = "pending";
  }

  // 3. Update status pembayaran di database
  await query(
    `UPDATE orders
     SET payment_status = :paymentStatus
     WHERE order_number = :orderId`,
    {
      paymentStatus,
      orderId,
    }
  );

  response.json({
    success: true,
    message: "Notifikasi berhasil diproses.",
    data: {
      orderId,
      paymentStatus,
    }
  });
}));

module.exports = router;
