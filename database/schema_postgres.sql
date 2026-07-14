-- =========================================================================
-- SKEMA DATABASE POSTGRESQL (Supabase) - QR Ordering
-- =========================================================================
-- File ini bertugas membuat struktur tabel di database PostgreSQL (Supabase).
-- Jika tabel sudah ada, "IF NOT EXISTS" akan memastikan perintah ini dilewati
-- agar tidak menimpa data yang sudah tersimpan.
-- =========================================================================

-- -------------------------------------------------------------
-- 1. TABEL ADMINS (Pengelola & Kasir)
-- Fungsi: Menyimpan data kredensial login admin dan kasir toko.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,                                     -- Kolom pengenal unik otomatis (Auto-increment)
    username VARCHAR(50) NOT NULL UNIQUE,                      -- Nama akun login (harus unik/tidak boleh kembar)
    full_name VARCHAR(100) NOT NULL,                           -- Nama lengkap pemilik akun
    password_hash VARCHAR(255) NOT NULL,                       -- Password yang dienkripsi menggunakan bcrypt (keamanan)
    role VARCHAR(30) NOT NULL DEFAULT 'admin',                 -- Peran user: 'admin' (akses penuh) atau 'cashier' (hanya kasir)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- Tanggal dan waktu pertama kali akun dibuat
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP    -- Tanggal dan waktu terakhir akun diubah
);

-- -------------------------------------------------------------
-- 2. TABEL CATEGORIES (Kategori Menu)
-- Fungsi: Mengelompokkan menu makanan/minuman (misal: Coffee, Snack).
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,                                     -- ID unik kategori menu
    name VARCHAR(100) NOT NULL UNIQUE,                         -- Nama kategori (misal: Coffee, Non Coffee)
    description TEXT NULL,                                     -- Deskripsi penjelas kategori (opsional)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- Waktu pembuatan kategori
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP    -- Waktu perubahan kategori
);

-- -------------------------------------------------------------
-- 3. TABEL MENUS (Daftar Makanan dan Minuman)
-- Fungsi: Menyimpan daftar menu cafe yang bisa dipesan pelanggan.
-- Hubungan: Terhubung ke tabel 'categories' melalui kolom 'category_id'.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menus (
    id SERIAL PRIMARY KEY,                                     -- ID unik menu
    category_id INT NULL,                                      -- FK: Menghubungkan menu ke kategori tertentu
    name VARCHAR(120) NOT NULL UNIQUE,                         -- Nama menu (unik, misal: Caramel Latte)
    description TEXT NULL,                                     -- Komposisi atau penjelasan menu (opsional)
    price_type VARCHAR(30) NOT NULL DEFAULT 'single',         -- Tipe harga: 'single' (satu harga) atau 'hot_ice' (beda harga varian)
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,                   -- Harga dasar (dipakai jika price_type = 'single')
    price_hot DECIMAL(12, 2) NULL,                             -- Harga varian Panas (dipakai jika price_type = 'hot_ice')
    price_ice DECIMAL(12, 2) NULL,                             -- Harga varian Dingin (dipakai jika price_type = 'hot_ice')
    image_url TEXT NULL,                                       -- Tautan/URL file gambar menu yang disimpan di cloud
    available BOOLEAN NOT NULL DEFAULT TRUE,                   -- Status stok: TRUE (tersedia) atau FALSE (habis)
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,                 -- Flag menu terlaris: TRUE (tampil di halaman rekomendasi beranda)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- Waktu penambahan menu
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- Waktu perubahan detail menu
    CONSTRAINT fk_menus_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE SET NULL                                     -- Jika kategori dihapus, kolom category_id di menu diset kosong (NULL)
        ON UPDATE CASCADE                                      -- Jika ID kategori diubah, ikut berubah otomatis di tabel menu
);

