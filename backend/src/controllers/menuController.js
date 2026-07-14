/**
 * BACKEND CONTROLLER: menuController.js
 * -------------------------------------------------------------
 * Tugas utama:
 * 1. Mengatur logika bisnis untuk data Menu (CRUD: Create, Read, Update, Delete).
 * 2. Berkomunikasi dengan database PostgreSQL melalui koneksi Pool.
 * 3. Memvalidasi input dari admin sebelum disimpan ke database.
 * 4. Mengelola penyimpanan gambar menu (upload dan hapus).
 */

const { getPool, query } = require("../config/db");
const { saveImageValue, deleteManagedFile } = require("../utils/uploadStorage");
const {
  requireNonEmptyString,
  optionalTrimmedString,
  requirePositiveInteger,
  requireNonNegativeNumber,
  normalizeBoolean,
  badRequest,
} = require("../utils/validation");

/**
 * READ: Mengambil semua daftar menu dari database
 * Alur Kerja:
 * - Menjalankan perintah SQL SELECT dengan melakukan LEFT JOIN ke tabel 'categories'
 *   agar nama kategori menu ikut terbawa.
 * - Mengembalikan respon JSON berisi array data menu ke frontend.
 */
async function getMenus(request, response) {
  const menus = await query(
    `SELECT
        m.id,
        m.name,
        m.description,
        m.price_type AS "priceType",
        m.price,
        m.price_hot AS "priceHot",
        m.price_ice AS "priceIce",
        m.available,
        m.image_url AS imageUrl,
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
}

/**
 * CREATE: Membuat / menambahkan menu baru (hanya diakses oleh Admin)
 * Alur Kerja:
 * 1. Menerima data JSON dari request.body (name, price, image, dll.).
 * 2. Memvalidasi tipe data (kategori harus integer positif, nama tidak boleh kosong, dll.).
 * 3. Menyesuaikan logika harga:
 *    - Jika tipe harga 'hot_ice' -> wajib menyertakan priceHot dan priceIce.
 *    - Jika tipe harga 'single' -> wajib menyertakan price.
 * 4. Menyimpan file gambar menu yang diunggah ke storage Cloud Supabase.
 * 5. Menjalankan perintah SQL INSERT INTO menus untuk menyimpan data baru.
 */
async function createMenu(request, response) {
  const {
    categoryId,
    name = "",
    description = "",
    priceType = "single",
    price = 0,
    priceHot = 0,
    priceIce = 0,
    imageUrl = "",
    available = true,
    isPopular = false,
  } = request.body || {};

  // Validasi input wajib menggunakan helper validation
  const normalizedCategoryId = requirePositiveInteger(categoryId, "Kategori wajib dipilih.");
  const normalizedName = requireNonEmptyString(name, "Nama menu wajib diisi.", { maxLength: 120 });
  const normalizedDescription = optionalTrimmedString(description);
  const normalizedPriceType = requireNonEmptyString(priceType, "Tipe harga wajib diisi.", { maxLength: 30 });

  // Hanya boleh tipe 'single' atau 'hot_ice'
  if (!["single", "hot_ice"].includes(normalizedPriceType)) {
    throw badRequest("Tipe harga tidak valid.");
  }

  let normalizedPrice = 0;
  let normalizedPriceHot = null;
  let normalizedPriceIce = null;

  // Sesuaikan input harga berdasarkan tipe harga terpilih
  if (normalizedPriceType === "hot_ice") {
    normalizedPriceHot = requireNonNegativeNumber(priceHot, "Harga Hot tidak valid.");
    normalizedPriceIce = requireNonNegativeNumber(priceIce, "Harga Ice tidak valid.");
  } else {
    normalizedPrice = requireNonNegativeNumber(price, "Harga menu tidak valid.");
  }

  const normalizedAvailable = normalizeBoolean(available);
  const normalizedIsPopular = normalizeBoolean(isPopular);

  // Unggah gambar ke Supabase Storage (atau server lokal jika offline)
  const storedImageUrl = await saveImageValue(imageUrl, "menus");

  // Masukkan data baru ke database PostgreSQL
  const [result] = await getPool().execute(
    `INSERT INTO menus (
        category_id,
        name,
        description,
        price_type,
        price,
        price_hot,
        price_ice,
        image_url,
        available,
        is_popular
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      normalizedCategoryId,
      normalizedName,
      normalizedDescription || null,
      normalizedPriceType,
      normalizedPrice,
      normalizedPriceHot,
      normalizedPriceIce,
      storedImageUrl,
      normalizedAvailable ? 1 : 0,
      normalizedIsPopular ? 1 : 0,
    ]
  );

  response.status(201).json({
    success: true,
    data: {
      id: result.insertId, // Mengembalikan ID menu yang baru saja terbuat
    },
  });
}

