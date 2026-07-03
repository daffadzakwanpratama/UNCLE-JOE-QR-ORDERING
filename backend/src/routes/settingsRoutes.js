const express = require("express");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const settingsController = require("../controllers/settingsController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", requireAdminAuth, asyncHandler(settingsController.getSettings));
router.put("/", requireAdminAuth, asyncHandler(settingsController.updateSettings));

module.exports = router;
