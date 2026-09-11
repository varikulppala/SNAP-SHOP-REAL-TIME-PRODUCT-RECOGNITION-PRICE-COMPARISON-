# Custom YOLOv8 product dataset (for 100% recognition)

The app currently uses the **default YOLOv8 model** (`yolov8n.pt`) trained on generic objects (bottle, cup, etc.), so it does **not** recognize your 30 products by name. To get **product-level recognition** (e.g. “Coca-Cola 500ml”, “Parle-G Biscuits”), you need a **trained dataset** and a custom model.

## What you need

1. **Images** of each of the 30 products (front of pack, multiple angles/lighting).
2. **Labels** in YOLO format: one `.txt` per image with lines `class_id x_center y_center width height` (normalized 0–1).
3. **Train/val split** and a `data.yaml` so YOLOv8 can train.

## Folder structure

Use this layout (already created under `ai-module/dataset/`):

```text
dataset/
  classes.txt          # One product name per line (index = class_id)
  data.yaml            # Dataset config (path, train/val, class names)
  train/
    images/            # Put training images here (.jpg)
    labels/            # Put training labels here (.txt, same base name as image)
  val/
    images/            # Validation images
    labels/            # Validation labels
```

- **classes.txt**: Class index 0 = first line, 1 = second line, … 29 = last line. Already filled with your 30 products.
- **data.yaml**: Paths to `train/images`, `val/images`, and the list of class names. Create it as below.

## 1. Create `data.yaml`

Create `dataset/data.yaml` with (adjust `path` if you run training from another directory):

```yaml
path: .   # or absolute path to dataset folder
train: train/images
val: val/images

names:
  0: Red Bull 250ml
  1: Coca-Cola 500ml
  2: "Lay's Classic Salted 100g"
  # ... (all 30 from classes.txt, index 0-29)
```

Or generate the `names` block from `classes.txt` (line number = index).

## 2. Collect images

- For each product, take **at least 30–50 photos** (different angles, lighting, background).
- Put training images in `train/images/` and use ~20% in `val/images/`.
- Supported formats: `.jpg`, `.png`.

## 3. Annotate (create labels)

Each image needs a `.txt` file in `train/labels/` or `val/labels/` with the **same base name** as the image.

Format: one line per object:

```text
class_id x_center y_center width height
```

All values **normalized** (0–1) relative to image width/height.

- **class_id**: 0–29, matching the line number in `classes.txt`.
- **x_center, y_center**: center of the bounding box.
- **width, height**: box width and height.

You can use [Roboflow](https://roboflow.com/), [LabelImg](https://github.com/HumanSignal/labelImg), or [CVAT](https://www.cvat.ai/) to draw boxes and export YOLO format.

## 4. Train the model

From the `ai-module` folder (with `ultralytics` installed):

```bash
cd ai-module
yolo detect train data=dataset/data.yaml model=yolov8n.pt epochs=50 imgsz=640
```

This will produce a custom model (e.g. `runs/detect/train/weights/best.pt`).

## 5. Use the custom model in the app

1. Copy the best weights to the project, e.g.:
   ```bash
   cp runs/detect/train/weights/best.pt ai-module/product_model.pt
   ```
2. Point the backend to the custom model:
   - In `backend/.env` set:
     ```bash
     YOLO_MODEL_PATH=/absolute/path/to/snapshop/ai-module/product_model.pt
     ```
   - Or set the same in the Python process env when the backend runs the AI script.
3. Update the AI module to load this model:
   - In `ai-module/model_loader.py`, `YOLO_MODEL_PATH` is already supported; ensure the script is started with that env set (e.g. by the Node backend when it spawns the Python process, or in a wrapper script).

After that, detection will output **class indices 0–29**, which you must map back to product names using `classes.txt` (or the same list in the backend). The backend’s **product resolver** can then match those names to your 30 products for prices.

## Quick summary

| Step | Action |
|------|--------|
| 1 | Create `data.yaml` with paths and 30 class names (see `classes.txt`). |
| 2 | Collect 30–50 images per product; put in `train/images` and `val/images`. |
| 3 | Annotate bounding boxes in YOLO format; put `.txt` in `train/labels` and `val/labels`. |
| 4 | Run `yolo detect train data=dataset/data.yaml model=yolov8n.pt epochs=50`. |
| 5 | Use `best.pt` as `YOLO_MODEL_PATH` and map class IDs to product names in the app. |

With this trained dataset and custom model, the app can recognize your 30 products directly from the image instead of relying only on generic YOLO classes + OCR.
