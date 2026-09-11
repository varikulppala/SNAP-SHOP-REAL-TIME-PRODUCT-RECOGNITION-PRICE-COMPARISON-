# Snap&Shop API Documentation

## 1. Overview

The Snap&Shop backend provides REST APIs for:

- User registration and authentication
- Product detection from images
- Product searching
- Online price comparison
- Local product price lookup
- Nearby store discovery
- Store configuration

The backend is implemented with Node.js and Express and uses MongoDB for user and product data.

---

## 2. Base URL

For local development:

`http://localhost:4000`

The default backend port is `4000`. A different port can be configured using the `PORT` environment variable.

Health check:

`GET /health`

Example response:

`{"status":"ok","service":"snapshop-backend"}`

---

## 3. Authentication

Authenticated endpoints use a JWT token.

Send the token using:

`Authorization: Bearer <JWT_TOKEN>`

JWT tokens generated during registration and login expire after 7 days.

Some product endpoints use optional authentication. When a valid authenticated user is available, product search history can be stored.

---

# 4. Authentication APIs

## 4.1 Register User

`POST /auth/register`

Creates a new user account.

### Request body

`{"name":"User Name","email":"user@example.com","password":"password"}`

Required fields:

- `name`
- `email`
- `password`

### Success response

HTTP `201 Created`

`{"token":"<JWT_TOKEN>","user":{"id":"<USER_ID>","name":"User Name","email":"user@example.com"}}`

### Error responses

`400 Bad Request`

`{"message":"Name, email and password are required"}`

`409 Conflict`

`{"message":"User already exists"}`

`500 Internal Server Error`

`{"message":"Internal server error"}`

---

## 4.2 Login

`POST /auth/login`

Authenticates an existing user.

### Request body

`{"email":"user@example.com","password":"password"}`

Required fields:

- `email`
- `password`

### Success response

HTTP `200 OK`

`{"token":"<JWT_TOKEN>","user":{"id":"<USER_ID>","name":"User Name","email":"user@example.com"}}`

### Error responses

`400 Bad Request`

`{"message":"Email and password are required"}`

`401 Unauthorized`

`{"message":"Invalid credentials"}`

`500 Internal Server Error`

`{"message":"Internal server error"}`

---

## 4.3 Get Current User

`GET /auth/me`

Returns information about the currently authenticated user.

Authentication is required.

### Success response

`{"id":"<USER_ID>","name":"User Name","email":"user@example.com","history":[]}`

### Error responses

`401 Unauthorized` - Unauthorized

`404 Not Found` - User not found

`500 Internal Server Error` - Internal server error

---

# 5. Product APIs

## 5.1 Detect Product From Image

`POST /product/detect`

Detects product information from a Base64-encoded image.

Authentication is optional.

### Request body

`{"imageBase64":"<BASE64_IMAGE>","category":"all","subcategory":"","previewOnly":false}`

Required:

- `imageBase64`

Optional:

- `category`
- `subcategory`
- `previewOnly`

### Image processing

The backend uses Google Cloud Vision API with:

- Web Detection
- Label Detection
- Logo Detection

The service extracts:

- Product name
- Brand
- Confidence
- Labels
- Web entities
- Web best guess

### Success response

The response contains:

- `preview`
- `product`
- `detection`
- `prices`
- `storeCategory`
- `storeSubcategory`
- `session`

The detection object includes:

- `product_name`
- `brand`
- `confidence`
- `source`
- `resolved_from_raw`
- `resolve_confidence`
- `labels`
- `web_best_guess`
- `web_entities`
- `price_search_query`

The detection source is `google_vision`.

### Preview mode

When `previewOnly` is true, online price searching and history saving are skipped.

### Error responses

`400 Bad Request` - `imageBase64 is required`

`500 Internal Server Error` - detection failure

The endpoint can also report Google Vision configuration errors, Vision API failures, and oversized image errors.

---

## 5.2 Search Product

`POST /product/search`

Searches for product prices using a product query.

### Request body

`{"query":"Samsung Galaxy"}`

Required:

- `query`

### Success response

`{"query":"Samsung Galaxy","prices":[]}`

### Error responses

`400 Bad Request` - `query is required`

`500 Internal Server Error` - Failed to search product

---

## 5.3 Price Lookup

`POST /product/price-lookup`

Performs a price lookup after a product search or image-preview step.

Authentication is optional.

### Request body

`{"query":"Samsung Galaxy","category":"electronics","subcategory":"","productId":"<PRODUCT_ID>","brand":"Samsung"}`

Required:

- `query`

Optional:

- `category`
- `subcategory`
- `productId`
- `brand`

### Success response

The response contains:

- `query`
- `prices`
- `storeCategory`
- `storeSubcategory`
- `session`

