USE qr_ordering;

INSERT INTO admins (username, full_name, password_hash, role)
SELECT
    'admin',
    'Administrator',
    '$2b$10$8gQS6Q5x8W3Q6x0q1lY7UON0F8v5Lq4x1xVYf3M4YbE3S6g9mK4zW',
    'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM admins WHERE username = 'admin'
);

INSERT INTO categories (name, description)
SELECT 'Coffee', 'Pilihan kopi panas dan dingin'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Coffee');

INSERT INTO categories (name, description)
SELECT 'Non Coffee', 'Minuman selain kopi'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Non Coffee');

INSERT INTO categories (name, description)
SELECT 'Snack', 'Camilan ringan teman minum'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Snack');

INSERT INTO menus (category_id, name, description, price, available, rating, reviews_count, popularity_score)
SELECT c.id, 'Americano', 'Espresso dengan air panas, ringan dan bold.', 22000, 1, 4.70, 120, 92
FROM categories c
WHERE c.name = 'Coffee'
  AND NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Americano');

INSERT INTO menus (category_id, name, description, price, available, rating, reviews_count, popularity_score)
SELECT c.id, 'Caramel Latte', 'Latte creamy dengan sentuhan caramel manis.', 30000, 1, 4.90, 210, 96
FROM categories c
WHERE c.name = 'Coffee'
  AND NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Caramel Latte');

INSERT INTO menus (category_id, name, description, price, available, rating, reviews_count, popularity_score)
SELECT c.id, 'Matcha Latte', 'Matcha halus dengan susu segar.', 28000, 0, 4.60, 90, 85
FROM categories c
WHERE c.name = 'Non Coffee'
  AND NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Matcha Latte');

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
