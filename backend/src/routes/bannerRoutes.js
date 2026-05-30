const express = require("express");
const { getPool, query } = require("../config/db");
const { saveImageValue, deleteManagedFile } = require("../utils/uploadStorage");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  requireNonEmptyString,
  optionalTrimmedString,
  requirePositiveInteger,
  normalizeBoolean,
  optionalDateString,
  ensureDateRange,
} = require("../utils/validation");

const router = express.Router();

router.get("/", requireAdminAuth, asyncHandler(async (request, response) => {
  const banners = await query(
    `SELECT
        id,
        title,
        subtitle,
        image_url AS imageUrl,
        link_url AS linkUrl,
        start_date AS startDate,
        end_date AS endDate,
        sort_order AS sortOrder,
        is_active AS isActive,
        created_at AS createdAt,
        updated_at AS updatedAt
     FROM banners
     ORDER BY sort_order ASC, id DESC`
  );

  response.json({
    success: true,
    data: banners,
  });
}));

router.post("/", requireAdminAuth, asyncHandler(async (request, response) => {
  const {
    title = "",
    subtitle = "",
    imageUrl = "",
    linkUrl = "",
    startDate = null,
    endDate = null,
    sortOrder = 1,
    isActive = true,
  } = request.body || {};
  const normalizedTitle = requireNonEmptyString(title, "Judul banner wajib diisi.", { maxLength: 150 });
  const normalizedSubtitle = optionalTrimmedString(subtitle, { maxLength: 255 });
  const normalizedLinkUrl = optionalTrimmedString(linkUrl, { maxLength: 255 });
  const normalizedStartDate = optionalDateString(startDate, "Format tanggal mulai tidak valid.");
  const normalizedEndDate = optionalDateString(endDate, "Format tanggal akhir tidak valid.");
  const normalizedSortOrder = requirePositiveInteger(sortOrder, "Urutan banner tidak valid.");
  const normalizedIsActive = normalizeBoolean(isActive);
  ensureDateRange(normalizedStartDate, normalizedEndDate, "Tanggal mulai tidak boleh melebihi tanggal akhir.");

  const storedImageUrl = await saveImageValue(imageUrl, "banners");

  const [result] = await getPool().execute(
    `INSERT INTO banners (
        title,
        subtitle,
        image_url,
        link_url,
        start_date,
        end_date,
        sort_order,
        is_active
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      normalizedTitle,
      normalizedSubtitle || null,
      storedImageUrl,
      normalizedLinkUrl || null,
      normalizedStartDate,
      normalizedEndDate,
      normalizedSortOrder,
      normalizedIsActive ? 1 : 0,
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
  const bannerId = requirePositiveInteger(request.params.id, "ID banner tidak valid.");
  const {
    title = "",
    subtitle = "",
    imageUrl = "",
    linkUrl = "",
    startDate = null,
    endDate = null,
    sortOrder = 1,
    isActive = true,
  } = request.body || {};
  const normalizedTitle = requireNonEmptyString(title, "Judul banner wajib diisi.", { maxLength: 150 });
  const normalizedSubtitle = optionalTrimmedString(subtitle, { maxLength: 255 });
  const normalizedLinkUrl = optionalTrimmedString(linkUrl, { maxLength: 255 });
  const normalizedStartDate = optionalDateString(startDate, "Format tanggal mulai tidak valid.");
  const normalizedEndDate = optionalDateString(endDate, "Format tanggal akhir tidak valid.");
  const normalizedSortOrder = requirePositiveInteger(sortOrder, "Urutan banner tidak valid.");
  const normalizedIsActive = normalizeBoolean(isActive);
  ensureDateRange(normalizedStartDate, normalizedEndDate, "Tanggal mulai tidak boleh melebihi tanggal akhir.");

  const existingBanners = await query(
    `SELECT id, image_url AS imageUrl
     FROM banners
     WHERE id = :bannerId
     LIMIT 1`,
    { bannerId }
  );

  const existingBanner = existingBanners[0];

  if (!existingBanner) {
    return response.status(404).json({
      success: false,
      message: "Banner tidak ditemukan.",
    });
  }

  const storedImageUrl = await saveImageValue(
    imageUrl,
    "banners",
    existingBanner.imageUrl || ""
  );

  await getPool().execute(
    `UPDATE banners
     SET
        title = ?,
        subtitle = ?,
        image_url = ?,
        link_url = ?,
        start_date = ?,
        end_date = ?,
        sort_order = ?,
        is_active = ?
    WHERE id = ?`,
    [
      normalizedTitle,
      normalizedSubtitle || null,
      storedImageUrl,
      normalizedLinkUrl || null,
      normalizedStartDate,
      normalizedEndDate,
      normalizedSortOrder,
      normalizedIsActive ? 1 : 0,
      bannerId,
    ]
  );

  response.json({
    success: true,
    data: { id: bannerId },
  });
}));

router.delete("/:id", requireAdminAuth, asyncHandler(async (request, response) => {
  const bannerId = requirePositiveInteger(request.params.id, "ID banner tidak valid.");

  const existingBanners = await query(
    `SELECT image_url AS imageUrl
     FROM banners
     WHERE id = :bannerId
     LIMIT 1`,
    { bannerId }
  );

  const existingBanner = existingBanners[0];

  if (!existingBanner) {
    return response.status(404).json({
      success: false,
      message: "Banner tidak ditemukan.",
    });
  }

  await getPool().execute(
    `DELETE FROM banners WHERE id = ?`,
    [bannerId]
  );

  await deleteManagedFile(existingBanner.imageUrl || "");

  response.json({
    success: true,
    message: "Banner berhasil dihapus.",
  });
}));

module.exports = router;
