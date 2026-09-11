import argparse
import json
import os
from typing import Dict, Any

import cv2

from model_loader import load_model
from ocr_reader import extract_text


def detect_with_yolo(image_path: str) -> Dict[str, Any]:
  model = load_model()
  results = model(image_path)

  if not results:
    return {}

  result = results[0]
  if result.boxes is None or len(result.boxes) == 0:
    return {}

  # Take the highest-confidence box
  boxes = result.boxes
  best_idx = int(boxes.conf.argmax())
  best_conf = float(boxes.conf[best_idx])
  best_cls = int(boxes.cls[best_idx])

  names = result.names or {}
  class_name = names.get(best_cls, "product")

  return {
    "product_name": class_name,
    "brand": "",
    "category": "general",
    "confidence": best_conf,
    "source": "yolo"
  }


def detect_product(image_path: str) -> Dict[str, Any]:
  """
  Try YOLO first. If no confident detection, fall back to OCR.
  """
  yolo_data = {}
  try:
    yolo_data = detect_with_yolo(image_path)
  except Exception as e:
    # YOLO might not be available; ignore and fall back to OCR
    yolo_data = {}

  if yolo_data and yolo_data.get("confidence", 0) >= 0.3:
    return yolo_data

  # Fallback: OCR
  text = extract_text(image_path)
  if not text:
    return {
      "product_name": "Unknown product",
      "brand": "",
      "category": "general",
      "confidence": 0.0,
      "source": "none"
    }

  # Heuristic: pick the longest non-empty line as product name, next as brand
  lines = [line.strip() for line in text.splitlines() if line.strip()]
  product_name = lines[0] if lines else "Unknown product"
  brand = lines[1] if len(lines) > 1 else ""

  return {
    "product_name": product_name[:100],
    "brand": brand[:100],
    "category": "general",
    "confidence": 0.4,
    "source": "ocr"
  }


def main():
  parser = argparse.ArgumentParser(description="Detect product from image using YOLOv8 + OCR fallback.")
  parser.add_argument("--image", required=True, help="Path to input image")
  args = parser.parse_args()

  image_path = args.image
  if not os.path.exists(image_path):
    print(json.dumps({"error": "Image not found"}))
    exit(1)

  data = detect_product(image_path)
  print(json.dumps(data))


if __name__ == "__main__":
  main()

