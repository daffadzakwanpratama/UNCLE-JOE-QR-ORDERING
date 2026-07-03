const express = require("express");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const { adminLoginRateLimit } = require("../middlewares/adminLoginRateLimit");
const authController = require("../controllers/authController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post("/admin/login", adminLoginRateLimit, asyncHandler(authController.login));
router.get("/admin/session", requireAdminAuth, asyncHandler(authController.getSession));
router.post("/admin/logout", asyncHandler(authController.logout));

router.get("/admin/users", requireAdminAuth, asyncHandler(authController.getUsers));
router.post("/admin/users", requireAdminAuth, asyncHandler(authController.createUser));
router.put("/admin/users/:id/password", requireAdminAuth, asyncHandler(authController.updateUserPassword));
router.put("/admin/users/:id/role", requireAdminAuth, asyncHandler(authController.updateUserRole));
router.delete("/admin/users/:id", requireAdminAuth, asyncHandler(authController.deleteUser));

module.exports = router;
