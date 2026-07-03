const express = require("express");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const bannerController = require("../controllers/bannerController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", requireAdminAuth, asyncHandler(bannerController.getBanners));
router.post("/", requireAdminAuth, asyncHandler(bannerController.createBanner));
router.put("/:id", requireAdminAuth, asyncHandler(bannerController.updateBanner));
router.delete("/:id", requireAdminAuth, asyncHandler(bannerController.deleteBanner));

module.exports = router;
