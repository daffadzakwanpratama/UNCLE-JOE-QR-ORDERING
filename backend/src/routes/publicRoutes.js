const express = require("express");
const { createRateLimiter } = require("../middlewares/publicRateLimit");
const publicController = require("../controllers/publicController");
const { asyncHandler } = require("../utils/asyncHandler");

const discountValidateRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 menit
  maxRequests: 15,
  message: "Terlalu banyak mencoba kode promo. Silakan coba lagi setelah satu menit.",
  keyPrefix: "promo_validate",
});

const router = express.Router();

router.get("/", publicController.index);
router.get("/live", publicController.live);
router.get("/ready", asyncHandler(publicController.ready));
router.get("/health", asyncHandler(publicController.health));
router.get("/banners", asyncHandler(publicController.getBanners));
router.get("/discounts", asyncHandler(publicController.getDiscounts));
router.get("/discounts/validate/:code", discountValidateRateLimit, asyncHandler(publicController.validateDiscount));
router.get("/config/midtrans", publicController.getMidtransConfig);
router.get("/settings", asyncHandler(publicController.getSettings));

module.exports = router;
