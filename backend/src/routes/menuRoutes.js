const express = require("express");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const menuController = require("../controllers/menuController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(menuController.getMenus));
router.post("/", requireAdminAuth, asyncHandler(menuController.createMenu));
router.put("/:id", requireAdminAuth, asyncHandler(menuController.updateMenu));
router.delete("/:id", requireAdminAuth, asyncHandler(menuController.deleteMenu));

module.exports = router;
