import os
from ultralytics import YOLO


def load_model():
  """
  Loads a YOLOv8 model.

  You can set YOLO_MODEL_PATH in the environment to point to a
  custom product-detection model; otherwise yolov8n.pt is used.
  """
  model_path = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
  model = YOLO(model_path)
  return model

