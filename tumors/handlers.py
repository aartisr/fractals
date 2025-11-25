"""
Tumor Detection UI Handlers Module
===================================

Provides event handlers and utility functions for the tumor detection UI.

This module contains all the handler functions for managing tumor detection
workflows, including image loading, display management, zoom controls, and
running YOLOv5-based tumor detection on medical images.

Key Features:
    - Image loading with multi-format support (JPG, PNG, GIF, TIFF, etc.)
    - Zoom controls for detailed image inspection
    - Asynchronous tumor detection using YOLOv5
    - Axial, coronal, and sagittal view support
    - Result visualization and comparison

Author: Aarti S Ravikumar
License: MIT
Version: 2.0.0
"""

from typing import Optional, Tuple, List, Dict, Any
import os
import glob
import tempfile
import subprocess
import logging
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from PyQt6.QtWidgets import QFileDialog, QMessageBox
from PyQt6.QtGui import QImage, QPixmap
from PyQt6.QtCore import Qt

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================

logger = logging.getLogger(__name__)


# ============================================================================
# CONSTANTS
# ============================================================================

# Image display settings
DEFAULT_THUMBNAIL_SIZE = 200  # pixels
MIN_ZOOM_FACTOR = 0.1
MAX_ZOOM_FACTOR = 10.0
ZOOM_STEP = 1.2  # 20% zoom in/out per step

# Supported image formats
SUPPORTED_IMAGE_FORMATS = (
    "*.png", "*.jpg", "*.jpeg", "*.bmp", 
    "*.tif", "*.tiff", "*.gif"
)
IMAGE_FILTER = f"Images ({' '.join(SUPPORTED_IMAGE_FORMATS)})"

# Detection settings
DETECTION_IMG_SIZE = 640
DETECTION_CONFIDENCE = 0.4
# Use yolov5 PyPI package API
YOLOV5_OUTPUT_PATTERN = "runs/detect/exp*"

# Model paths for different views (ONNX)
MODEL_PATHS = [
    "tumors/output_models/tumor_detector_axial.onnx",
    "tumors/output_models/tumor_detector_coronal.onnx",
    "tumors/output_models/tumor_detector_sagittal.onnx",
]

# View names for logging/display
VIEW_NAMES = ["Axial", "Coronal", "Sagittal"]

# Number of tumor image slots in UI
NUM_TUMOR_SLOTS = 3


# ============================================================================
# IMAGE LOADING HANDLERS
# ============================================================================

def handle_tumor_image_double_click(self, idx: int) -> None:
    """
    Handle double-click event on tumor image slot to load a new image.
    
    Opens a file dialog for the user to select a medical image, loads it,
    creates a thumbnail, and prepares the slot for tumor detection.
    
    Args:
        self: UI window instance containing tumor image widgets
        idx: Index of the image slot (0=Axial, 1=Coronal, 2=Sagittal)
    
    Side Effects:
        - Updates self.tumor_images[idx] with the loaded image
        - Updates self.tumor_orig_pixmaps[idx] with thumbnail
        - Updates self.tumor_orig_labels[idx] display
        - Enables detection button for this slot
        - Initializes zoom factors if needed
    
    Validation:
        - Checks if file was selected
        - Validates image can be loaded
        - Handles various image formats including GIF
        - Shows warning dialog on errors
    """
    logger.info(f"Image slot {idx} ({VIEW_NAMES[idx]}) double-clicked")
    
    # Initialize zoom factors data structure if needed
    _initialize_zoom_factors(self)
    
    # Get default directory for medical images
    default_dir = _get_default_tumor_images_dir()
    
    # Open file dialog
    fname, _ = QFileDialog.getOpenFileName(
        self,
        f"Select {VIEW_NAMES[idx]} View Image",
        default_dir,
        IMAGE_FILTER,
    )
    
    if not fname:
        logger.debug("No file selected")
        return
    
    # Load the image
    img = _load_image(fname)
    if img is None:
        QMessageBox.warning(
            self,
            "Image Load Error",
            f"Failed to load image: {fname}\n\n"
            f"Ensure the file is a valid image format and not corrupted."
        )
        return
    
    logger.info(f"Loaded image: {fname} (shape: {img.shape})")
    
    # Create thumbnail for display
    thumbnail_pixmap = _create_thumbnail(img, DEFAULT_THUMBNAIL_SIZE)
    
    # Store the full-resolution image and thumbnail
    self.tumor_images[idx] = img
    
    if not hasattr(self, 'tumor_orig_pixmaps'):
        self.tumor_orig_pixmaps = [None] * NUM_TUMOR_SLOTS
    self.tumor_orig_pixmaps[idx] = thumbnail_pixmap
    
    # Update display
    update_tumor_image_display(self, idx, which='orig')
    self.tumor_orig_labels[idx].setText("")
    
    # Enable detection button now that image is loaded
    self.tumor_detect_buttons[idx].setEnabled(True)
    
    logger.debug(f"Image loaded successfully in slot {idx}")


