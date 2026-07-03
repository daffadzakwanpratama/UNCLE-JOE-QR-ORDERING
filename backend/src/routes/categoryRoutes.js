const express = require("express");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const categoryController = require("../controllers/categoryController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", requireAdminAuth, asyncHandler(categoryController.getCategories));
router.post("/", requireAdminAuth, asyncHandler(categoryController.createCategory));
router.put("/:id", requireAdminAuth, asyncHandler(categoryController.updateCategory));
router.delete("/:id", requireAdminAuth, asyncHandler(categoryController.deleteCategory));

module.exports = router;
