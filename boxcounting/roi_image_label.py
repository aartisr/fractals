"""
ROI Image Label Module

Provides a custom QLabel widget for interactive ROI (Region of Interest) selection
in fractal dimension analysis applications. Handles mouse interactions with proper
coordinate transformations between display space and image space.

Key Features:
    - Interactive ROI selection via mouse clicks
    - Automatic coordinate transformation (display to image space)
    - Responsive scaling on window resize
    - User-friendly error handling and validation
    - Mouse tracking support for future enhancements
"""

from typing import Optional

from PyQt6.QtCore import QEvent
from PyQt6.QtGui import QMouseEvent, QResizeEvent
from PyQt6.QtWidgets import QLabel, QMessageBox


# ============================================================================
# CONSTANTS
# ============================================================================

# User messages
MSG_SET_ROI_SIZE_FIRST = "Set ROI size first."
MSG_DIALOG_TITLE = "Box Counter"

# Validation constants
MIN_DISPLAY_DIMENSION = 0  # Minimum display size to accept clicks
DEFAULT_GEOMETRY_VALUE = 0  # Default value for uninitialized geometry


class ROIImageLabel(QLabel):
    """
    Interactive image label for ROI selection with coordinate transformation.
    
    This custom QLabel enables users to select ROI (Region of Interest) positions
    by clicking on displayed images. It handles the complex coordinate mapping
    between the displayed (scaled) image and the original full-resolution image.
    
    Attributes:
        parent_ref: Reference to parent dialog for accessing bc_* attributes
        orig_w: Original image width in pixels
        orig_h: Original image height in pixels
        disp_w: Displayed (scaled) image width in pixels
        disp_h: Displayed (scaled) image height in pixels
        offset_x: Horizontal offset of image within label (for centering)
        offset_y: Vertical offset of image within label (for centering)
        
    Coordinate System:
        The widget maintains two coordinate systems:
        1. Display coordinates: Position within the scaled, centered image
        2. Image coordinates: Position in the original full-resolution image
        
        Transformation: image_x = (display_x - offset_x) * (orig_w / disp_w)
        
    Usage:
        >>> label = ROIImageLabel(parent_dialog)
        >>> # User clicks on image - automatically calls parent.bc_compute_roi()
        >>> # Window resize - automatically updates display
    """

    def __init__(self, parent):
        """
        Initialize ROI image label.
        
        Args:
            parent: Parent dialog containing bc_* attributes and methods
        """
        super().__init__(parent)
        self.parent_ref = parent
        
        # Initialize geometry attributes for coordinate transformation
        self.orig_w: int = DEFAULT_GEOMETRY_VALUE
        self.orig_h: int = DEFAULT_GEOMETRY_VALUE
        self.disp_w: int = DEFAULT_GEOMETRY_VALUE
        self.disp_h: int = DEFAULT_GEOMETRY_VALUE
        self.offset_x: int = DEFAULT_GEOMETRY_VALUE
        self.offset_y: int = DEFAULT_GEOMETRY_VALUE
        
        # Enable mouse tracking for future hover effects
        self.setMouseTracking(True)

    # ========================================================================
    # EVENT HANDLERS
    # ========================================================================

    def mousePressEvent(self, event: QMouseEvent) -> None:
        """
        Handle mouse click events for ROI selection.
        
        Validates preconditions, transforms display coordinates to image
        coordinates, and triggers ROI computation if click is valid.
        
        Args:
            event: Mouse event containing click position
            
        Validation Flow:
            1. Check if image is loaded
            2. Check if ROI size is set
            3. Check if display has content
            4. Verify click is within image bounds
            5. Transform coordinates and compute ROI
        """
        parent = self.parent_ref
        
        # Validate prerequisites
        if not self._validate_click_prerequisites(parent):
            return
        
        # Get click position
        x_click, y_click = self._get_click_coordinates(event)
        
        # Validate click is within displayed image
        if not self._is_click_within_image(x_click, y_click):
            return
        
        # Transform to original image coordinates
        image_x, image_y = self._transform_to_image_coordinates(x_click, y_click)
        
        # Validate and execute ROI computation
        if self._is_valid_roi_position(parent, image_x, image_y):
            parent.bc_compute_roi(image_x, image_y)

    def resizeEvent(self, event: QResizeEvent) -> None:
        """
        Handle window resize events.
        
        Triggers display update to rescale and reposition the image
        when the label size changes.
        
        Args:
            event: Resize event with old and new sizes
        """
        if hasattr(self.parent_ref, "bc_update_display"):
            self.parent_ref.bc_update_display()
        super().resizeEvent(event)

    # ========================================================================
    # VALIDATION HELPERS
    # ========================================================================

    def _validate_click_prerequisites(self, parent) -> bool:
        """
        Validate that all prerequisites for processing a click are met.
        
        Args:
            parent: Parent dialog
            
        Returns:
            True if all prerequisites are satisfied, False otherwise
            
        Side Effects:
            May show QMessageBox if ROI size is not set
        """
        # Check if image is loaded
        if parent.bc_image is None:
            return False
        
        # Check if ROI size is configured
        if not parent.bc_roi_size:
            QMessageBox.information(
                self,
                MSG_DIALOG_TITLE,
                MSG_SET_ROI_SIZE_FIRST
            )
            return False
        
        # Check if display has been initialized
        if self.disp_w == MIN_DISPLAY_DIMENSION or self.disp_h == MIN_DISPLAY_DIMENSION:
            return False
        
        return True

    def _is_click_within_image(self, x_click: int, y_click: int) -> bool:
        """
        Check if click coordinates are within the displayed image bounds.
        
        Args:
            x_click: Click x-coordinate in label space
            y_click: Click y-coordinate in label space
            
        Returns:
            True if click is within image bounds, False otherwise
        """
        return (
            self.offset_x <= x_click < self.offset_x + self.disp_w
            and self.offset_y <= y_click < self.offset_y + self.disp_h
        )

    def _is_valid_roi_position(self, parent, image_x: int, image_y: int) -> bool:
        """
        Validate that ROI position is within original image bounds.
        
        Args:
            parent: Parent dialog with bc_image
            image_x: X-coordinate in original image space
            image_y: Y-coordinate in original image space
            
        Returns:
            True if position is valid, False otherwise
        """
        h, w = parent.bc_image.shape[:2]
        return 0 <= image_x < w and 0 <= image_y < h

    # ========================================================================
    # COORDINATE TRANSFORMATION HELPERS
    # ========================================================================

    def _get_click_coordinates(self, event: QMouseEvent) -> tuple[int, int]:
        """
        Extract click coordinates from mouse event.
        
        Args:
            event: Mouse event
            
        Returns:
            Tuple of (x, y) coordinates in label space
        """
        x_click = int(event.position().x())
        y_click = int(event.position().y())
        return x_click, y_click

    def _transform_to_image_coordinates(
        self,
        x_click: int,
        y_click: int
    ) -> tuple[int, int]:
        """
        Transform display coordinates to original image coordinates.
        
        Applies inverse of the scaling and offset transformations to map
        from the displayed (scaled, centered) image back to the original
        full-resolution image coordinates.
        
        Args:
            x_click: Click x-coordinate in label space
            y_click: Click y-coordinate in label space
            
        Returns:
            Tuple of (image_x, image_y) in original image space
            
        Algorithm:
            1. Remove offset: relative_x = x_click - offset_x
            2. Scale up: image_x = relative_x * (orig_w / disp_w)
        """
        # Calculate relative position within displayed image
        relative_x = (x_click - self.offset_x) * self.orig_w / self.disp_w
        relative_y = (y_click - self.offset_y) * self.orig_h / self.disp_h
        
        # Convert to integer coordinates
        image_x = int(relative_x)
        image_y = int(relative_y)
        
        return image_x, image_y
