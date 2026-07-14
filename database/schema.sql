-- =========================================================================
-- SKEMA DATABASE MYSQL - QR Ordering
-- =========================================================================
-- File ini bertugas membuat struktur tabel di database MySQL (XAMPP / phpMyAdmin).
-- =========================================================================

CREATE DATABASE IF NOT EXISTS qr_ordering;
USE qr_ordering;

-- -------------------------------------------------------------
-- 1. TABEL ADMINS (Pengelola & Kasir)
-- Fungsi: Menyimpan data login admin dan kasir.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,                -- ID unik bertambah otomatis
    username VARCHAR(50) NOT NULL UNIQUE,                      -- Nama akun login
    full_name VARCHAR(100) NOT NULL,                           -- Nama lengkap pemilik
    password_hash VARCHAR(255) NOT NULL,                       -- Password terenkripsi
    role VARCHAR(30) NOT NULL DEFAULT 'admin',                 -- Peran: 'admin' atau 'cashier'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- Tanggal dibuat
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- Diperbarui otomatis saat data diedit
);

-- -------------------------------------------------------------
-- 2. TABEL CATEGORIES (Kategori Menu)
-- Fungsi: Mengelompokkan menu makanan dan minuman.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,                -- ID unik kategori
    name VARCHAR(100) NOT NULL UNIQUE,                         -- Nama kategori (unik)
    description TEXT NULL,                                     -- Keterangan kategori (opsional)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- Tanggal dibuat
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- Tanggal diubah
);

