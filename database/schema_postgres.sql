-- Skema Database PostgreSQL untuk QR Ordering (Supabase)

-- Hapus tabel jika sudah ada (Opsional untuk reset)
-- DROP TABLE IF EXISTS order_items;
-- DROP TABLE IF EXISTS orders;
-- DROP TABLE IF EXISTS discounts;
-- DROP TABLE IF EXISTS banners;
-- DROP TABLE IF EXISTS menus;
-- DROP TABLE IF EXISTS categories;
-- DROP TABLE IF EXISTS admins;

CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menus (
    id SERIAL PRIMARY KEY,
    category_id INT NULL,
    name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    image_url TEXT NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    rating DECIMAL(3, 2) NOT NULL DEFAULT 0,
    reviews_count INT NOT NULL DEFAULT 0,
    popularity_score INT NOT NULL DEFAULT 0,
    is_popular BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_menus_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS banners (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    subtitle VARCHAR(255) NULL,
    image_url TEXT NULL,
    link_url VARCHAR(255) NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    sort_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discounts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'voucher' CHECK (type IN ('voucher', 'referral')),
    discount_type VARCHAR(30) NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('percent', 'fixed')),
    discount_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
    min_purchase DECIMAL(12, 2) NOT NULL DEFAULT 0,
    max_discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    usage_limit INT NOT NULL DEFAULT 0,
    used_count INT NOT NULL DEFAULT 0,
    start_date DATE NULL,
    end_date DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(30) NOT NULL UNIQUE,
    customer_name VARCHAR(120) NOT NULL,
    phone_number VARCHAR(30) NULL,
    table_number VARCHAR(30) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'preparing', 'ready', 'done', 'cancelled')),
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    service_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    promo_code VARCHAR(50) NULL,
    barista_note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    menu_id INT NULL,
    menu_name VARCHAR(120) NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    size_label VARCHAR(20) NULL,
    note TEXT NULL,
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    line_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
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

-- ==========================================
-- TRIGGER UNTUK AUTO-UPDATE updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