/**
 * UPDATE: Mengubah data menu yang sudah ada (hanya diakses oleh Admin)
 * Alur Kerja:
 * 1. Mendapatkan ID menu dari parameter URL (req.params.id).
 * 2. Memeriksa apakah data menu tersebut memang ada di database.
 * 3. Memvalidasi seluruh input perubahan.
 * 4. Jika ada gambar baru yang diunggah, simpan gambar baru tersebut dan hapus file gambar lama dari storage.
 * 5. Menjalankan perintah SQL UPDATE untuk memperbarui baris menu.
 */
async function updateMenu(request, response) {
  const menuId = requirePositiveInteger(request.params.id, "ID menu tidak valid.");
  const {
    categoryId,
    name = "",
    description = "",
    priceType = "single",
    price = 0,
    priceHot = 0,
    priceIce = 0,
    imageUrl = "",
    available = true,
    isPopular = false,
  } = request.body || {};

  const normalizedCategoryId = requirePositiveInteger(categoryId, "Kategori wajib dipilih.");
  const normalizedName = requireNonEmptyString(name, "Nama menu wajib diisi.", { maxLength: 120 });
  const normalizedDescription = optionalTrimmedString(description);
  const normalizedLinkPriceType = requireNonEmptyString(priceType, "Tipe harga wajib diisi.", { maxLength: 30 });

  if (!["single", "hot_ice"].includes(normalizedLinkPriceType)) {
    throw badRequest("Tipe harga tidak valid.");
  }

  let normalizedPrice = 0;
  let normalizedPriceHot = null;
  let normalizedPriceIce = null;

  if (normalizedLinkPriceType === "hot_ice") {
    normalizedPriceHot = requireNonNegativeNumber(priceHot, "Harga Hot tidak valid.");
    normalizedPriceIce = requireNonNegativeNumber(priceIce, "Harga Ice tidak valid.");
  } else {
    normalizedPrice = requireNonNegativeNumber(price, "Harga menu tidak valid.");
  }

  const normalizedAvailable = normalizeBoolean(available);
  const normalizedIsPopular = normalizeBoolean(isPopular);

  // 1. Cek keberadaan menu lama di database
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

  // 2. Simpan gambar baru, dan otomatis hapus gambar lama dari cloud/storage
  const storedImageUrl = await saveImageValue(
    imageUrl,
    "menus",
    existingMenu.imageUrl || ""
  );

  // 3. Jalankan perintah pembaruan database
  await getPool().execute(
    `UPDATE menus
     SET
        category_id = ?,
        name = ?,
        description = ?,
        price_type = ?,
        price = ?,
        price_hot = ?,
        price_ice = ?,
        image_url = ?,
        available = ?,
        is_popular = ?
    WHERE id = ?`,
    [
      normalizedCategoryId,
      normalizedName,
      normalizedDescription || null,
      normalizedLinkPriceType,
      normalizedPrice,
      normalizedPriceHot,
      normalizedPriceIce,
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
}

/**
 * DELETE: Menghapus menu dari database (hanya diakses oleh Admin)
 * Alur Kerja:
 * 1. Mendapatkan ID menu dari parameter URL.
 * 2. Cek keberadaan menu dan ambil URL gambarnya.
 * 3. Hapus baris menu dari tabel database menggunakan perintah SQL DELETE.
 * 4. Hapus file gambar menu dari storage cloud agar tidak memakan ruang penyimpanan (storage leak).
 */
async function deleteMenu(request, response) {
  const menuId = requirePositiveInteger(request.params.id, "ID menu tidak valid.");

  // Cek keberadaan menu
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

  // Hapus data dari tabel
  await getPool().execute(
    `DELETE FROM menus WHERE id = ?`,
    [menuId]
  );

  // Hapus file gambar dari cloud storage
  await deleteManagedFile(existingMenu.imageUrl || "");

  response.json({
    success: true,
    message: "Menu berhasil dihapus.",
  });
}

module.exports = {
  getMenus,
  createMenu,
  updateMenu,
  deleteMenu,
};
