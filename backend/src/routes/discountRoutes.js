const express = require("express");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const discountController = require("../controllers/discountController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", requireAdminAuth, asyncHandler(discountController.getDiscounts));
router.post("/", requireAdminAuth, asyncHandler(discountController.createDiscount));
router.put("/:id", requireAdminAuth, asyncHandler(discountController.updateDiscount));
router.delete("/:id", requireAdminAuth, asyncHandler(discountController.deleteDiscount));

module.exports = router;
