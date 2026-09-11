import cv2
import pytesseract


def extract_text(image_path):
  """
  Runs Tesseract OCR on the image and returns the raw text.
  """
  image = cv2.imread(image_path)
  if image is None:
    return ""

  gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
  gray = cv2.medianBlur(gray, 3)

  config = "--oem 3 --psm 6"
  text = pytesseract.image_to_string(gray, config=config)
  return text.strip()