-- -------------------------------------------------------------
-- 4. TABEL BANNERS (Banner Slide Promo Beranda)
-- Fungsi: Menyimpan data promo yang bergulir di bagian atas beranda pelanggan.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banners (
    id SERIAL PRIMARY KEY,                                     -- ID unik banner
    title VARCHAR(150) NOT NULL,                               -- Judul banner promo (misal: "Gratis Ongkir")
    subtitle VARCHAR(255) NULL,                                -- Penjelasan singkat promo (misal: "Min. Belanja Rp 50k")
    image_url TEXT NULL,                                       -- URL file gambar banner
    link_url VARCHAR(255) NULL,                                -- Tautan halaman saat banner di-klik (opsional)
    start_date DATE NULL,                                      -- Tanggal mulai berlakunya banner
    end_date DATE NULL,                                        -- Tanggal berakhirnya banner
    sort_order INT NOT NULL DEFAULT 1,                         -- Urutan prioritas tampilnya banner (angka terkecil tampil duluan)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,                   -- Status keaktifan banner: TRUE (tampil) atau FALSE (disembunyikan)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- Waktu pembuatan banner
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP    -- Waktu perubahan banner
);

-- -------------------------------------------------------------
-- 5. TABEL DISCOUNTS (Kode Voucher Diskon & Referral)
-- Fungsi: Menyimpan kode voucher potongan harga saat checkout belanja.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discounts (
    id SERIAL PRIMARY KEY,                                     -- ID unik diskon
    code VARCHAR(50) NOT NULL UNIQUE,                          -- Kode promo unik (misal: HEMAT10)
    name VARCHAR(150) NOT NULL,                                -- Nama kampanye diskon (misal: Diskon Hemat Awal Bulan)
    type VARCHAR(30) NOT NULL DEFAULT 'voucher' CHECK (type IN ('voucher', 'referral')), -- Jenis diskon
    discount_type VARCHAR(30) NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('percent', 'fixed')), -- Tipe potongan: 'percent' (%) atau 'fixed' (Rupiah)
    discount_value DECIMAL(12, 2) NOT NULL DEFAULT 0,          -- Nilai potongan (misal: 10 untuk persen, atau 10000 untuk rupiah)
    min_purchase DECIMAL(12, 2) NOT NULL DEFAULT 0,            -- Syarat minimal belanja sebelum diskon bisa digunakan
    max_discount DECIMAL(12, 2) NOT NULL DEFAULT 0,            -- Nilai maksimal potongan (berguna jika tipe diskon persen)
    usage_limit INT NOT NULL DEFAULT 0,                        -- Batas kuota total pemakaian voucher (0 = tidak terbatas)
    used_count INT NOT NULL DEFAULT 0,                         -- Jumlah total berapa kali voucher sudah terpakai
    start_date DATE NULL,                                      -- Tanggal awal mulai masa promo voucher
    end_date DATE NULL,                                        -- Tanggal batas akhir penggunaan voucher
    is_active BOOLEAN NOT NULL DEFAULT TRUE,                   -- Status keaktifan voucher
    description TEXT NULL,                                     -- Penjelasan syarat & ketentuan voucher
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- Waktu pembuatan voucher
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP    -- Waktu perubahan detail voucher
);

