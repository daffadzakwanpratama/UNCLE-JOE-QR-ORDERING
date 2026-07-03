const express = require("express");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const reportController = require("../controllers/reportController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/summary", requireAdminAuth, asyncHandler(reportController.getSummary));
router.get("/transactions", requireAdminAuth, asyncHandler(reportController.getTransactions));

module.exports = router;
