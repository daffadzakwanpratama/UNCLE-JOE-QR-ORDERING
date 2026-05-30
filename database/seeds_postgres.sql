-- Data Awal (Seeds) PostgreSQL untuk QR Ordering (Supabase)

-- 1. Insert Administrator (Menggunakan Hash Valid untuk password 'admin123')
INSERT INTO admins (username, full_name, password_hash, role)
VALUES ('admin', 'Administrator', '$2b$10$3oXjn2Urd.JSXO4jcBvcmemdAY5/oTRDMnpCGejSlR2LMSUMChuYi', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 2. Insert Kategori
INSERT INTO categories (name, description)
VALUES ('Coffee', 'Pilihan kopi panas dan dingin')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description)
VALUES ('Non Coffee', 'Minuman selain kopi')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name, description)
VALUES ('Snack', 'Camilan ringan teman minum')
ON CONFLICT (name) DO NOTHING;

-- 3. Insert Menu Default
INSERT INTO menus (category_id, name, description, price, available, rating, reviews_count, popularity_score)
SELECT id, 'Americano', 'Espresso dengan air panas, ringan dan bold.', 22000, true, 4.70, 120, 92
FROM categories
WHERE name = 'Coffee'
ON CONFLICT (name) DO NOTHING;

INSERT INTO menus (category_id, name, description, price, available, rating, reviews_count, popularity_score)
SELECT id, 'Caramel Latte', 'Latte creamy dengan sentuhan caramel manis.', 30000, true, 4.90, 210, 96
FROM categories
WHERE name = 'Coffee'
ON CONFLICT (name) DO NOTHING;

INSERT INTO menus (category_id, name, description, price, available, rating, reviews_count, popularity_score)
SELECT id, 'Matcha Latte', 'Matcha halus dengan susu segar.', 28000, false, 4.60, 90, 85
FROM categories
WHERE name = 'Non Coffee'
ON CONFLICT (name) DO NOTHING;

-- 4. Insert Diskon
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

-- 5. Insert Banner Promo
INSERT INTO banners (title, subtitle, link_url, start_date, end_date, sort_order, is_active)
SELECT 'Gratis Delivery', 'Min. pembelian Rp 50.000', './all-menu.html', '2026-05-01', '2026-05-31', 1, true
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE title = 'Gratis Delivery');
