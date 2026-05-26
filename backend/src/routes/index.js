const express = require("express");
const publicRoutes = require("./publicRoutes");
const authRoutes = require("./authRoutes");
const categoryRoutes = require("./categoryRoutes");
const menuRoutes = require("./menuRoutes");
const orderRoutes = require("./orderRoutes");
const bannerRoutes = require("./bannerRoutes");
const discountRoutes = require("./discountRoutes");
const reportRoutes = require("./reportRoutes");

const router = express.Router();

router.use("/", publicRoutes);
router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/menus", menuRoutes);
router.use("/orders", orderRoutes);
router.use("/banners/manage", bannerRoutes);
router.use("/discounts/manage", discountRoutes);
router.use("/reports", reportRoutes);

module.exports = router;
