"""
Box Counter Helpers Module

This module provides utility functions for the box counter tab interface.

Author: Aarti S Ravikumar
It handles image loading, ROI selection, display updates, and fractal dimension calculations.

The BoxCounterHelpers class contains static methods for:
- Image file selection and loading (including GIF support)
- ROI size validation
- Display updates with ROI visualization
- Fractal dimension computation for selected regions
"""

from typing import Optional, Tuple

import cv2
import numpy as np
from PIL import Image
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QImage, QPixmap
from PyQt6.QtWidgets import QFileDialog, QMessageBox

from boxcounting.box_counter_utils import BoxCounterUtils


# ============================================================================
# CONSTANTS
# ============================================================================

# Supported image formats
SUPPORTED_IMAGE_FORMATS = "Images (*.png *.jpg *.jpeg *.bmp *.tif *.tiff *.gif)"

# Display colors (BGR format for OpenCV)
COLOR_ROI_RECT = (255, 255, 255)  # White
COLOR_TEXT = (255, 255, 255)  # White

# Display settings
ROI_RECT_THICKNESS = 2
TEXT_THICKNESS_BOLD = 2
TEXT_THICKNESS_NORMAL = 1
TEXT_FONT = cv2.FONT_HERSHEY_SIMPLEX
TEXT_SIZE_LARGE = 0.6
TEXT_SIZE_SMALL = 0.5

# Text positioning offsets
TEXT_OFFSET_X = 5
TEXT_OFFSET_Y_LINE1 = 20
TEXT_OFFSET_Y_LINE2 = 45

# Error messages
ERROR_INVALID_ROI = "ROI size must be a positive integer."
ERROR_ROI_OUT_OF_BOUNDS = "ROI out of bounds."
ERROR_IMAGE_LOAD_FAILED = "Failed to load image.\n{}"

# Dialog titles
DIALOG_TITLE_SELECT_IMAGE = "Select Image"
DIALOG_TITLE_BOX_COUNTER = "Box Counter"

# Display text
DISPLAY_NO_IMAGE = "No image"


# ============================================================================
# BOX COUNTER HELPERS CLASS
# ============================================================================

