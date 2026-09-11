\# Snap\&Shop AI Module



\## 1. Overview



The Snap\&Shop AI module is responsible for analyzing product images and extracting useful product information.



The current implementation uses:



\- YOLOv8 for object detection

\- Tesseract OCR for text extraction

\- OpenCV for image processing

\- Python for AI processing



The module attempts YOLO-based detection first and uses OCR as a fallback when a suitable detection is not available.



\---



\## 2. AI Module Structure



```text

ai-module/

|

+-- detect\_product.py

+-- model\_loader.py

+-- ocr\_reader.py

+-- requirements.txt

+-- dataset/
