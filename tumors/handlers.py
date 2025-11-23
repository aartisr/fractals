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
YOLOV5_DETECT_SCRIPT = "yolov5/detect.py"
YOLOV5_OUTPUT_PATTERN = "yolov5/runs/detect/exp*"

# Model paths for different views
MODEL_PATHS = [
    "tumors/output_models/tumor_detector_axial.pt",
    "tumors/output_models/tumor_detector_coronal.pt",
    "tumors/output_models/tumor_detector_sagittal.pt",
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
    
    # Build detection command
    command = [
        "python",
        YOLOV5_DETECT_SCRIPT,
        "--weights", weights_path,
        "--img", str(DETECTION_IMG_SIZE),
        "--conf", str(DETECTION_CONFIDENCE),
        "--source", temp_input_path,
        "--save-txt"  # Save bounding box annotations
    ]
    
    logger.info(f"Running detection: {' '.join(command)}")
    
    # Run detection
    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=60  # 1 minute timeout
        )
        logger.debug("Detection subprocess completed successfully")
        
    except subprocess.TimeoutExpired:
        QMessageBox.critical(
            self,
            "Detection Timeout",
            "Detection process timed out after 60 seconds.\n"
            "The image may be too large or the system is overloaded."
        )
        logger.error("Detection timed out")
        _cleanup_temp_file(temp_input_path)
        return
        
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr if e.stderr else str(e)
        QMessageBox.critical(
            self,
            "Detection Failed",
            f"Detection process failed:\n\n{error_msg}"
        )
        logger.error(f"Detection subprocess failed: {error_msg}")
        _cleanup_temp_file(temp_input_path)
        return
        
    except Exception as e:
        QMessageBox.critical(
            self,
            "Detection Error",
            f"Unexpected error during detection:\n\n{type(e).__name__}: {e}"
        )
        logger.exception("Unexpected detection error")
        _cleanup_temp_file(temp_input_path)
        return
    
    # Clean up temp file
    _cleanup_temp_file(temp_input_path)
    
    # Find detection output image
    detected_img_path = _find_latest_detection_output()
    
    if detected_img_path and os.path.exists(detected_img_path):
        logger.info(f"Found detection output: {detected_img_path}")
        
        # Load detection result as pixmap
        pixmap = QPixmap(detected_img_path)
        
        if pixmap.isNull():
            logger.error(f"Failed to load detection result: {detected_img_path}")
            _show_detection_failure(self, idx)
            return
        
        # Store detection result
        if not hasattr(self, 'tumor_detected_pixmaps'):
            self.tumor_detected_pixmaps = [None] * NUM_TUMOR_SLOTS
        self.tumor_detected_pixmaps[idx] = pixmap
        
        # Initialize zoom factor for detected image
        _initialize_zoom_factors(self)
        if 'det' not in self.tumor_zoom_factors[idx]:
            self.tumor_zoom_factors[idx]['det'] = 1.0
        
        # Update display
        update_tumor_image_display(self, idx, which='det')
        self.tumor_detected_labels[idx].setText("")
        
        # Store full-resolution result for potential export
        self.tumor_results[idx] = cv2.imread(detected_img_path)
        
        logger.info(f"Detection complete for slot {idx}")
        
    else:
        logger.error("Detection output image not found")
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

