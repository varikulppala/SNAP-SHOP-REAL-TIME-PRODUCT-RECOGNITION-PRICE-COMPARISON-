# Snap&Shop Architecture

## 1. Overview

Snap&Shop is designed as a product recognition and price comparison application.

The system accepts a product image, analyzes the image, extracts product information, searches for matching products, and presents comparison results to the user.

The application supports both:

- Online product sources
- Offline/local product sources

---

## 2. System Architecture

The main application consists of the following layers:

```text
+----------------------+
|        User          |
+----------+-----------+
           |
           v
+----------------------+
|      Frontend        |
|       Next.js        |
+----------+-----------+
           |
           v
+----------------------+
|       Backend        |
|    Node.js/Express   |
+----------+-----------+
           |
     +-----+------+
     |            |
     v            v
+---------+   +------------------+
| Product |   | Store / Shopping |
|   AI    |   |    Services      |
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
| & Product Matching   |
+----------+-----------+
           |
           v
+----------------------+
| Comparison Results   |
|      Frontend        |
+----------------------+