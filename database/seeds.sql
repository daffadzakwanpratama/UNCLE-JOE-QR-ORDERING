-- =========================================================================
-- DATA AWAL (SEEDS) DATABASE MYSQL - QR Ordering
-- =========================================================================
-- File ini bertugas memasukkan data dummy bawaan untuk database MySQL.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. DATA ADMIN BAWAAN (password: admin123)
-- -------------------------------------------------------------------------
INSERT INTO admins (username, full_name, password_hash, role)
SELECT
    'admin',
    'Administrator',
    '$2b$10$8gQS6Q5x8W3Q6x0q1lY7UON0F8v5Lq4x1xVYf3M4YbE3S6g9mK4zW',
    'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM admins WHERE username = 'admin'
);

-- -------------------------------------------------------------------------
-- 2. DATA KATEGORI MENU BAWAAN
-- -------------------------------------------------------------------------
INSERT INTO categories (name, description)
SELECT 'Coffee', 'Pilihan kopi panas dan dingin'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Coffee');

INSERT INTO categories (name, description)
SELECT 'Non Coffee', 'Minuman selain kopi'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Non Coffee');

INSERT INTO categories (name, description)
SELECT 'Snack', 'Camilan ringan teman minum'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Snack');

-- -------------------------------------------------------------------------
-- 3. DATA KATALOG MENU BAWAAN
-- -------------------------------------------------------------------------
INSERT INTO menus (category_id, name, description, price, available)
SELECT c.id, 'Americano', 'Espresso dengan air panas, ringan dan bold.', 22000, 1
FROM categories c
WHERE c.name = 'Coffee'
  AND NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Americano');

INSERT INTO menus (category_id, name, description, price, available)
SELECT c.id, 'Caramel Latte', 'Latte creamy dengan sentuhan caramel manis.', 30000, 1
FROM categories c
WHERE c.name = 'Coffee'
  AND NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Caramel Latte');

INSERT INTO menus (category_id, name, description, price, available)
SELECT c.id, 'Matcha Latte', 'Matcha halus dengan susu segar.', 28000, 0
FROM categories c
WHERE c.name = 'Non Coffee'
  AND NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Matcha Latte');

-- -------------------------------------------------------------------------
-- 4. DATA KUPON DISKON BAWAAN
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
SELECT
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
    1,
    'Potongan 10% untuk minimum pembelian Rp 50.000.'
WHERE NOT EXISTS (SELECT 1 FROM discounts WHERE code = 'HEMAT10');

-- -------------------------------------------------------------------------
-- 5. DATA BANNER PROMO BAWAAN
-- -------------------------------------------------------------------------
INSERT INTO banners (title, subtitle, link_url, start_date, end_date, sort_order, is_active)
SELECT
    'Gratis Delivery',
    'Min. pembelian Rp 50.000',
    './all-menu.html',
    '2026-05-01',
    '2026-05-31',
    1,
    1
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE title = 'Gratis Delivery');

-- -------------------------------------------------------------------------
-- 6. DATA SETTINGS BAWAAN
-- -------------------------------------------------------------------------
INSERT INTO settings (`key`, `value`)
SELECT 'tax_percent', '10'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE `key` = 'tax_percent');

INSERT INTO settings (`key`, `value`)
SELECT 'service_fee', '2000'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE `key` = 'service_fee');
