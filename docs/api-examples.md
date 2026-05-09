# API Examples

Base URL:

```txt
http://localhost:8080/api/v1
```

Error responses use:

```json
{"error":"message"}
```

## Auth

Register:

```sh
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

Login:

```sh
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Use the returned token on authenticated requests:

```txt
Authorization: Bearer <token>
```

## Products

List products:

```sh
curl "http://localhost:8080/api/v1/products?category=gaming&q=viper"
```

Get a product:

```sh
curl http://localhost:8080/api/v1/products/prod-gaming-viper
```

Get a product by customer-facing slug:

```sh
curl http://localhost:8080/api/v1/products/slug/viper-x1-gaming-mouse
```

Product responses include both the temporary `imageUrl` compatibility field and an `images` gallery array. Seeded products expose their demo SVG as the primary gallery image until an uploaded image is marked primary.

Create a product as admin:

```sh
curl -X POST http://localhost:8080/api/v1/admin/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "name":"Demo Mouse",
    "slug":"demo-mouse",
    "description":"A demo product.",
    "category":"office",
    "priceCents":12900,
    "currency":"PLN",
    "dpi":4000,
    "wireless":true,
    "ergonomic":true,
    "stock":10,
    "imageUrl":"/assets/products/product-generic.svg"
}'
```

Upload product images as admin:

```sh
curl -X POST http://localhost:8080/api/v1/admin/products/prod-gaming-viper/images \
  -H "Authorization: Bearer <admin-token>" \
  -F "images=@/path/to/mouse-front.png" \
  -F "images=@/path/to/mouse-side.jpg"
```

Uploads must use the `images` multipart field. The backend accepts JPEG and PNG only, rejects SVG/WebP/GIF/PDF/unknown files, validates decoded image headers, and enforces the configured per-image, request, and max-image limits.

Mark an image as primary:

```sh
curl -X PATCH http://localhost:8080/api/v1/admin/products/prod-gaming-viper/images/<image-id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"isPrimary":true,"altText":"Viper X1 front angle"}'
```

Reorder product images:

```sh
curl -X PATCH http://localhost:8080/api/v1/admin/products/prod-gaming-viper/images/order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"imageIds":["<first-image-id>","<second-image-id>"]}'
```

Delete image metadata:

```sh
curl -X DELETE http://localhost:8080/api/v1/admin/products/prod-gaming-viper/images/<image-id> \
  -H "Authorization: Bearer <admin-token>"
```

Current deletion behavior removes image metadata from the product gallery. Uploaded-file cleanup policy is still a documented project gap, so deployments should keep upload storage on a managed volume and plan periodic orphan cleanup until that policy is implemented.

## Cart

View cart:

```sh
curl http://localhost:8080/api/v1/cart \
  -H "Authorization: Bearer <token>"
```

Add an item:

```sh
curl -X POST http://localhost:8080/api/v1/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"productId":"prod-gaming-viper","quantity":1}'
```

Set item quantity:

```sh
curl -X PATCH http://localhost:8080/api/v1/cart/items/prod-gaming-viper \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"quantity":2}'
```

Remove an item:

```sh
curl -X DELETE http://localhost:8080/api/v1/cart/items/prod-gaming-viper \
  -H "Authorization: Bearer <token>"
```

## Orders And Payment

Create an order from the current cart. This clears the cart, reduces stock, and creates a pending simulated payment.

```sh
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"paymentMethod":"simulation"}'
```

Simulate payment success:

```sh
curl -X POST http://localhost:8080/api/v1/orders/<order-id>/payment/simulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"result":"success"}'
```

Simulate payment failure:

```sh
curl -X POST http://localhost:8080/api/v1/orders/<order-id>/payment/simulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"result":"failure"}'
```

Valid order states:

```txt
status: pending | confirmed | payment_failed
paymentStatus: pending | paid | failed
```

List your orders:

```sh
curl http://localhost:8080/api/v1/orders \
  -H "Authorization: Bearer <token>"
```

## Admin

List orders:

```sh
curl http://localhost:8080/api/v1/admin/orders \
  -H "Authorization: Bearer <admin-token>"
```

List users:

```sh
curl "http://localhost:8080/api/v1/admin/users?role=customer&q=test" \
  -H "Authorization: Bearer <admin-token>"
```

Update a user role:

```sh
curl -X PATCH http://localhost:8080/api/v1/admin/users/<user-id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"role":"admin"}'
```