-- -------------------------------------------------------------
-- 3. TABEL MENUS (Daftar Makanan dan Minuman)
-- Fungsi: Menyimpan katalog menu makanan/minuman yang siap dipesan.
-- Hubungan: Terhubung ke kategori lewat 'category_id'.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menus (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,                -- ID unik menu
    category_id INT UNSIGNED NULL,                             -- Kategori menu yang bersangkutan
    name VARCHAR(120) NOT NULL UNIQUE,                         -- Nama makanan/minuman
    description TEXT NULL,                                     -- Deskripsi menu
    price_type VARCHAR(30) NOT NULL DEFAULT 'single',         -- Jenis penetapan harga ('single' atau 'hot_ice')
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,                   -- Harga dasar (untuk tipe 'single')
    price_hot DECIMAL(12, 2) NULL,                             -- Harga varian panas (untuk tipe 'hot_ice')
    price_ice DECIMAL(12, 2) NULL,                             -- Harga varian es (untuk tipe 'hot_ice')
    image_url TEXT NULL,                                       -- Gambar menu
    available TINYINT(1) NOT NULL DEFAULT 1,                   -- Ketersediaan: 1 = Tersedia, 0 = Habis
    is_popular TINYINT(1) NOT NULL DEFAULT 0,                 -- Unggulan: 1 = Ya (tampil di rekomendasi), 0 = Tidak
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- Waktu dibuat
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Waktu diedit
    CONSTRAINT fk_menus_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- -------------------------------------------------------------
-- 4. TABEL BANNERS (Banner Promosi Beranda)
-- Fungsi: Menyimpan gambar info promo geser di beranda atas.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banners (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,                -- ID unik banner
    title VARCHAR(150) NOT NULL,                               -- Judul banner promo
    subtitle VARCHAR(255) NULL,                                -- Detail penjelasan promo
    image_url TEXT NULL,                                       -- URL file banner
    link_url VARCHAR(255) NULL,                                -- Halaman rujukan
    start_date DATE NULL,                                      -- Tanggal berlaku promo mulai
    end_date DATE NULL,                                        -- Tanggal batas promo berakhir
    sort_order INT UNSIGNED NOT NULL DEFAULT 1,                -- Posisi sort banner
    is_active TINYINT(1) NOT NULL DEFAULT 1,                   -- Status keaktifan: 1 = Aktif, 0 = Nonaktif
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- 5. TABEL DISCOUNTS (Kupon Voucher Potongan Harga)
-- Fungsi: Mengelola voucher diskon yang digunakan saat checkout.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discounts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,                -- ID unik voucher
    code VARCHAR(50) NOT NULL UNIQUE,                          -- Kode unik voucher (misal: HEMAT10)
    name VARCHAR(150) NOT NULL,                                -- Nama voucher diskon
    type ENUM('voucher', 'referral') NOT NULL DEFAULT 'voucher', -- Jenis diskon
    discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'fixed', -- Jenis potongan: persen (%) atau nominal fixed (Rp)
    discount_value DECIMAL(12, 2) NOT NULL DEFAULT 0,          -- Nilai diskon potongan
    min_purchase DECIMAL(12, 2) NOT NULL DEFAULT 0,            -- Minimum pembelian sebelum potongan berlaku
    max_discount DECIMAL(12, 2) NOT NULL DEFAULT 0,            -- Batas potongan maksimal
    usage_limit INT UNSIGNED NOT NULL DEFAULT 0,                -- Kuota maksimal voucher
    used_count INT UNSIGNED NOT NULL DEFAULT 0,                 -- Berapa kali voucher sudah terpakai
    start_date DATE NULL,                                      -- Tanggal aktif voucher
    end_date DATE NULL,                                        -- Tanggal expired voucher
    is_active TINYINT(1) NOT NULL DEFAULT 1,                   -- Keaktifan voucher
    description TEXT NULL,                                     -- Keterangan syarat penggunaan voucher
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- 6. TABEL ORDERS (Transaksi Pesanan Pelanggan)
-- Fungsi: Menyimpan data invoice penjualan, total bayar, meja, status bayar.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,                -- ID transaksi pesanan
    order_number VARCHAR(30) NOT NULL UNIQUE,                  -- Kode pemesanan unik
    customer_name VARCHAR(120) NOT NULL,                       -- Nama pemesan
    phone_number VARCHAR(30) NULL,                             -- No HP pemesan
    table_number VARCHAR(30) NOT NULL,                         -- Meja pemesan
    payment_method VARCHAR(30) NOT NULL,                       -- Metode bayar: cash / qris
    status ENUM('received', 'preparing', 'ready', 'done', 'cancelled') NOT NULL DEFAULT 'received', -- Alur: diterima, dimasak, siap, selesai, batal
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,                 -- Total belanja sebelum pajak & biaya lain
    service_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,              -- Biaya servis/layanan
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,               -- Biaya pajak penjualan
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,          -- Nilai diskon potongan dari voucher
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,                    -- Total akhir tagihan belanja
    promo_code VARCHAR(50) NULL,                               -- Voucher yang terpakai
    barista_note TEXT NULL,                                    -- Catatan barista
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',     -- Status bayar Midtrans (pending/paid)
    payment_token VARCHAR(255) NULL,                           -- Token bayar SNAP Midtrans
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- 7. TABEL ORDER_ITEMS (Item Detail Transaksi)
-- Fungsi: Menyimpan rincian belanjaan per baris di dalam transaksi.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,                -- ID unik detail item
    order_id INT UNSIGNED NOT NULL,                            -- Terhubung ke tabel orders
    menu_id INT UNSIGNED NULL,                                 -- Terhubung ke tabel menus (katalog)
    menu_name VARCHAR(120) NOT NULL,                           -- Nama menu disimpan permanen
    qty INT UNSIGNED NOT NULL DEFAULT 1,                        -- Kuantitas jumlah porsi item
    size_label VARCHAR(20) NULL,                               -- Pilihan varian: 'Hot' atau 'Ice'
    note TEXT NULL,                                            -- Request pesanan pelanggan
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,              -- Harga per porsi item
    line_total DECIMAL(12, 2) NOT NULL DEFAULT 0,              -- Total harga baris (qty * harga porsi)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_order_items_menu
        FOREIGN KEY (menu_id) REFERENCES menus(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- -------------------------------------------------------------
-- 8. TABEL SETTINGS (Pengaturan Pajak & Biaya Servis Toko)
-- Fungsi: Menyimpan konfigurasi persentase pajak dan biaya servis.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(50) PRIMARY KEY,                             -- Nama parameter setting
    `value` VARCHAR(255) NOT NULL,                             -- Nilai parameter setting
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
