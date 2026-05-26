const express = require("express");
const { query } = require("../config/db");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const { asyncHandler } = require("../utils/asyncHandler");
const { optionalMonthString } = require("../utils/validation");

const router = require("express").Router();

router.get("/summary", requireAdminAuth, asyncHandler(async (request, response) => {
  const month = optionalMonthString(request.query?.month, "Format filter bulan tidak valid.");
  const hasMonthFilter = Boolean(month);

  const totals = await query(
    `SELECT
        COALESCE(SUM(total), 0) AS totalRevenue,
        COUNT(*) AS transactionCount,
        COALESCE(MAX(total), 0) AS highestRevenue
     FROM orders
     ${hasMonthFilter ? "WHERE DATE_FORMAT(created_at, '%Y-%m') = :month" : ""}`,
    hasMonthFilter ? { month } : {}
  );

  const row = totals[0] || {};
  const totalRevenue = Number(row.totalRevenue || 0);
  const transactionCount = Number(row.transactionCount || 0);

  response.json({
    success: true,
    data: {
      month: hasMonthFilter ? month : null,
      totalRevenue,
      transactionCount,
      highestRevenue: Number(row.highestRevenue || 0),
      averageRevenue: transactionCount ? Math.round(totalRevenue / transactionCount) : 0,
    },
  });
}));

router.get("/transactions", requireAdminAuth, asyncHandler(async (request, response) => {
  const month = optionalMonthString(request.query?.month, "Format filter bulan tidak valid.");
  const hasMonthFilter = Boolean(month);

  const transactions = await query(
    `SELECT
        o.id,
        o.order_number AS code,
        DATE(o.created_at) AS date,
        DATE_FORMAT(o.created_at, '%H:%i') AS time,
        o.customer_name AS customer,
        o.table_number AS tableName,
        o.payment_method AS payment,
        o.status,
        o.barista_note AS note,
        GROUP_CONCAT(
          CASE
            WHEN oi.note IS NOT NULL AND TRIM(oi.note) <> ""
            THEN CONCAT(oi.menu_name, ": ", oi.note)
            ELSE NULL
          END
          ORDER BY oi.id
          SEPARATOR " | "
        ) AS itemNotes,
        o.total
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      ${hasMonthFilter ? "WHERE DATE_FORMAT(o.created_at, '%Y-%m') = :month" : ""}
      GROUP BY
        o.id,
        o.order_number,
        DATE(o.created_at),
        DATE_FORMAT(o.created_at, '%H:%i'),
        o.customer_name,
        o.table_number,
        o.payment_method,
        o.status,
        o.barista_note,
        o.total
      ORDER BY o.created_at DESC`,
    hasMonthFilter ? { month } : {}
  );

  response.json({
    success: true,
    data: transactions,
  });
}));

module.exports = router;