# ============================================================================
# IMAGE DISPLAY MANAGEMENT
# ============================================================================

def update_tumor_image_display(self, idx: int, which: str = 'orig') -> None:
    """
    Update the display of a tumor image with current zoom factor applied.
    
    Applies the current zoom level to the stored pixmap and updates the
    corresponding label widget. Maintains aspect ratio during scaling.
    
    Args:
        self: UI window instance
        idx: Image slot index (0-2)
        which: Which image to update:
            - 'orig': Original uploaded image
            - 'det': Detected/processed image
    
    Side Effects:
        - Updates the pixmap displayed in the label widget
        - Clears label text if pixmap exists
    
    Zoom Handling:
        - Reads zoom factor from self.tumor_zoom_factors[idx][which]
        - Scales pixmap dimensions by zoom factor
        - Maintains aspect ratio
        - Uses smooth transformation for quality
    
    Note:
        Does nothing if zoom factors aren't initialized or pixmap is None
    """
    # Validate zoom factors exist
    if not hasattr(self, 'tumor_zoom_factors'):
        logger.warning("Zoom factors not initialized")
        return
    
    # Get current zoom factor
    zoom = self.tumor_zoom_factors[idx].get(which, 1.0)
    
    # Get appropriate pixmap and label based on which image
    if which == 'orig':
        pixmap = getattr(self, 'tumor_orig_pixmaps', [None] * NUM_TUMOR_SLOTS)[idx]
        label = self.tumor_orig_labels[idx]
    else:  # 'det'
        pixmap = getattr(self, 'tumor_detected_pixmaps', [None] * NUM_TUMOR_SLOTS)[idx]
        label = self.tumor_detected_labels[idx]
    
    # Update display if pixmap exists
    if pixmap and not pixmap.isNull():
        # Calculate scaled dimensions
        target_w = int(label.width() * zoom)
        target_h = int(label.height() * zoom)
        
        # Scale pixmap
        scaled_pixmap = pixmap.scaled(
            target_w,
            target_h,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation
        )
        
        # Update label
        label.setPixmap(scaled_pixmap)
        label.setText("")
        
        logger.debug(
            f"Updated {which} display for slot {idx}: "
            f"zoom={zoom:.2f}, size={target_w}x{target_h}"
        )
    else:
        # No pixmap available
        label.setText("")


# ============================================================================
# ZOOM CONTROLS
# ============================================================================