If an authenticated user is available, the search can be saved to history.

---

# 6. Quick Product Search API

## 6.1 Search Products

`GET /products/search`

Searches Google Shopping through the configured SerpAPI integration.

Required query parameter:

- `q`

Optional query parameters:

- `category`
- `subcategory`
- `sort`

Default sort:

`price_asc`

### Example

`GET /products/search?q=Samsung+Galaxy&category=electronics&sort=price_asc`

### Success response

`{"products":[]}`

### Error responses

`400 Bad Request` - Query parameter `q` is required

`503 Service Unavailable` - SerpAPI is not configured

`502 Bad Gateway` - SerpAPI request failed

`500 Internal Server Error` - Unexpected server-side error

---

# 7. Price Comparison

The price comparison service uses a layered approach.

## 7.1 Local Product Data

The backend first checks:

`backend/data/products.json`

If a matching product exists, the stored prices are returned.

Canonical retailers:

- Amazon
- Flipkart
- JioMart
- BigBasket
- Blinkit
- DMart

## 7.2 Online Shopping Search

If the product is not found in the local dataset and SerpAPI is configured, the backend searches Google Shopping.

Shopping results are matched against the canonical retailers and the best available price is selected for each retailer.

## 7.3 Search-Link Fallback

If neither local prices nor usable online prices are available, the backend returns retailer search links.

A fallback result can contain:

`{"platform":"Amazon","price":null,"link":"https://www.amazon.in/..."}`

A `null` price means no price was obtained. The fallback does not fabricate a price.

---

# 8. Store APIs

## 8.1 Find Nearby Stores

`GET /stores/nearby`

Finds stores near a specified geographic location.

Required query parameters:

- `lat`
- `lng`

Optional query parameters:

- `productName`
- `product`
- `category`
- `subcategory`

### Example

`GET /stores/nearby?lat=17.3850&lng=78.4867&productName=Samsung+Galaxy`

### Success response

`{"productName":"Samsung Galaxy","category":"all","stores":[]}`

### Store search behavior

The backend first uses the Maps service.

If no stores are returned and a product keyword is available, it falls back to keyword-based store search.

If `productName` is supplied, the service can attach a price derived from the local product dataset.

These attached nearby-store prices should not be interpreted as guaranteed live store prices.

### Error responses

`400 Bad Request` - `lat and lng are required`

`500 Internal Server Error` - Failed to fetch nearby stores

---

## 8.2 Store Configuration

`GET /stores/config`

Returns the configured Google Maps/Places API key value used by the frontend.

### Success response

`{"mapsApiKey":"<MAPS_API_KEY>"}`

The backend checks:

- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_PLACES_API_KEY`

---

# 9. Health Check

`GET /health`

Checks whether the backend application is responding.

### Success response

`{"status":"ok","service":"snapshop-backend"}`

---

# 10. HTTP Status Codes

| Status | Meaning |
|---|---|
| 200 | Request successful |
| 201 | Resource created |
| 400 | Invalid or missing request data |
| 401 | Authentication required or invalid credentials |
| 404 | Requested resource not found |
| 409 | Resource already exists |
| 413 | Request/image payload too large |
| 500 | Internal server error |
| 502 | External SerpAPI request failure |
| 503 | Required SerpAPI configuration unavailable |

---

# 11. Request Size Limit

The Express JSON parser has a maximum request size of:

`35 MB`

Large image requests may receive:

`413 Payload Too Large`

The backend returns an explanatory JSON message for oversized image payloads.

---

# 12. External Services

The backend integrates with:

- Google Cloud Vision API
- Google Maps/Places services
- SerpAPI / Google Shopping

Required environment configuration depends on the functionality being used.

---

# 13. Backend Route Summary

| Method | Endpoint | Authentication |
|---|---|---|
| GET | `/health` | No |
| POST | `/auth/register` | No |
| POST | `/auth/login` | No |
| GET | `/auth/me` | Required |
| POST | `/product/detect` | Optional |
| POST | `/product/price-lookup` | Optional |
| POST | `/product/search` | No |
| GET | `/products/search` | No |
| GET | `/prices/:product` | No |
| GET | `/stores/nearby` | No |
| GET | `/stores/config` | No |

---

# 14. Notes

- The backend runs on port `4000` by default.
- MongoDB is required for normal backend startup.
- Product detection through `/product/detect` uses Google Cloud Vision.
- The standalone `ai-module` contains a separate YOLOv8 + Tesseract OCR implementation.
- Local product pricing is checked before online shopping search.
- Online shopping results depend on SerpAPI configuration and availability.
- Fallback retailer links may be returned without a price.
- Authentication uses JWT tokens.