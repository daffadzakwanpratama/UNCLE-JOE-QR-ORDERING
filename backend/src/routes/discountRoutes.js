const express = require("express");
const { getPool, query } = require("../config/db");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  requireNonEmptyString,
  optionalTrimmedString,
  requirePositiveInteger,
  requireNonNegativeNumber,
  normalizeBoolean,
  optionalDateString,
  ensureDateRange,
  badRequest,
} = require("../utils/validation");

const router = express.Router();

const ALLOWED_DISCOUNT_TYPES = new Set(["voucher", "referral"]);
const ALLOWED_DISCOUNT_VALUE_TYPES = new Set(["percent", "fixed"]);

function normalizeDiscountPayload(body = {}) {
  const normalizedCode = requireNonEmptyString(body.code, "Kode dan nama promo wajib diisi.", { maxLength: 50 }).toUpperCase();
  const normalizedName = requireNonEmptyString(body.name, "Kode dan nama promo wajib diisi.", { maxLength: 150 });
  const normalizedType = requireNonEmptyString(body.type || "voucher", "Tipe promo tidak valid.");
  const normalizedDiscountType = requireNonEmptyString(
    body.discountType || "fixed",
    "Tipe nilai diskon tidak valid."
  );
  const normalizedDiscountValue = requireNonNegativeNumber(body.discountValue, "Nilai diskon tidak valid.");
  const normalizedMinPurchase = requireNonNegativeNumber(body.minPurchase, "Minimum pembelian tidak valid.");
  const normalizedMaxDiscount = requireNonNegativeNumber(body.maxDiscount, "Maksimum diskon tidak valid.");
  const normalizedUsageLimit = requireNonNegativeNumber(body.usageLimit, "Batas penggunaan tidak valid.");
  const normalizedUsedCount = requireNonNegativeNumber(body.usedCount, "Total penggunaan tidak valid.");
  const normalizedStartDate = optionalDateString(body.startDate, "Format tanggal mulai tidak valid.");
  const normalizedEndDate = optionalDateString(body.endDate, "Format tanggal akhir tidak valid.");
  const normalizedDescription = optionalTrimmedString(body.description);
  const normalizedIsActive = normalizeBoolean(body.isActive);

  if (!ALLOWED_DISCOUNT_TYPES.has(normalizedType)) {
    throw badRequest("Tipe promo tidak valid.");
  }

  if (!ALLOWED_DISCOUNT_VALUE_TYPES.has(normalizedDiscountType)) {
    throw badRequest("Tipe nilai diskon tidak valid.");
  }

  if (normalizedDiscountType === "percent" && normalizedDiscountValue > 100) {
    throw badRequest("Diskon persen tidak boleh lebih dari 100.");
  }

  ensureDateRange(normalizedStartDate, normalizedEndDate, "Tanggal mulai tidak boleh melebihi tanggal akhir.");

  return {
    code: normalizedCode,
    name: normalizedName,
    type: normalizedType,
    discountType: normalizedDiscountType,
    discountValue: normalizedDiscountValue,
    minPurchase: normalizedMinPurchase,
    maxDiscount: normalizedMaxDiscount,
    usageLimit: normalizedUsageLimit,
    usedCount: normalizedUsedCount,
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    isActive: normalizedIsActive,
    description: normalizedDescription,
  };
}

router.get("/", requireAdminAuth, asyncHandler(async (request, response) => {
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
        description,
        created_at AS createdAt,
        updated_at AS updatedAt
     FROM discounts
     ORDER BY created_at DESC`
  );

  response.json({
    success: true,
    data: discounts,
  });
}));

router.post("/", requireAdminAuth, asyncHandler(async (request, response) => {
  const payload = normalizeDiscountPayload(request.body || {});

  const [result] = await getPool().execute(
    `INSERT INTO discounts (
        code,
        name,
        type,
        discount_type,
        discount_value,
        min_purchase,
        max_discount,
        usage_limit,
        used_count,
        start_date,
        end_date,
        is_active,
        description
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.code,
      payload.name,
      payload.type,
      payload.discountType,
      payload.discountValue,
      payload.minPurchase,
      payload.maxDiscount,
      payload.usageLimit,
      payload.usedCount,
      payload.startDate,
      payload.endDate,
      payload.isActive ? 1 : 0,
      payload.description || null,
    ]
  );

  response.status(201).json({
    success: true,
    data: { id: result.insertId },
  });
}));

router.put("/:id", requireAdminAuth, asyncHandler(async (request, response) => {
  const discountId = requirePositiveInteger(request.params.id, "ID diskon tidak valid.");
  const payload = normalizeDiscountPayload(request.body || {});

  const [result] = await getPool().execute(
    `UPDATE discounts
     SET
        code = ?,
        name = ?,
        type = ?,
        discount_type = ?,
        discount_value = ?,
        min_purchase = ?,
        max_discount = ?,
        usage_limit = ?,
        used_count = ?,
        start_date = ?,
        end_date = ?,
        is_active = ?,
        description = ?
     WHERE id = ?`,
    [
      payload.code,
      payload.name,
      payload.type,
      payload.discountType,
      payload.discountValue,
      payload.minPurchase,
      payload.maxDiscount,
      payload.usageLimit,
      payload.usedCount,
      payload.startDate,
      payload.endDate,
      payload.isActive ? 1 : 0,
      payload.description || null,
      discountId,
    ]
  );

  if (!result.affectedRows) {
    return response.status(404).json({
      success: false,
      message: "Diskon tidak ditemukan.",
    });
  }

  response.json({
    success: true,
    data: { id: discountId },
  });
}));

router.delete("/:id", requireAdminAuth, asyncHandler(async (request, response) => {
  const discountId = requirePositiveInteger(request.params.id, "ID diskon tidak valid.");

  const [result] = await getPool().execute(
    `DELETE FROM discounts WHERE id = ?`,
    [discountId]
  );

  if (!result.affectedRows) {
    return response.status(404).json({
      success: false,
      message: "Diskon tidak ditemukan.",
    });
  }

  response.json({
    success: true,
    message: "Diskon berhasil dihapus.",
  });
}));

module.exports = router;
