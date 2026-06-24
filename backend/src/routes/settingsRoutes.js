const express = require("express");
const { getPool, query } = require("../config/db");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", requireAdminAuth, asyncHandler(async (request, response) => {
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

router.put("/", requireAdminAuth, asyncHandler(async (request, response) => {
  const { tax_percent, service_fee } = request.body || {};
  
  if (tax_percent === undefined || service_fee === undefined) {
    return response.status(400).json({
      success: false,
      message: "Data pengaturan tidak lengkap.",
    });
  }

  const taxNum = Number(tax_percent);
  const serviceFeeNum = Number(service_fee);

  if (isNaN(taxNum) || taxNum < 0 || taxNum > 100) {
    return response.status(400).json({
      success: false,
      message: "Pajak harus bernilai antara 0% dan 100%.",
    });
  }

  if (isNaN(serviceFeeNum) || serviceFeeNum < 0) {
    return response.status(400).json({
      success: false,
      message: "Biaya layanan harus bernilai positif.",
    });
  }

  const pool = getPool();
  await pool.execute(
    `UPDATE settings SET value = ? WHERE key = 'tax_percent'`,
    [String(taxNum)]
  );
  await pool.execute(
    `UPDATE settings SET value = ? WHERE key = 'service_fee'`,
    [String(serviceFeeNum)]
  );

  response.json({
    success: true,
    message: "Pengaturan berhasil diperbarui.",
  });
}));

module.exports = router;