def zoom_tumor_image(
    self,
    idx: int,
    which: str,
    direction: str,
    pixmap: Optional[QPixmap] = None
) -> None:
    """
    Zoom in, out, or reset on a tumor image.
    
    Provides zoom controls for detailed inspection of medical images.
    Supports zoom in (1.2x), zoom out (0.83x), and reset (1.0x).
    
    Args:
        self: UI window instance
        idx: Image slot index (0-2)
        which: Which image to zoom:
            - 'orig': Original uploaded image
            - 'det': Detected/processed image
        direction: Zoom direction:
            - 'in': Zoom in by ZOOM_STEP (1.2x)
            - 'out': Zoom out by 1/ZOOM_STEP (0.83x)
            - 'reset': Reset to original size (1.0x)
        pixmap: Optional pixmap to restore on reset
            - If provided during reset, replaces current pixmap
            - Useful for refreshing the display
    
    Side Effects:
        - Updates self.tumor_zoom_factors[idx][which]
        - Triggers display refresh via update_tumor_image_display
        - On reset with pixmap, directly updates label
    
    Constraints:
        - Minimum zoom: MIN_ZOOM_FACTOR (0.1x)
        - Maximum zoom: MAX_ZOOM_FACTOR (10.0x)
        - Zoom factors are clamped to this range
    
    Example:
        >>> zoom_tumor_image(self, 0, 'orig', 'in')  # Zoom in on axial original
        >>> zoom_tumor_image(self, 1, 'det', 'out')  # Zoom out on coronal detection
        >>> zoom_tumor_image(self, 2, 'orig', 'reset')  # Reset sagittal view
    """
    # Initialize zoom factors if needed
    _initialize_zoom_factors(self)
    
    # Handle reset specially
    if direction == 'reset':
        self.tumor_zoom_factors[idx][which] = 1.0
        
        # Get appropriate label
        label = (self.tumor_orig_labels[idx] if which == 'orig' 
                else self.tumor_detected_labels[idx])
        
        if pixmap is not None:
            # Restore provided pixmap
            label.setPixmap(pixmap.scaled(
                label.size(),
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation
            ))
            label.setText("")
            logger.debug(f"Reset {which} zoom for slot {idx} with new pixmap")
        else:
            # Just refresh display
            update_tumor_image_display(self, idx, which)
            logger.debug(f"Reset {which} zoom for slot {idx}")
        return
    
    # Get current zoom factor
    factor = self.tumor_zoom_factors[idx].get(which, 1.0)
    
    # Apply zoom change
    if direction == 'in':
        factor *= ZOOM_STEP
    elif direction == 'out':
        factor /= ZOOM_STEP
    else:
        logger.warning(f"Unknown zoom direction: {direction}")
        return
    
    # Clamp to valid range
    factor = max(MIN_ZOOM_FACTOR, min(factor, MAX_ZOOM_FACTOR))
    
    # Store and apply
    self.tumor_zoom_factors[idx][which] = factor
    update_tumor_image_display(self, idx, which)
    
    logger.debug(f"Zoomed {direction} on {which} slot {idx}: factor={factor:.2f}")


# ============================================================================
# TUMOR DETECTION
# ============================================================================

