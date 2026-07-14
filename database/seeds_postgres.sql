-- =========================================================================
-- DATA AWAL (SEEDS) DATABASE POSTGRESQL (Supabase) - QR Ordering
-- =========================================================================
-- File ini bertugas memasukkan data dummy / data awal bawaan ke dalam tabel.
-- Digunakan saat setup pertama kali agar website tidak kosong dan admin bisa login.
-- "ON CONFLICT ... DO NOTHING" memastikan jika data sudah ada tidak akan menumpuk / error.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. DATA ADMIN BAWAAN
-- Menambahkan satu user admin default dengan password: admin123
-- -------------------------------------------------------------------------
INSERT INTO admins (username, full_name, password_hash, role)
VALUES ('admin', 'Administrator', '$2b$10$3oXjn2Urd.JSXO4jcBvcmemdAY5/oTRDMnpCGejSlR2LMSUMChuYi', 'admin')
ON CONFLICT (username) DO NOTHING;

-- -------------------------------------------------------------------------
-- 2. DATA KATEGORI MENU BAWAAN
-- Menambahkan tiga kategori utama: Kopi, Selain Kopi, dan Cemilan.
-- -------------------------------------------------------------------------
INSERT INTO categories (name, description)
VALUES ('Coffee', 'Pilihan kopi panas dan dingin')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description)
VALUES ('Non Coffee', 'Minuman selain kopi')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description)
VALUES ('Snack', 'Camilan ringan teman minum')
ON CONFLICT (name) DO NOTHING;

-- -------------------------------------------------------------------------
-- 3. DATA KATALOG MENU BAWAAN
-- Menambahkan menu kopi & latte pertama ke dalam tabel menu.
-- Hubungan: Menghubungkan ID kategori secara dinamis dari tabel categories.
-- -------------------------------------------------------------------------
INSERT INTO menus (category_id, name, description, price, available)
SELECT id, 'Americano', 'Espresso dengan air panas, ringan dan bold.', 22000, true
FROM categories
WHERE name = 'Coffee'
ON CONFLICT (name) DO NOTHING;

INSERT INTO menus (category_id, name, description, price, available)
SELECT id, 'Caramel Latte', 'Latte creamy dengan sentuhan caramel manis.', 30000, true
FROM categories
WHERE name = 'Coffee'
ON CONFLICT (name) DO NOTHING;

INSERT INTO menus (category_id, name, description, price, available)
SELECT id, 'Matcha Latte', 'Matcha halus dengan susu segar.', 28000, false
FROM categories
WHERE name = 'Non Coffee'
ON CONFLICT (name) DO NOTHING;

-- -------------------------------------------------------------------------
-- 4. DATA KUPON DISKON BAWAAN
-- Menambahkan voucher promo potongan 10% untuk transaksi perdana.
-- -------------------------------------------------------------------------
INSERT INTO discounts (
    code,
    name,
    type,
    discount_type,
    discount_value,
    min_purchase,
    max_discount,
    usage_limit,
    used_count,
    start_date,
    end_date,
    is_active,
    description
)
VALUES (
    'HEMAT10',
    'Promo Hemat 10%',
    'voucher',
    'percent',
    10,
    50000,
    15000,
    100,
    0,
    '2026-05-01',
    '2026-05-31',
    true,
    'Potongan 10% untuk minimum pembelian Rp 50.000.'
)
ON CONFLICT (code) DO NOTHING;

-- -------------------------------------------------------------------------
-- 5. DATA BANNER PROMO BAWAAN
-- Menambahkan slide promo gratis ongkir/pengiriman di beranda.
-- -------------------------------------------------------------------------
INSERT INTO banners (title, subtitle, link_url, start_date, end_date, sort_order, is_active)
SELECT 'Gratis Delivery', 'Min. pembelian Rp 50.000', './all-menu.html', '2026-05-01', '2026-05-31', 1, true
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE title = 'Gratis Delivery');

-- -------------------------------------------------------------------------
-- 6. DATA SETTINGS BAWAAN
-- Menambahkan pengaturan default pajak (10%) dan biaya layanan (Rp 2.000).
-- -------------------------------------------------------------------------
INSERT INTO settings (key, value)
VALUES 
    ('tax_percent', '10'),
    ('service_fee', '2000')
ON CONFLICT (key) DO NOTHING;
