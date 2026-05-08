CREATE TABLE product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT product_images_url_non_empty_check CHECK (length(trim(url)) > 0),
    CONSTRAINT product_images_sort_order_non_negative_check CHECK (sort_order >= 0)
);

CREATE INDEX product_images_product_id_sort_idx
    ON product_images (product_id, sort_order, created_at);

CREATE UNIQUE INDEX product_images_product_primary_unique_idx
    ON product_images (product_id)
    WHERE is_primary;

INSERT INTO product_images (
    id,
    product_id,
    url,
    alt_text,
    sort_order,
    is_primary,
    created_at
)
SELECT
    'img-' || id,
    id,
    image_url,
    name,
    0,
    true,
    created_at
FROM products
WHERE image_url <> ''
ON CONFLICT (id) DO NOTHING;