def run_tumor_detection(self, idx: int) -> None:
    """
    Run YOLOv5 tumor detection on the loaded image.
    
    Executes the tumor detection pipeline:
        1. Validates image is loaded
        2. Saves image to temporary file
        3. Runs YOLOv5 detection with appropriate model
        4. Finds and loads the detection result
        5. Updates UI with detected image
    
    Args:
        self: UI window instance
        idx: Image slot index (0=Axial, 1=Coronal, 2=Sagittal)
    
    Side Effects:
        - Creates temporary file for input image
        - Runs subprocess (YOLOv5 detect.py)
        - Updates self.tumor_detected_pixmaps[idx]
        - Updates self.tumor_detected_labels[idx]
        - Updates self.tumor_results[idx] with detection result
        - Shows error dialogs on failure
    
    Detection Parameters:
        - Model: Specific to view (axial/coronal/sagittal)
        - Image size: DETECTION_IMG_SIZE (640)
        - Confidence threshold: DETECTION_CONFIDENCE (0.4)
        - Saves bounding box annotations
    
    Error Handling:
        - Checks if image is loaded
        - Validates model file exists
        - Catches subprocess errors
        - Handles missing detection output
        - Shows appropriate error messages
    
    Output:
        Detection results are saved to yolov5/runs/detect/exp*
        The most recently modified image is loaded as the result
    """
    logger.info(f"Starting tumor detection for {VIEW_NAMES[idx]} view (slot {idx})")
    
    # Validate image is loaded
    img = self.tumor_images[idx]
    if img is None:
        QMessageBox.warning(
            self,
            "No Image Loaded",
            f"Please load a {VIEW_NAMES[idx]} view image before running detection."
        )
        logger.warning(f"Detection aborted: no image in slot {idx}")
        return
    
    # Get model path for this view
    weights_path = MODEL_PATHS[idx]
    
    # Validate model exists
    if not os.path.exists(weights_path):
        QMessageBox.critical(
            self,
            "Model Not Found",
            f"Detection model not found: {weights_path}\n\n"
            f"Please ensure the model files are in the correct location."
        )
        logger.error(f"Model file missing: {weights_path}")
        return
    
    # Save input image to temporary file
    temp_input_path = _save_temp_image(img)
    if temp_input_path is None:
        QMessageBox.critical(
            self,
            "File Error",
            "Failed to create temporary file for detection input."
        )
        return
    
    logger.debug(f"Saved temp input image: {temp_input_path}")
    
    # Run detection using ONNX Runtime
    try:
        import onnxruntime as ort
        logger.info(f"Running detection using ONNX Runtime: weights={weights_path}, img={DETECTION_IMG_SIZE}, conf={DETECTION_CONFIDENCE}, source={temp_input_path}")
        # Load ONNX model
        session = ort.InferenceSession(weights_path, providers=["CPUExecutionProvider"])
        # Preprocess image
        img0 = cv2.imread(temp_input_path)
        if img0 is None:
            raise RuntimeError(f"Failed to load temp image for ONNX inference: {temp_input_path}")
        img = cv2.cvtColor(img0, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (DETECTION_IMG_SIZE, DETECTION_IMG_SIZE))
        img = img.astype(np.float32) / 255.0
        img = np.transpose(img, (2, 0, 1))  # HWC to CHW
        img = np.expand_dims(img, axis=0)  # Add batch dim
        # Some ONNX models expect NCHW, float32
        # Get input name
        input_name = session.get_inputs()[0].name
        # Run inference
        outputs = session.run(None, {input_name: img})
        # Postprocess: outputs[0] is usually (N, num_boxes, 85) for YOLOv5
        pred = outputs[0]
        # Only keep boxes with confidence > DETECTION_CONFIDENCE
        boxes = []
        scores = []
        classes = []
        for det in pred[0]:
            # YOLOv5 ONNX: [x1, y1, x2, y2, conf, cls1, cls2, ...]
            conf = det[4]
            if conf < DETECTION_CONFIDENCE:
                continue
            class_id = int(np.argmax(det[5:]))
            boxes.append(det[:4])
            scores.append(conf)
            classes.append(class_id)
        def nms(boxes, scores, iou_threshold=0.5):
            boxes = np.array(boxes)
            scores = np.array(scores)
            x1 = boxes[:, 0]
            y1 = boxes[:, 1]
            x2 = boxes[:, 2]
            y2 = boxes[:, 3]
            areas = (x2 - x1 + 1) * (y2 - y1 + 1)
            order = scores.argsort()[::-1]
            keep = []
            while order.size > 0:
                i = order[0]
                keep.append(i)
                xx1 = np.maximum(x1[i], x1[order[1:]])
                yy1 = np.maximum(y1[i], y1[order[1:]])
                xx2 = np.minimum(x2[i], x2[order[1:]])
                yy2 = np.minimum(y2[i], y2[order[1:]])
                w = np.maximum(0.0, xx2 - xx1 + 1)
                h = np.maximum(0.0, yy2 - yy1 + 1)
                inter = w * h
                ovr = inter / (areas[i] + areas[order[1:]] - inter)
                inds = np.where(ovr <= iou_threshold)[0]
                order = order[inds + 1]
            return keep

        # Letterbox-aware scaling: map boxes from 640x640 model input to original image size
        img_draw = img0.copy()
        h0, w0 = img0.shape[:2]
        r = min(DETECTION_IMG_SIZE / w0, DETECTION_IMG_SIZE / h0)
        new_unpad = (int(round(w0 * r)), int(round(h0 * r)))
        dw = DETECTION_IMG_SIZE - new_unpad[0]
        dh = DETECTION_IMG_SIZE - new_unpad[1]
        dw /= 2
        dh /= 2
        # Convert all boxes to original image coordinates first
        final_boxes = []
        final_scores = []
        final_classes = []
        for box, score, class_id in zip(boxes, scores, classes):
            if score < 0.5:
                continue
            x1, y1, x2, y2 = box
            # YOLO format to corner
            if (x2 < x1 or y2 < y1):
                cx, cy, w, h = x1, y1, x2, y2
                x1 = cx - w / 2
                y1 = cy - h / 2
                x2 = cx + w / 2
                y2 = cy + h / 2
            # Normalized to 640
            if max(x1, y1, x2, y2) <= 1.0:
                x1 *= DETECTION_IMG_SIZE
                y1 *= DETECTION_IMG_SIZE
                x2 *= DETECTION_IMG_SIZE
                y2 *= DETECTION_IMG_SIZE
            # Letterbox reverse
            x1 = (x1 - dw) / r
            y1 = (y1 - dh) / r
            x2 = (x2 - dw) / r
            y2 = (y2 - dh) / r
            # Clip
            x1 = max(min(x1, w0 - 1), 0)
            y1 = max(min(y1, h0 - 1), 0)
            x2 = max(min(x2, w0 - 1), 0)
            y2 = max(min(y2, h0 - 1), 0)
            # Filter invalid boxes
            if (x2 - x1) > 1 and (y2 - y1) > 1:
                final_boxes.append([x1, y1, x2, y2])
                final_scores.append(score)
                final_classes.append(class_id)
        # Apply NMS on final boxes
        if final_boxes:
            nms_indices = nms(final_boxes, final_scores, iou_threshold=0.3)
            for i in nms_indices:
                x1, y1, x2, y2 = map(int, final_boxes[i])
                score = final_scores[i]
                class_id = final_classes[i]
                cv2.rectangle(img_draw, (x1, y1), (x2, y2), (0, 255, 0), 2)
                label = f"Tumor {score:.2f}"
                cv2.putText(img_draw, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            # Detect if box is in YOLO format (center x, center y, width, height)
            # or corner format (x1, y1, x2, y2)
            # Heuristic: if x2 > x1 and y2 > y1, assume corner; else, convert
            x1, y1, x2, y2 = box
            logger.debug(f"Raw box: {box}")
            # If box is YOLO format (center x, center y, w, h):
            if (x2 < x1 or y2 < y1):
                logger.debug("Box appears to be YOLO format, converting to corner format.")
                cx, cy, w, h = x1, y1, x2, y2
                x1 = cx - w / 2
                y1 = cy - h / 2
                x2 = cx + w / 2
                y2 = cy + h / 2
                logger.debug(f"Converted to corner: {(x1, y1, x2, y2)}")
            # If coordinates are normalized (0-1), scale to 640
            if max(x1, y1, x2, y2) <= 1.0:
                x1 *= DETECTION_IMG_SIZE
                y1 *= DETECTION_IMG_SIZE
                x2 *= DETECTION_IMG_SIZE
                y2 *= DETECTION_IMG_SIZE
                logger.debug(f"Box scaled from normalized: {(x1, y1, x2, y2)}")
            # Remove padding, then rescale to original image size
            x1 = (x1 - dw) / r
            y1 = (y1 - dh) / r
            x2 = (x2 - dw) / r
            y2 = (y2 - dh) / r
            logger.debug(f"Box after letterbox reverse: {(x1, y1, x2, y2)}")
            # Clip to image size
            x1 = int(max(min(x1, w0 - 1), 0))
            y1 = int(max(min(y1, h0 - 1), 0))
            x2 = int(max(min(x2, w0 - 1), 0))
            y2 = int(max(min(y2, h0 - 1), 0))
            logger.debug(f"Box after clipping: {(x1, y1, x2, y2)}")
            cv2.rectangle(img_draw, (x1, y1), (x2, y2), (0, 255, 0), 2)
            label = f"Tumor {score:.2f}"
            cv2.putText(img_draw, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        # Save result image to temp file
        result_temp = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
        cv2.imwrite(result_temp.name, img_draw)
        result_temp.close()
        detected_img_path = result_temp.name
        logger.info(f"Detection result saved to: {detected_img_path}")
    except Exception as e:
        QMessageBox.critical(
            self,
            "Detection Failed",
            f"Detection process failed (ONNX):\n\n{str(e)}"
        )
        logger.error(f"Detection failed (ONNX): {e}")
        _cleanup_temp_file(temp_input_path)
        return
    # Clean up temp file
    _cleanup_temp_file(temp_input_path)
    # Load detection result as pixmap
    if detected_img_path and os.path.exists(detected_img_path):
        pixmap = QPixmap(detected_img_path)
        if pixmap.isNull():
            logger.error(f"Failed to load detection result: {detected_img_path}")
            _show_detection_failure(self, idx)
            return
        if not hasattr(self, 'tumor_detected_pixmaps'):
            self.tumor_detected_pixmaps = [None] * NUM_TUMOR_SLOTS
        self.tumor_detected_pixmaps[idx] = pixmap
        _initialize_zoom_factors(self)
        if 'det' not in self.tumor_zoom_factors[idx]:
            self.tumor_zoom_factors[idx]['det'] = 1.0
        update_tumor_image_display(self, idx, which='det')
        self.tumor_detected_labels[idx].setText("")
        self.tumor_results[idx] = cv2.imread(detected_img_path)
        logger.info(f"Detection complete for slot {idx}")
    else:
        logger.error("Detection output image not found (ONNX)")
        _show_detection_failure(self, idx)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _initialize_zoom_factors(self) -> None:
    """
    Initialize zoom factors data structure if not present.
    
    Creates self.tumor_zoom_factors as a list of 3 dicts,
    each containing 'orig' and 'det' zoom values (default 1.0).
    
    Args:
        self: UI window instance
    
    Side Effects:
        Creates self.tumor_zoom_factors if it doesn't exist
    """
    if not hasattr(self, 'tumor_zoom_factors'):
        self.tumor_zoom_factors = [
            {'orig': 1.0, 'det': 1.0} 
            for _ in range(NUM_TUMOR_SLOTS)
        ]
        logger.debug("Initialized zoom factors")
    else:
        # Ensure all slots and keys exist
        for idx in range(NUM_TUMOR_SLOTS):
            if idx >= len(self.tumor_zoom_factors):
                self.tumor_zoom_factors.append({'orig': 1.0, 'det': 1.0})
            if 'orig' not in self.tumor_zoom_factors[idx]:
                self.tumor_zoom_factors[idx]['orig'] = 1.0
            if 'det' not in self.tumor_zoom_factors[idx]:
                self.tumor_zoom_factors[idx]['det'] = 1.0


def _get_default_tumor_images_dir() -> str:
    """
    Get the default directory for tumor images.
    
    Returns:
        Absolute path to tumors/originals directory
    """
    current_dir = os.path.dirname(__file__)
    default_dir = os.path.abspath(
        os.path.join(current_dir, '../tumors/originals')
    )
    return default_dir


def _load_image(filepath: str) -> Optional[np.ndarray]:
    """
    Load an image from file with format auto-detection.
    
    Handles various image formats including GIF (converts to RGB).
    Returns image in RGB color space as NumPy array.
    
    Args:
        filepath: Path to image file
    
    Returns:
        NumPy array (H x W x 3) in RGB format, or None on error
    
    Supported Formats:
        - Standard: JPG, PNG, BMP, TIFF
        - Special: GIF (converted from palette to RGB)
    """
    try:
        ext = filepath.lower().split(".")[-1]
        
        if ext == "gif":
            # Handle GIF specially (may have palette)
            pil_img = Image.open(filepath)
            pil_img = pil_img.convert("RGB")
            img = np.array(pil_img)
            logger.debug(f"Loaded GIF image: {filepath}")
        else:
            # Use OpenCV for standard formats
            img = cv2.imread(filepath)
            if img is None:
                logger.error(f"cv2.imread returned None for: {filepath}")
                return None
            # Convert BGR to RGB
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            logger.debug(f"Loaded image via OpenCV: {filepath}")
        
        return img
        
    except Exception as e:
        logger.exception(f"Failed to load image {filepath}: {e}")
        return None


def _create_thumbnail(
    img: np.ndarray,
    max_size: int = DEFAULT_THUMBNAIL_SIZE
) -> QPixmap:
    """
    Create a thumbnail pixmap from a NumPy image array.
    
    Scales the image to fit within max_size x max_size while
    maintaining aspect ratio.
    
    Args:
        img: NumPy array (H x W x 3) in RGB format
        max_size: Maximum dimension for thumbnail (default: 200)
    
    Returns:
        QPixmap containing the thumbnail
    
    Scaling:
        - Maintains aspect ratio
        - Uses INTER_AREA for downsampling (best quality)
        - Fits within max_size x max_size bounding box
    """
    h, w = img.shape[:2]
    
    # Calculate scaling factor to fit in max_size
    scale = min(max_size / h, max_size / w)
    new_size = (int(w * scale), int(h * scale))
    
    # Resize image
    img_resized = cv2.resize(img, new_size, interpolation=cv2.INTER_AREA)
    
    # Convert to QPixmap
    qimg = QImage(
        img_resized.data,
        img_resized.shape[1],
        img_resized.shape[0],
        img_resized.strides[0],
        QImage.Format.Format_RGB888,
    )
    pixmap = QPixmap.fromImage(qimg)
    
    logger.debug(f"Created thumbnail: {w}x{h} -> {new_size[0]}x{new_size[1]}")
    
    return pixmap


def _save_temp_image(img: np.ndarray) -> Optional[str]:
    """
    Save a NumPy image to a temporary file for detection.
    
    Args:
        img: NumPy array (H x W x 3) in RGB format
    
    Returns:
        Path to temporary file, or None on error
    
    Note:
        Caller is responsible for cleanup using _cleanup_temp_file
    """
    try:
        temp_file = tempfile.NamedTemporaryFile(
            suffix='.jpg',
            delete=False
        )
        
        # Convert RGB to BGR for OpenCV
        img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        
        # Write image
        success = cv2.imwrite(temp_file.name, img_bgr)
        temp_file.close()
        
        if not success:
            logger.error("cv2.imwrite failed")
            os.unlink(temp_file.name)
            return None
        
        return temp_file.name
        
    except Exception as e:
        logger.exception(f"Failed to save temp image: {e}")
        return None


def _cleanup_temp_file(filepath: str) -> None:
    """
    Safely delete a temporary file.
    
    Args:
        filepath: Path to file to delete
    """
    try:
        if filepath and os.path.exists(filepath):
            os.unlink(filepath)
            logger.debug(f"Cleaned up temp file: {filepath}")
    except Exception as e:
        logger.warning(f"Failed to cleanup temp file {filepath}: {e}")


def _find_latest_detection_output() -> Optional[str]:
    """
    Find the most recently created detection output image.
    
    Searches yolov5/runs/detect/exp* directories for the latest
    image file based on modification time.
    
    Returns:
        Path to latest detection output image, or None if not found
    
    Search Strategy:
        - Looks in all exp* directories
        - Checks all supported image formats
        - Returns most recently modified file
    """
    try:
        output_dirs = glob.glob(YOLOV5_OUTPUT_PATTERN)
        
        if not output_dirs:
            logger.warning("No detection output directories found")
            return None
        
        latest_img = None
        latest_time = 0
        
        for directory in output_dirs:
            for pattern in SUPPORTED_IMAGE_FORMATS:
                files = glob.glob(os.path.join(directory, pattern))
                
                for filepath in files:
                    try:
                        mtime = os.path.getmtime(filepath)
                        if mtime > latest_time:
                            latest_time = mtime
                            latest_img = filepath
                    except OSError:
                        continue
        
        if latest_img:
            logger.debug(f"Found latest detection output: {latest_img}")
        else:
            logger.warning("No detection output images found")
        
        return latest_img
        
    except Exception as e:
        logger.exception(f"Error finding detection output: {e}")
        return None


def _show_detection_failure(self, idx: int) -> None:
    """
    Update UI to show detection failure.
    
    Args:
        self: UI window instance
        idx: Image slot index
    """
    self.tumor_detected_labels[idx].setText(
        "Detection failed or output not found.\n"
        "Check console for errors."
    )
    logger.error(f"Detection failed for slot {idx}")


# ============================================================================
# MODULE EXPORTS
# ============================================================================

__all__ = [
    'handle_tumor_image_double_click',
    'update_tumor_image_display',
    'zoom_tumor_image',
    'run_tumor_detection',
]

