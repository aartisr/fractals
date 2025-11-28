"""
Box Counter Utilities Module

Provides utilities for fractal dimension estimation using box counting method.
Includes image loading capabilities for comparison dialogs and core fractal
dimension calculation algorithms.

Key Features:
    - Image loading with GIF animation support
    - Box counting algorithm for fractal analysis
    - Fractal dimension estimation via linear regression
    - Image preprocessing (Gaussian blur, binarization, skeletonization)
"""

import time
from typing import Optional, Tuple

import cv2
import numpy as np
from PIL import Image
from PyQt6.QtCore import QSize, Qt
from PyQt6.QtGui import QImage, QMovie, QPixmap
from PyQt6.QtWidgets import QFileDialog, QMessageBox
from skimage.morphology import skeletonize


# ============================================================================
# CONSTANTS
# ============================================================================

# Image formats
SUPPORTED_IMAGE_FORMATS = "Images (*.png *.jpg *.jpeg *.bmp *.tif *.tiff *.gif)"
GIF_EXTENSION = '.gif'

# Display settings
THUMBNAIL_SIZE = 180
DISPLAY_SIZE = QSize(THUMBNAIL_SIZE, THUMBNAIL_SIZE)

# Box counting parameters
DEFAULT_MIN_BOX_SIZE = 1
DEFAULT_MAX_BOX_DIVISOR = 4  # max_box_size = image_dimension / divisor
MIN_BOX_SIZES_REQUIRED = 3
BOX_SIZE_RANGE = range(6, 0, -1)  # Powers for fallback box sizes

# Image preprocessing parameters
GAUSSIAN_BLUR_SIGMA = 35
MORPH_KERNEL_SIZE = (3, 3)
ODD_NUMBER_MASK = 1  # Ensures kernel size is odd
MIN_KERNEL_SIZE = 51

# Binarization parameters
BINARY_MAX_VALUE = 255
PIXEL_OFFSET = 128  # Offset for contrast adjustment

# Error messages
ERROR_IMAGE_LOAD_FAILED = "Failed to load the selected image."
DIALOG_TITLE_IMAGE_ERROR = "Image Load Error"