-- -------------------------------------------------------------
-- 6. TABEL ORDERS (Transaksi Pesanan Pelanggan)
-- Fungsi: Menyimpan pesanan masuk, nominal belanja, meja, dan status pembayaran.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,                                     -- ID unik transaksi
    order_number VARCHAR(30) NOT NULL UNIQUE,                  -- Nomor invoice unik (misal: ORD-140726-001)
    customer_name VARCHAR(120) NOT NULL,                       -- Nama pelanggan pemesan makanan
    phone_number VARCHAR(30) NULL,                             -- Nomor telepon pelanggan (opsional)
    table_number VARCHAR(30) NOT NULL,                         -- Nomor meja/kursi pemesan
    payment_method VARCHAR(30) NOT NULL,                       -- Metode pembayaran: 'cash' (kasir) atau 'qris' (Midtrans)
    status VARCHAR(30) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'preparing', 'ready', 'done', 'cancelled')), -- Tahapan order: diterima, dimasak, siap diantar, selesai, batal
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,                 -- Total harga item belanja sebelum biaya tambahan/diskon
    service_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,              -- Biaya layanan tambahan (dari pengaturan)
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,               -- Biaya PPN/pajak (dari pengaturan)
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,          -- Nilai diskon potongan harga yang berhasil dikurangi
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,                    -- Nominal akhir wajib dibayar (Subtotal + Layanan + Pajak - Diskon)
    promo_code VARCHAR(50) NULL,                               -- Kode voucher diskon yang digunakan (jika ada)
    barista_note TEXT NULL,                                    -- Catatan tambahan untuk pesanan (misal: Es dipisah)
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',     -- Status transaksi Midtrans: 'pending', 'paid' (lunas), 'failed'
    payment_token VARCHAR(255) NULL,                           -- Token transaksi Snap Midtrans untuk pembayaran digital
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- Waktu pelanggan melakukan klik pesan
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP    -- Waktu perubahan status order
);

-- -------------------------------------------------------------
-- 7. TABEL ORDER_ITEMS (Item Detail Transaksi)
-- Fungsi: Mencatat rincian menu apa saja yang dibeli di dalam satu order.
-- Hubungan: Terhubung ke tabel 'orders' dan tabel 'menus'.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,                                     -- ID unik baris detail item
    order_id INT NOT NULL,                                     -- FK: Terhubung ke tabel orders
    menu_id INT NULL,                                          -- FK: Terhubung ke tabel menus (bisa kosong jika menu dihapus dari katalog)
    menu_name VARCHAR(120) NOT NULL,                           -- Nama menu disimpan permanen (jika menu di katalog dihapus, invoice tetap menampilkan nama)
    qty INT NOT NULL DEFAULT 1,                                -- Kuantitas pembelian item (jumlah porsi)
    size_label VARCHAR(20) NULL,                               -- Label varian yang dipilih: 'Hot' atau 'Ice'
    note TEXT NULL,                                            -- Catatan khusus per menu (misal: Gula sedikit)
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,              -- Harga per porsi item saat transaksi terjadi
    line_total DECIMAL(12, 2) NOT NULL DEFAULT 0,              -- Total harga per baris (Kuantitas x Harga Per Porsi)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- Waktu pemesanan item
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE                                      -- Jika data pesanan utama dihapus, item detailnya otomatis ikut terhapus
        ON UPDATE CASCADE,
    CONSTRAINT fk_order_items_menu
        FOREIGN KEY (menu_id) REFERENCES menus(id)
        ON DELETE SET NULL                                     -- Jika menu dihapus dari katalog, catatan struk belanja tidak rusak
        ON UPDATE CASCADE
);

-- -------------------------------------------------------------
-- 8. TABEL SETTINGS (Pengaturan Pajak & Biaya Layanan Toko)
-- Fungsi: Menyimpan konfigurasi persentase pajak dan biaya servis.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(50) PRIMARY KEY,                               -- Kunci pengaturan (misal: 'tax_percent', 'service_fee')
    value VARCHAR(255) NOT NULL,                               -- Nilai pengaturan (misal: '10' untuk 10%, '2000' untuk Rp2.000)
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP    -- Waktu perubahan pengaturan terakhir
);

-- =========================================================================
-- TRIGGER OTOMATIS: UPDATE KOLOM updated_at
-- =========================================================================
-- Menggunakan function PostgreSQL plpgsql untuk mendeteksi perubahan baris data,
-- lalu memperbarui kolom updated_at secara otomatis dengan waktu terbaru.
-- =========================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pasang pemicu (trigger) untuk setiap tabel
CREATE TRIGGER trigger_update_admins_updated_at
BEFORE UPDATE ON admins
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_menus_updated_at
BEFORE UPDATE ON menus
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_banners_updated_at
BEFORE UPDATE ON banners
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_discounts_updated_at
BEFORE UPDATE ON discounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
