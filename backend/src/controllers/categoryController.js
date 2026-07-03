const { getPool, query } = require("../config/db");
const {
  requireNonEmptyString,
  optionalTrimmedString,
  requirePositiveInteger,
} = require("../utils/validation");

async function getCategories(request, response) {
  const categories = await query(
    `SELECT id, name, description, created_at AS createdAt, updated_at AS updatedAt
     FROM categories
     ORDER BY name ASC`
  );

  response.json({
    success: true,
    data: categories,
  });
}

async function createCategory(request, response) {
  const { name = "", description = "" } = request.body || {};
  const normalizedName = requireNonEmptyString(name, "Nama kategori wajib diisi.", { maxLength: 100 });
  const normalizedDescription = optionalTrimmedString(description);

  const [result] = await getPool().execute(
    `INSERT INTO categories (name, description) VALUES (?, ?)`,
    [normalizedName, normalizedDescription || null]
  );

  response.status(201).json({
    success: true,
    data: {
      id: result.insertId,
      name: normalizedName,
      description: normalizedDescription,
    },
  });
}

async function updateCategory(request, response) {
  const categoryId = requirePositiveInteger(request.params.id, "ID kategori tidak valid.");
  const { name = "", description = "" } = request.body || {};
  const normalizedName = requireNonEmptyString(name, "Nama kategori wajib diisi.", { maxLength: 100 });
  const normalizedDescription = optionalTrimmedString(description);

  const [result] = await getPool().execute(
    `UPDATE categories
     SET name = ?, description = ?
     WHERE id = ?`,
    [normalizedName, normalizedDescription || null, categoryId]
  );

  if (!result.affectedRows) {
    return response.status(404).json({
      success: false,
      message: "Kategori tidak ditemukan.",
    });
  }

  response.json({
    success: true,
    data: {
      id: categoryId,
      name: normalizedName,
      description: normalizedDescription,
    },
  });
}

async function deleteCategory(request, response) {
  const categoryId = requirePositiveInteger(request.params.id, "ID kategori tidak valid.");

  const linkedMenus = await query(
    `SELECT COUNT(*) AS total
     FROM menus
     WHERE category_id = :categoryId`,
    { categoryId }
  );

  if (Number(linkedMenus[0]?.total || 0) > 0) {
    return response.status(409).json({
      success: false,
      message: "Kategori ini masih dipakai oleh menu.",
    });
  }

  const [result] = await getPool().execute(
    `DELETE FROM categories WHERE id = ?`,
    [categoryId]
  );

  if (!result.affectedRows) {
    return response.status(404).json({
      success: false,
      message: "Kategori tidak ditemukan.",
    });
  }

  response.json({
    success: true,
    message: "Kategori berhasil dihapus.",
  });
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