class BoxCounterUtils:
    """
    Utility class for fractal dimension estimation and box counting analysis.
    
    This class provides static methods for:
    - Loading and displaying images (including animated GIFs)
    - Performing box counting on binary images
    - Calculating fractal dimensions using the box counting method
    - Image preprocessing (blurring, binarization, skeletonization)
    
    All methods are static and stateless, designed for pure functional operations.
    
    Example:
        >>> image = cv2.imread('fractal.png', cv2.IMREAD_GRAYSCALE)
        >>> dimension, calc_time = BoxCounterUtils.fractal_dim(image)
        >>> print(f"Fractal dimension: {dimension}")
    """

    # ========================================================================
    # IMAGE LOADING FOR COMPARISON
    # ========================================================================

    @staticmethod
    def load_image_for_compare(
        parent,
        which: int,
        img1_label,
        img2_label,
        path=None
    ) -> Optional[np.ndarray]:
        """
        Load and display image for comparison dialog.
        If path is provided, use it; otherwise, open file dialog.
        """
        if path is not None:
            file_path = path
        else:
            file_path = BoxCounterUtils._select_image_file(parent)
        if not file_path:
            return None
        
        # Load and display based on file type
        if file_path.lower().endswith(GIF_EXTENSION):
            return BoxCounterUtils._load_gif_image(file_path, which, img1_label, img2_label)
        else:
            return BoxCounterUtils._load_static_image(file_path, which, img1_label, img2_label, parent)

    @staticmethod
    def _select_image_file(parent) -> Optional[str]:
        """
        Show file dialog and return selected image path.
        
        Args:
            parent: Parent widget for the dialog
            
        Returns:
            Selected file path or None if cancelled
        """
        file_dialog = QFileDialog(parent)
        file_dialog.setNameFilter(SUPPORTED_IMAGE_FORMATS)
        file_dialog.setFileMode(QFileDialog.FileMode.ExistingFile)
        
        if file_dialog.exec():
            return file_dialog.selectedFiles()[0]
        return None

    @staticmethod
    def _load_gif_image(
        file_path: str,
        which: int,
        img1_label,
        img2_label
    ) -> np.ndarray:
        """
        Load GIF as animation in label and extract first frame.
        
        Args:
            file_path: Path to GIF file
            which: Image slot (1 or 2)
            img1_label: Label for first image
            img2_label: Label for second image
            
        Returns:
            First frame as RGB numpy array
        """
        # Display animation
        movie = QMovie(file_path)
        movie.setScaledSize(DISPLAY_SIZE)
        
        target_label = img1_label if which == 1 else img2_label
        target_label.setMovie(movie)
        target_label.setText("")
        movie.start()
        
        # Extract first frame for processing
        pil_img = Image.open(file_path)
        pil_img = pil_img.convert('RGB')
        return np.array(pil_img)

    @staticmethod
    def _load_static_image(
        file_path: str,
        which: int,
        img1_label,
        img2_label,
        parent
    ) -> Optional[np.ndarray]:
        """
        Load static image and display as thumbnail.
        
        Args:
            file_path: Path to image file
            which: Image slot (1 or 2)
            img1_label: Label for first image
            img2_label: Label for second image
            parent: Parent widget for error dialogs
            
        Returns:
            Image as RGB numpy array or None on failure
        """
        img = cv2.imread(file_path)
        if img is None:
            QMessageBox.warning(
                parent,
                DIALOG_TITLE_IMAGE_ERROR,
                ERROR_IMAGE_LOAD_FAILED
            )
            return None
        
        # Convert to RGB and create thumbnail
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        pixmap = BoxCounterUtils._create_thumbnail(img_rgb)
        
        # Update appropriate label
        target_label = img1_label if which == 1 else img2_label
        target_label.setPixmap(pixmap)
        target_label.setText("")
        
        return img_rgb

    @staticmethod
    def _create_thumbnail(img_rgb: np.ndarray) -> QPixmap:
        """
        Create scaled thumbnail from RGB image.
        
        Args:
            img_rgb: RGB image array
            
        Returns:
            Scaled QPixmap for display
        """
        h, w, ch = img_rgb.shape
        bytes_per_line = ch * w
        
        qimg = QImage(
            img_rgb.data,
            w,
            h,
            bytes_per_line,
            QImage.Format.Format_RGB888
        )
        
        return QPixmap.fromImage(qimg).scaled(
            THUMBNAIL_SIZE,
            THUMBNAIL_SIZE,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation
        )

    # ========================================================================
    # BOX COUNTING ALGORITHM
    # ========================================================================

    @staticmethod
    def box_counting(
        image: np.ndarray,
        min_box_size: int = DEFAULT_MIN_BOX_SIZE,
        max_box_size: Optional[int] = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Perform box counting analysis on binary image.
        
        Implements the box counting method for fractal dimension estimation.
        Divides the image into boxes of varying sizes and counts how many
        boxes contain part of the object (non-zero pixels).
        
        Args:
            image: Binary image (non-zero pixels represent the object)
            min_box_size: Minimum box size in pixels (default: 1)
            max_box_size: Maximum box size in pixels (default: min(image.shape) / 4)
            
        Returns:
            Tuple of (counts, sizes) where:
            - counts: Number of occupied boxes for each box size
            - sizes: Box sizes used (powers of 2 sequence)
            
        Note:
            Box sizes are generated as powers of 2. If insufficient sizes
            are generated, a fallback logarithmic sequence is used to ensure
            at least 3 size values for reliable linear regression.
        """
        # Determine maximum box size
        if max_box_size is None:
            max_box_size = min(image.shape) // DEFAULT_MAX_BOX_DIVISOR
        
        # Generate box sizes
        sizes = BoxCounterUtils._generate_box_sizes(
            min_box_size,
            max_box_size,
            min(image.shape)
        )
        
        # Count occupied boxes for each size
        counts = [
            BoxCounterUtils._count_occupied_boxes(image, size)
            for size in sizes
        ]
        
        return np.array(counts), np.array(sizes)

    @staticmethod
    def _generate_box_sizes(
        min_size: int,
        max_size: int,
        image_dimension: int
    ) -> list:
        """
        Generate sequence of box sizes for counting.
        
        Args:
            min_size: Minimum box size
            max_size: Maximum box size
            image_dimension: Smallest image dimension
            
        Returns:
            List of box sizes (powers of 2 or logarithmic fallback)
        """
        sizes = []
        
        # Generate powers of 2 sequence
        size = min_size
        while size <= max_size:
            sizes.append(size)
            size *= 2
        
        # Fallback if insufficient sizes
        if len(sizes) < MIN_BOX_SIZES_REQUIRED:
            sizes = [
                max(1, image_dimension // (2**i))
                for i in BOX_SIZE_RANGE
            ]
            sizes = [s for s in sizes if min_size <= s <= max_size]
        
        return sizes

    @staticmethod
    def _count_occupied_boxes(image: np.ndarray, box_size: int) -> int:
        """
        Count boxes containing non-zero pixels for given box size.
        
        Args:
            image: Binary image
            box_size: Size of boxes to use
            
        Returns:
            Number of boxes containing any non-zero pixels
        """
        count = 0
        for x in range(0, image.shape[0], box_size):
            for y in range(0, image.shape[1], box_size):
                if np.any(image[x:x+box_size, y:y+box_size]):
                    count += 1
        return count

    # ========================================================================
    # FRACTAL DIMENSION ESTIMATION
    # ========================================================================

    @staticmethod
    def fractal_dim(image: np.ndarray) -> Tuple[float, float]:
        """
        Calculate fractal dimension using box counting method.
        
        Preprocesses the image through Gaussian blur, contrast adjustment,
        binarization, morphological closing, and skeletonization. Then applies
        box counting and estimates fractal dimension via linear regression.
        
        Processing Pipeline:
            1. Adaptive Gaussian blur (kernel size based on image size)
            2. Contrast adjustment (subtract blur + offset)
            3. Otsu's binarization
            4. Morphological closing (remove small holes)
            5. Skeletonization (reduce to 1-pixel-wide structure)
            6. Box counting on multiple scales
            7. Linear regression on log-log plot
        
        Args:
            image: Grayscale input image (numpy array)
            
        Returns:
            Tuple of (fractal_dimension, computation_time):
            - fractal_dimension: Estimated dimension (typically 1.0-2.0)
            - computation_time: Processing time in seconds
            
        Note:
            The fractal dimension is the negative slope of the linear fit
            in log-log space (log(count) vs log(box_size)). Higher dimensions
            indicate more complex, space-filling patterns.
        """
        start = time.time()
        
        # Preprocess image
        preprocessed = BoxCounterUtils._preprocess_image(image)
        
        # Perform box counting
        counts, sizes = BoxCounterUtils.box_counting(preprocessed)
        
        # Calculate fractal dimension from log-log linear fit
        fd = BoxCounterUtils._calculate_fractal_dimension(counts, sizes)
        
        elapsed = time.time() - start
        return round(fd, 4), round(elapsed, 4)

    @staticmethod
    def _preprocess_image(image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for fractal dimension analysis.
        
        Args:
            image: Grayscale input image
            
        Returns:
            Skeletonized binary image
        """
        # Adaptive Gaussian blur
        blur = BoxCounterUtils._apply_adaptive_blur(image)
        
        # Contrast adjustment and binarization
        binarized = BoxCounterUtils._binarize_image(image, blur)
        
        # Morphological closing
        closed = BoxCounterUtils._apply_morphological_closing(binarized)
        
        # Skeletonization
        skeletonized = BoxCounterUtils._skeletonize_image(closed)
        
        return skeletonized

    @staticmethod
    def _apply_adaptive_blur(image: np.ndarray) -> np.ndarray:
        """
        Apply Gaussian blur with adaptive kernel size.
        
        Args:
            image: Input grayscale image
            
        Returns:
            Blurred image
        """
        # Kernel size must be odd and scale with image size
        ksize = max(MIN_KERNEL_SIZE, max(image.shape) | ODD_NUMBER_MASK)
        
        return cv2.GaussianBlur(
            image,
            (ksize, ksize),
            GAUSSIAN_BLUR_SIGMA,
            borderType=cv2.BORDER_REPLICATE
        )

    @staticmethod
    def _binarize_image(image: np.ndarray, blur: np.ndarray) -> np.ndarray:
        """
        Binarize image using contrast adjustment and Otsu's method.
        
        Args:
            image: Original grayscale image
            blur: Blurred version of image
            
        Returns:
            Binary image (0 or 255)
        """
        # Contrast adjustment: subtract blur and add offset
        contrast_adjusted = np.clip(
            image.astype(int) - blur + PIXEL_OFFSET,
            0,
            BINARY_MAX_VALUE
        ).astype(np.uint8)
        
        # Otsu's automatic thresholding
        _, binarized = cv2.threshold(
            contrast_adjusted,
            0,
            BINARY_MAX_VALUE,
            cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
        
        return binarized

    @staticmethod
    def _apply_morphological_closing(image: np.ndarray) -> np.ndarray:
        """
        Apply morphological closing to remove small holes.
        
        Args:
            image: Binary image
            
        Returns:
            Processed binary image
        """
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, MORPH_KERNEL_SIZE)
        return cv2.morphologyEx(image, cv2.MORPH_CLOSE, kernel)

    @staticmethod
    def _skeletonize_image(image: np.ndarray) -> np.ndarray:
        """
        Skeletonize binary image to 1-pixel-wide structure.
        
        Args:
            image: Binary image (0 or 255)
            
        Returns:
            Skeletonized binary image
        """
        # Convert to boolean, skeletonize, convert back to uint8
        binary = image // BINARY_MAX_VALUE
        skeleton = skeletonize(binary)
        return (skeleton * BINARY_MAX_VALUE).astype(np.uint8)

    @staticmethod
    def _calculate_fractal_dimension(
        counts: np.ndarray,
        sizes: np.ndarray
    ) -> float:
        """
        Calculate fractal dimension from box counting results.
        
        Args:
            counts: Array of box counts
            sizes: Array of box sizes
            
        Returns:
            Fractal dimension (negative slope of log-log fit)
        """
        log_sizes = np.log(sizes)
        log_counts = np.log(counts)
        
        # Linear regression: log(count) = slope * log(size) + intercept
        # Fractal dimension = -slope
        slope = np.polyfit(log_sizes, log_counts, 1)[0]
        
        return -slope
