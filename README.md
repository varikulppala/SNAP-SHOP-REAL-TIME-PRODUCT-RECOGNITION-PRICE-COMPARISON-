# Snap&Shop

## Real-Time Product Recognition & Price Comparison

Snap&Shop is a product recognition and price comparison application that helps users identify products from images, search for matching products, compare available prices, and discover nearby stores.

The application supports both local product data and online shopping services.

---

## Key Features

- Image-based product recognition
- AI-assisted product identification
- Product name and brand detection
- Product information extraction
- Product search
- Local product price lookup
- Online Google Shopping search
- Price comparison across multiple retailers
- Nearby store discovery
- Google Maps/Places integration
- User registration and JWT authentication
- Search history for authenticated users
- Web-based product comparison interface

---

## Technology Stack

### Frontend

- Next.js
- React
- JavaScript
- CSS

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT authentication

### Product Detection

- Google Cloud Vision API
- Web Detection
- Label Detection
- Logo Detection

### Standalone AI Module

The repository also contains a separate Python AI module using:

- YOLOv8
- Tesseract OCR
- OpenCV
- Python
- Ultralytics

### Online Services

- SerpAPI
- Google Shopping
- Google Maps/Places

---

## System Architecture

```text
+----------------------+
|        User          |
+----------+-----------+
           |
           v
+----------------------+
|      Next.js         |
|      Frontend        |
+----------+-----------+
           |
           | REST API
           v
+----------------------+
|    Node.js/Express   |
|       Backend        |
+----------+-----------+
           |
     +-----+------+
     |            |
     v            v
+---------+   +------------------+
| Product |   | Store / Shopping |
|Detection|   |    Services      |
+----+----+   +--------+---------+
     |                 |
     v                 v
+---------+     +----------------+
| Google  |     | Local Product  |
| Vision  |     | Data / SerpAPI |
+---------+     +----------------+
     |                 |
     +-------+---------+
             |
             v
+----------------------+
| Price Comparison     |
| & Product Results    |
+----------+-----------+
           |
           v
+----------------------+
|      Frontend        |
|   Results Interface  |
+----------------------+