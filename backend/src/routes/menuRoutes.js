const express = require("express");
const { getPool, query } = require("../config/db");
const { saveImageValue, deleteManagedFile } = require("../utils/uploadStorage");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  requireNonEmptyString,
  optionalTrimmedString,
  requirePositiveInteger,
  requireNonNegativeNumber,
  normalizeBoolean,
} = require("../utils/validation");

const router = express.Router();

router.get("/", asyncHandler(async (request, response) => {
  const menus = await query(
    `SELECT
        m.id,
        m.name,
        m.description,
        m.price,
        m.available,
        m.image_url AS imageUrl,
        m.rating,
        m.reviews_count AS reviewsCount,
        m.popularity_score AS popularityScore,
        m.is_popular AS isPopular,
        c.id AS categoryId,
        c.name AS categoryName
     FROM menus m
     LEFT JOIN categories c ON c.id = m.category_id
     ORDER BY m.name ASC`
  );

  response.json({
    success: true,
    data: menus,
  });
}));

router.post("/", requireAdminAuth, asyncHandler(async (request, response) => {
  const {
    categoryId,
    name = "",
    description = "",
    price = 0,
    imageUrl = "",
    available = true,
    isPopular = false,
  } = request.body || {};
  const normalizedCategoryId = requirePositiveInteger(categoryId, "Kategori wajib dipilih.");
  const normalizedName = requireNonEmptyString(name, "Nama menu wajib diisi.", { maxLength: 120 });
  const normalizedDescription = optionalTrimmedString(description);
  const normalizedPrice = requireNonNegativeNumber(price, "Harga menu tidak valid.");
  const normalizedAvailable = normalizeBoolean(available);
  const normalizedIsPopular = normalizeBoolean(isPopular);

  const storedImageUrl = await saveImageValue(imageUrl, "menus");

  const [result] = await getPool().execute(
    `INSERT INTO menus (
        category_id,
        name,
        description,
        price,
        image_url,
        available,
        is_popular
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      normalizedCategoryId,
      normalizedName,
      normalizedDescription || null,
      normalizedPrice,
      storedImageUrl,
      normalizedAvailable ? 1 : 0,
      normalizedIsPopular ? 1 : 0,
    ]
  );

  response.status(201).json({
    success: true,
    data: {
      id: result.insertId,
    },
  });
}));

router.put("/:id", requireAdminAuth, asyncHandler(async (request, response) => {
  const menuId = requirePositiveInteger(request.params.id, "ID menu tidak valid.");
  const {
    categoryId,
    name = "",
    description = "",
    price = 0,
    imageUrl = "",
    available = true,
    isPopular = false,
  } = request.body || {};
  const normalizedCategoryId = requirePositiveInteger(categoryId, "Kategori wajib dipilih.");
  const normalizedName = requireNonEmptyString(name, "Nama menu wajib diisi.", { maxLength: 120 });
  const normalizedDescription = optionalTrimmedString(description);
  const normalizedPrice = requireNonNegativeNumber(price, "Harga menu tidak valid.");
  const normalizedAvailable = normalizeBoolean(available);
  const normalizedIsPopular = normalizeBoolean(isPopular);

  const existingMenus = await query(
    `SELECT id, image_url AS imageUrl
     FROM menus
     WHERE id = :menuId
     LIMIT 1`,
    { menuId }
  );

  const existingMenu = existingMenus[0];

  if (!existingMenu) {
    return response.status(404).json({
      success: false,
      message: "Menu tidak ditemukan.",
    });
  }

  const storedImageUrl = await saveImageValue(
    imageUrl,
    "menus",
    existingMenu.imageUrl || ""
  );

  await getPool().execute(
    `UPDATE menus
     SET
        category_id = ?,
        name = ?,
        description = ?,
        price = ?,
        image_url = ?,
        available = ?,
        is_popular = ?
    WHERE id = ?`,
    [
      normalizedCategoryId,
      normalizedName,
      normalizedDescription || null,
      normalizedPrice,
      storedImageUrl,
      normalizedAvailable ? 1 : 0,
      normalizedIsPopular ? 1 : 0,
      menuId,
    ]
  );

  response.json({
    success: true,
    data: {
      id: menuId,
    },
  });
}));

router.delete("/:id", requireAdminAuth, asyncHandler(async (request, response) => {
  const menuId = requirePositiveInteger(request.params.id, "ID menu tidak valid.");

  const existingMenus = await query(
    `SELECT image_url AS imageUrl
     FROM menus
     WHERE id = :menuId
     LIMIT 1`,
    { menuId }
  );

  const existingMenu = existingMenus[0];

  if (!existingMenu) {
    return response.status(404).json({
      success: false,
      message: "Menu tidak ditemukan.",
    });
  }

  await getPool().execute(
    `DELETE FROM menus WHERE id = ?`,
    [menuId]
  );

  await deleteManagedFile(existingMenu.imageUrl || "");

  response.json({
    success: true,
    message: "Menu berhasil dihapus.",
  });
}));

module.exports = router;