class BoxCounterHelpers:
    """
    Utility class providing helper methods for box counter functionality.
    
    This class contains static methods for:
    - Loading and validating images
    - Managing ROI (Region of Interest) selection
    - Updating visual displays with ROI overlays
    - Computing fractal dimensions for selected regions
    
    All methods are stateless and operate on parent widget state.
    """

    # ========================================================================
    # IMAGE LOADING
    # ========================================================================

    @staticmethod
    def select_image(parent) -> Optional[Tuple[np.ndarray, str]]:
        """
        Open file dialog to select and load an image.
        
        Supports various image formats including GIF (converted to grayscale).
        Uses OpenCV for standard formats and PIL for GIF files.
        
        Args:
            parent: Parent widget for dialog positioning and error messages
            
        Returns:
            Tuple of (image_array, file_path) if successful, None if cancelled or failed.
            Image array is in grayscale format as numpy array.
            
        Notes:
            - Standard formats (PNG, JPG, etc.) loaded via cv2.imread
            - GIF files loaded via PIL and converted to grayscale
            - Shows warning message if image loading fails
        """
        # Open file selection dialog
        from ui import get_images_folder_path
        default_dir = get_images_folder_path()
        file_path, _ = QFileDialog.getOpenFileName(
            parent,
            DIALOG_TITLE_SELECT_IMAGE,
            default_dir,
            SUPPORTED_IMAGE_FORMATS,
        )
        
        if not file_path:
            return None
        
        # Try loading with OpenCV first (most formats)
        img = cv2.imread(file_path, cv2.IMREAD_GRAYSCALE)
        
        if img is None:
            # Fallback to PIL for GIF and other formats
            img = BoxCounterHelpers._load_image_with_pil(parent, file_path)
            if img is None:
                return None
        
        return img, file_path

    @staticmethod
    def _load_image_with_pil(parent, file_path: str) -> Optional[np.ndarray]:
        """
        Load image using PIL (fallback for GIF and unsupported formats).
        
        Args:
            parent: Parent widget for error messages
            file_path: Path to image file
            
        Returns:
            Numpy array in grayscale if successful, None otherwise
        """
        try:
            pil_img = Image.open(file_path)
            pil_img = pil_img.convert("L")  # Convert to grayscale
            return np.array(pil_img)
        except Exception as e:
            QMessageBox.warning(
                parent,
                DIALOG_TITLE_BOX_COUNTER,
                ERROR_IMAGE_LOAD_FAILED.format(e)
            )
            return None

    # ========================================================================
    # ROI VALIDATION
    # ========================================================================

    @staticmethod
    def apply_roi_size(parent, roi_text: str) -> Optional[int]:
        """
        Validate and parse ROI size from text input.
        
        Args:
            parent: Parent widget for error messages
            roi_text: Text input containing ROI size
            
        Returns:
            Validated ROI size as integer if valid, None otherwise
            
        Notes:
            - ROI size must be a positive integer
            - Shows warning message if validation fails
        """
        try:
            roi_size = int(roi_text)
            if roi_size <= 0:
                raise ValueError("ROI size must be positive")
        except ValueError:
            QMessageBox.warning(
                parent,
                DIALOG_TITLE_BOX_COUNTER,
                ERROR_INVALID_ROI
            )
            return None
        
        return roi_size

    # ========================================================================
    # DISPLAY UPDATES
    # ========================================================================

    @staticmethod
    def update_display(parent):
        """
        Update the image display with current ROI selection and results.
        
        This method:
        1. Converts grayscale image to BGR for display
        2. Draws ROI rectangle if a point is selected
        3. Overlays fractal dimension text if calculated
        4. Scales image to fit display area while maintaining aspect ratio
        5. Updates label attributes for coordinate transformation
        
        Args:
            parent: Parent widget containing:
                - bc_image: Current grayscale image (numpy array)
                - bc_image_label: QLabel for display
                - bc_point: Current ROI position (x, y)
                - bc_roi_size: ROI size in pixels
                - bc_last_fd: Last calculated fractal dimension
                - bc_last_time: Last calculation time in seconds
                
        Notes:
            - Updates parent.bc_image_label with scaled pixmap
            - Sets label attributes for coordinate mapping:
              orig_w, orig_h, disp_w, disp_h, offset_x, offset_y
        """
        if parent.bc_image is None:
            parent.bc_image_label.setText(DISPLAY_NO_IMAGE)
            return
        
        # Convert grayscale to BGR for display
        display_img = cv2.cvtColor(parent.bc_image, cv2.COLOR_GRAY2BGR)
        
        # Draw ROI overlay if selected
        if parent.bc_point and parent.bc_roi_size:
            display_img = BoxCounterHelpers._draw_roi_overlay(
                display_img,
                parent.bc_point,
                parent.bc_roi_size,
                parent.bc_last_fd,
                parent.bc_last_time
            )
        
        # Convert to QPixmap and scale to fit display
        pixmap = BoxCounterHelpers._numpy_to_pixmap(display_img)
        scaled_pixmap = BoxCounterHelpers._scale_pixmap(
            pixmap,
            parent.bc_image_label.size()
        )
        
        # Update display
        parent.bc_image_label.setPixmap(scaled_pixmap)
        
        # Store dimensions for coordinate transformation
        BoxCounterHelpers._update_label_dimensions(
            parent.bc_image_label,
            display_img.shape[1],  # width
            display_img.shape[0],  # height
            scaled_pixmap.width(),
            scaled_pixmap.height(),
            parent.bc_image_label.size()
        )

    @staticmethod
    def _draw_roi_overlay(
        img: np.ndarray,
        point: Tuple[int, int],
        roi_size: int,
        fractal_dim: Optional[float],
        calc_time: Optional[float]
    ) -> np.ndarray:
        """
        Draw ROI rectangle and text overlay on image.
        
        Args:
            img: BGR image array
            point: ROI top-left corner (x, y)
            roi_size: ROI size in pixels
            fractal_dim: Calculated fractal dimension (or None)
            calc_time: Calculation time in seconds (or None)
            
        Returns:
            Image with overlays drawn (modifies in place and returns)
        """
        x, y = point
        
        # Draw ROI rectangle
        cv2.rectangle(
            img,
            (x, y),
            (x + roi_size, y + roi_size),
            COLOR_ROI_RECT,
            ROI_RECT_THICKNESS,
        )
        
        # Draw text overlay if fractal dimension was calculated
        if fractal_dim is not None:
            text_x = x + roi_size + TEXT_OFFSET_X
            
            # Line 1: Fractal dimension
            cv2.putText(
                img,
                f"D={fractal_dim}",
                (text_x, y + TEXT_OFFSET_Y_LINE1),
                TEXT_FONT,
                TEXT_SIZE_LARGE,
                COLOR_TEXT,
                TEXT_THICKNESS_BOLD,
            )
            
            # Line 2: ROI size and time
            cv2.putText(
                img,
                f"{roi_size}x{roi_size} t={calc_time}s",
                (text_x, y + TEXT_OFFSET_Y_LINE2),
                TEXT_FONT,
                TEXT_SIZE_SMALL,
                COLOR_TEXT,
                TEXT_THICKNESS_NORMAL,
            )
        
        return img

    @staticmethod
    def _numpy_to_pixmap(img: np.ndarray) -> QPixmap:
        """
        Convert numpy BGR image array to QPixmap.
        
        Args:
            img: BGR image as numpy array
            
        Returns:
            QPixmap for display in Qt widgets
        """
        height, width = img.shape[:2]
        bytes_per_line = 3 * width
        
        qimg = QImage(
            img.data,
            width,
            height,
            bytes_per_line,
            QImage.Format.Format_BGR888
        )
        
        return QPixmap.fromImage(qimg)

    @staticmethod
    def _scale_pixmap(pixmap: QPixmap, target_size) -> QPixmap:
        """
        Scale pixmap to fit target size while maintaining aspect ratio.
        
        Args:
            pixmap: Original pixmap
            target_size: Target QSize for scaling
            
        Returns:
            Scaled QPixmap
        """
        return pixmap.scaled(
            target_size,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )

    @staticmethod
    def _update_label_dimensions(
        label,
        orig_width: int,
        orig_height: int,
        display_width: int,
        display_height: int,
        target_size
    ):
        """
        Update label attributes for coordinate transformation.
        
        Stores original and display dimensions plus offsets for mapping
        between display coordinates and image coordinates.
        
        Args:
            label: QLabel to update
            orig_width: Original image width
            orig_height: Original image height
            display_width: Scaled display width
            display_height: Scaled display height
            target_size: Target QSize (label size)
        """
        label.orig_w = orig_width
        label.orig_h = orig_height
        label.disp_w = display_width
        label.disp_h = display_height
        label.offset_x = (target_size.width() - display_width) // 2
        label.offset_y = (target_size.height() - display_height) // 2

    # ========================================================================
    # FRACTAL DIMENSION COMPUTATION
    # ========================================================================

    @staticmethod
    def compute_roi(parent, x: int, y: int):
        """
        Compute fractal dimension for ROI at specified coordinates.
        
        Extracts the ROI from the current image, validates bounds, calculates
        the fractal dimension using box counting method, and updates the display.
        
        Args:
            parent: Parent dialog with bc_* attributes
            x: ROI top-left x-coordinate
            y: ROI top-left y-coordinate
            
        Side Effects:
            - Updates parent.bc_last_fd with calculated dimension
            - Updates parent.bc_last_time with calculation time
            - Updates parent.bc_point with ROI coordinates
            - Updates parent.bc_status with result or error message
            - Refreshes display via update_display()
        """
        # Validate prerequisites
        if parent.bc_image is None or not parent.bc_roi_size:
            return
        
        # Extract and validate ROI
        roi = BoxCounterHelpers._extract_roi(
            parent.bc_image,
            x,
            y,
            parent.bc_roi_size
        )
        
        if roi is None:
            parent.bc_status.setText(ERROR_ROI_OUT_OF_BOUNDS)
            return
        
        # Calculate fractal dimension
        BoxCounterHelpers._calculate_and_update_fractal_dimension(
            parent,
            roi,
            x,
            y
        )
        
        # Update ROI point and refresh display
        parent.bc_point = (x, y)
        BoxCounterHelpers.update_display(parent)

    @staticmethod
    def _extract_roi(
        image: np.ndarray,
        x: int,
        y: int,
        roi_size: int
    ) -> Optional[np.ndarray]:
        """
        Extract ROI from image and validate bounds.
        
        Args:
            image: Source image array
            x: ROI top-left x-coordinate
            y: ROI top-left y-coordinate
            roi_size: ROI size in pixels
            
        Returns:
            ROI array if valid, None if out of bounds
        """
        roi = image[y: y + roi_size, x: x + roi_size]
        
        # Validate that we got the full ROI (not cut off at edges)
        if roi.shape[0] != roi_size or roi.shape[1] != roi_size:
            return None
        
        return roi

    @staticmethod
    def _calculate_and_update_fractal_dimension(
        parent,
        roi: np.ndarray,
        x: int,
        y: int
    ):
        """
        Calculate fractal dimension and update parent state.
        
        Args:
            parent: Parent dialog with bc_* attributes
            roi: ROI image array
            x: ROI x-coordinate for status message
            y: ROI y-coordinate for status message
            
        Side Effects:
            - Updates parent.bc_last_fd with dimension or None on error
            - Updates parent.bc_last_time with time or None on error
            - Updates parent.bc_status with result or error message
        """
        try:
            fd, tsec = BoxCounterUtils.fractal_dim(roi)
            parent.bc_last_fd = fd
            parent.bc_last_time = tsec
            parent.bc_status.setText(f"ROI ({x},{y}) D={fd} t={tsec}s")
        except Exception as e:
            parent.bc_status.setText(f"Error: {e}")
            parent.bc_last_fd = None
            parent.bc_last_time = None
