CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (role IN ('admin', 'customer'))
);

CREATE UNIQUE INDEX users_email_unique_idx ON users (lower(email));

CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PLN',
    dpi INTEGER NOT NULL,
    wireless BOOLEAN NOT NULL DEFAULT false,
    ergonomic BOOLEAN NOT NULL DEFAULT false,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT products_price_positive_check CHECK (price_cents > 0),
    CONSTRAINT products_dpi_positive_check CHECK (dpi > 0),
    CONSTRAINT products_stock_non_negative_check CHECK (stock >= 0)
);

CREATE INDEX products_category_idx ON products (category);
CREATE INDEX products_name_idx ON products (name);

CREATE TABLE carts (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (user_id, product_id),
    CONSTRAINT carts_quantity_positive_check CHECK (quantity > 0)
);

CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PLN',
    status TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT orders_total_non_negative_check CHECK (total_cents >= 0)
);

CREATE INDEX orders_user_id_created_at_idx ON orders (user_id, created_at DESC);
CREATE INDEX orders_created_at_idx ON orders (created_at DESC);

CREATE TABLE order_items (
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    subtotal_cents INTEGER NOT NULL,
    PRIMARY KEY (order_id, product_id),
    CONSTRAINT order_items_quantity_positive_check CHECK (quantity > 0),
    CONSTRAINT order_items_unit_price_positive_check CHECK (unit_price_cents > 0),
    CONSTRAINT order_items_subtotal_non_negative_check CHECK (subtotal_cents >= 0)
);

INSERT INTO products (
    id,
    name,
    slug,
    description,
    category,
    price_cents,
    currency,
    dpi,
    wireless,
    ergonomic,
    stock,
    image_url,
    created_at,
    updated_at
) VALUES
(
    'prod-gaming-viper',
    'Viper X1 Gaming Mouse',
    'viper-x1-gaming-mouse',
    'Lightweight wired mouse with a 26K DPI sensor and crisp switches for FPS games.',
    'gaming',
    24900,
    'PLN',
    26000,
    false,
    false,
    18,
    '/assets/products/viper-x1.jpg',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'prod-gaming-orbit',
    'Orbit Pro Wireless',
    'orbit-pro-wireless',
    'Low-latency wireless mouse with programmable buttons and RGB profile support.',
    'gaming',
    34900,
    'PLN',
    30000,
    true,
    true,
    12,
    '/assets/products/orbit-pro.jpg',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'prod-office-quiet',
    'QuietDesk M2',
    'quietdesk-m2',
    'Silent wireless office mouse with long battery life and a comfortable palm shape.',
    'office',
    12900,
    'PLN',
    4000,
    true,
    true,
    30,
    '/assets/products/quietdesk-m2.jpg',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'prod-office-travel',
    'TravelClick Compact',
    'travelclick-compact',
    'Compact Bluetooth mouse for office work, travel, and hybrid setups.',
    'office',
    9900,
    'PLN',
    2400,
    true,
    false,
    25,
    '/assets/products/travelclick.jpg',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;
