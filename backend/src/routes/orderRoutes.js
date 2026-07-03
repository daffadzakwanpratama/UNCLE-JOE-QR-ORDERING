const express = require("express");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const { createRateLimiter } = require("../middlewares/publicRateLimit");
const orderController = require("../controllers/orderController");
const { asyncHandler } = require("../utils/asyncHandler");

const orderRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 menit
  maxRequests: 5,
  message: "Terlalu banyak pesanan dibuat dari IP ini. Silakan coba lagi beberapa menit lagi atau hubungi kasir/barista.",
  keyPrefix: "order",
});

const router = express.Router();

router.get("/", requireAdminAuth, asyncHandler(orderController.getOrders));
router.get("/:orderNumber", asyncHandler(orderController.getOrderDetails));
router.patch("/:orderNumber/status", requireAdminAuth, asyncHandler(orderController.updateOrderStatus));
router.post("/clear", requireAdminAuth, asyncHandler(orderController.clearOrders));
router.patch("/:orderNumber/payment-method", asyncHandler(orderController.changePaymentMethod));
router.patch("/:orderNumber/payment-status", requireAdminAuth, asyncHandler(orderController.updatePaymentStatus));
router.post("/", orderRateLimit, asyncHandler(orderController.createOrder));
router.post("/payment/notification", asyncHandler(orderController.handleMidtransCallback));

module.exports = router;
