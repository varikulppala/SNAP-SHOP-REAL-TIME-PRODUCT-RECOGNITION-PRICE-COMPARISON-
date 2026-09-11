\# Snap\&Shop Architecture



\## 1. Overview



Snap\&Shop is designed as a product recognition and price comparison application.



The system accepts a product image, analyzes the image using the AI module, extracts product information, searches for matching products, and presents comparison results to the user.



The application supports both:



\- Online product sources

\- Offline/local store sources



\---



\## 2. High-Level Architecture



```text

+----------------------+

|        User          |

+----------+-----------+

&#x20;          |

&#x20;          v

+----------------------+

|     Frontend         |

|      Next.js         |

+----------+-----------+

&#x20;          |

&#x20;          v

+----------------------+

|      Backend         |

|       Node.js        |

+----------+-----------+

&#x20;          |

&#x20;    +-----+-----+

&#x20;    |           |

&#x20;    v           v

+---------+  +------------------+

|AI Module|  | Product / Store  |

| Python  |  |     Sources      |

+----+----+  +--------+---------+

&#x20;    |                |

&#x20;    v                |

+---------+           |

|  YOLO   |           |

+----+----+           |

&#x20;    |                |

&#x20;    v                |

+---------+           |

|   OCR   |           |

+----+----+           |

&#x20;    |                |

&#x20;    +-------+--------+

&#x20;            |

&#x20;            v

+----------------------+

| Product Matching \&   |

| Price Comparison     |

+----------+-----------+

&#x20;          |

&#x20;          v

+----------------------+

|      Frontend        |

|  Comparison Results  |

+----------------------+
