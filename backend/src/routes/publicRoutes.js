const express = require("express");
const { query, testConnection } = require("../config/db");
const { formatDateOnly } = require("../utils/date");
const { asyncHandler } = require("../utils/asyncHandler");

const { createRateLimiter } = require("../middlewares/publicRateLimit");

const discountValidateRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 menit
  maxRequests: 15,
  message: "Terlalu banyak mencoba kode promo. Silakan coba lagi setelah satu menit.",
  keyPrefix: "promo_validate",
});

const router = express.Router();



router.get("/", (request, response) => {
  response.json({
    success: true,
    message: "QR Ordering API is ready.",
  });
});

router.get("/live", (request, response) => {
  response.json({
    success: true,
    service: "qr-ordering-api",
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});

router.get("/ready", asyncHandler(async (request, response) => {
  await testConnection();

  response.json({
    success: true,
    service: "qr-ordering-api",
    status: "ready",
    database: "connected",
    timestamp: new Date().toISOString(),
  });
}));

router.get("/health", asyncHandler(async (request, response) => {
  let database = "disconnected";
  let status = "degraded";

  try {
    await testConnection();
    database = "connected";
    status = "healthy";
  } catch (error) {
    database = "disconnected";
    status = "degraded";
  }

  response.json({
    success: true,
    service: "qr-ordering-api",
    status,
    database,
    timestamp: new Date().toISOString(),
  });
}));

router.get("/banners", asyncHandler(async (request, response) => {
  const banners = await query(
    `SELECT
        id,
        title,
        subtitle,
        image_url AS imageUrl,
        link_url AS linkUrl,
        start_date AS startDate,
        end_date AS endDate,
        sort_order AS sortOrder,
        is_active AS isActive
     FROM banners
     WHERE is_active
       AND (start_date IS NULL OR start_date <= CURRENT_DATE)
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)
     ORDER BY sort_order ASC, id DESC`
  );

  response.json({
    success: true,
    data: banners,
  });
}));

router.get("/discounts", asyncHandler(async (request, response) => {
  const discounts = await query(
    `SELECT
        id,
        code,
        name,
        type,
        discount_type AS discountType,
        discount_value AS discountValue,
        min_purchase AS minPurchase,
        max_discount AS maxDiscount,
        usage_limit AS usageLimit,
        used_count AS usedCount,
        start_date AS startDate,
        end_date AS endDate,
        is_active AS isActive,
        description
     FROM discounts
     WHERE is_active
       AND (start_date IS NULL OR start_date <= CURRENT_DATE)
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)
       AND (usage_limit = 0 OR used_count < usage_limit)
     ORDER BY created_at DESC`
  );

  response.json({
    success: true,
    data: discounts,
  });
}));

router.get("/discounts/validate/:code", discountValidateRateLimit, asyncHandler(async (request, response) => {
  const code = String(request.params.code || "").trim().toUpperCase();

  if (!code) {
    return response.status(400).json({
      success: false,
      message: "Kode promo wajib diisi.",
    });
  }

  const discounts = await query(
    `SELECT
        id,
        code,
        name,
        type,
        discount_type AS discountType,
        discount_value AS discountValue,
        min_purchase AS minPurchase,
        max_discount AS maxDiscount,
        usage_limit AS usageLimit,
        used_count AS usedCount,
        start_date AS startDate,
        end_date AS endDate,
        is_active AS isActive,
        description
     FROM discounts
     WHERE code = :code
     LIMIT 1`,
    { code }
  );

  const discount = discounts[0];

  if (!discount) {
    return response.status(404).json({
      success: false,
      message: "Kode promo tidak ditemukan.",
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const startDate = formatDateOnly(discount.startDate);
  const endDate = formatDateOnly(discount.endDate);
  const isExpired = endDate && endDate < today;
  const hasStarted = !startDate || startDate <= today;
  const isActive = Boolean(Number(discount.isActive) || discount.isActive);
  const hasQuota = !Number(discount.usageLimit || 0) || Number(discount.usedCount || 0) < Number(discount.usageLimit || 0);

  response.json({
    success: true,
    data: {
      ...discount,
      isValid: Boolean(isActive && !isExpired && hasStarted && hasQuota),
    },
  });
}));

router.get("/config/midtrans", (request, response) => {
  response.json({
    success: true,
    data: {
      clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    },
  });
});

router.get("/settings", asyncHandler(async (request, response) => {
  const settingsRows = await query(
    `SELECT key, value FROM settings`
  );
  
  const settings = {};
  settingsRows.forEach(row => {
    settings[row.key] = row.value;
  });

  response.json({
    success: true,
    data: settings,
  });
}));

module.exports = router;
