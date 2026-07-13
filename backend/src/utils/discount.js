const { query } = require("../config/db");
const { formatDateOnly, getTodayDateLabel } = require("./date");

async function findDiscountByCode(code) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) return null;

  const discounts = await query(
    `SELECT
        id,
        code,
        name,
        type,
        discount_type AS "discountType",
        discount_value AS "discountValue",
        min_purchase AS "minPurchase",
        max_discount AS "maxDiscount",
        usage_limit AS "usageLimit",
        used_count AS "usedCount",
        start_date AS "startDate",
        end_date AS "endDate",
        is_active AS "isActive",
        description
     FROM discounts
     WHERE code = :code
     LIMIT 1`,
    { code: normalizedCode }
  );

  return discounts[0] || null;
}

function checkDiscountValidity(discount, subtotal = 0) {
  if (!discount) {
    return { isValid: false, message: "Kode promo tidak ditemukan." };
  }

  const today = getTodayDateLabel();
  const startDate = formatDateOnly(discount.startDate);
  const endDate = formatDateOnly(discount.endDate);
  
  const isActive = Boolean(Number(discount.isActive) || discount.isActive);
  const hasStarted = !startDate || startDate <= today;
  const hasNotEnded = !endDate || endDate >= today;
  const hasQuota = !Number(discount.usageLimit || 0)
    || Number(discount.usedCount || 0) < Number(discount.usageLimit || 0);

  if (!isActive || !hasStarted || !hasNotEnded || !hasQuota) {
    return { isValid: false, message: "Kode promo sudah tidak valid atau kuota habis." };
  }

  if (subtotal > 0 && subtotal < Number(discount.minPurchase || 0)) {
    return { isValid: false, message: "Kode promo belum memenuhi syarat penggunaan (minimum pembelian)." };
  }

  return { isValid: true, discount };
}

module.exports = {
  findDiscountByCode,
  checkDiscountValidity,
};
