"""
Box Counting Package

A comprehensive package for fractal dimension analysis using the box counting method.
Provides interactive dialogs, utilities, and visualization tools for analyzing fractal
patterns in images, particularly useful for medical imaging and texture analysis.

Modules:
    box_counter_utils: Core utilities for box counting and fractal dimension calculation
    box_counter_helpers: Helper functions for ROI selection and image processing
    box_counter_compare_dialog: Interactive dialog for comparing fractal dimensions
    roi_image_label: Custom QLabel widget for interactive ROI selection

Main Classes:
    BoxCounterUtils: Static methods for box counting and fractal analysis
    BoxCounterHelpers: Static methods for image loading and ROI computation
    ROIImageLabel: Interactive label for ROI selection with coordinate transformation

Key Functions:
    show_boxcount_comparison_dialog: Launch comparison dialog for two images
    fractal_dim: Calculate fractal dimension of an image
    box_counting: Perform box counting on binary image

Usage Examples:
    >>> from boxcounting import BoxCounterUtils
    >>> import cv2
    >>> 
    >>> # Calculate fractal dimension
    >>> image = cv2.imread('fractal.png', cv2.IMREAD_GRAYSCALE)
    >>> dimension, time = BoxCounterUtils.fractal_dim(image)
    >>> print(f"Fractal dimension: {dimension}")
    
    >>> # Launch comparison dialog
    >>> from boxcounting import show_boxcount_comparison_dialog
    >>> show_boxcount_comparison_dialog(parent, image1, image2)

Version: 1.0.0
Author: Aarti S Ravikumar
License: See LICENSE file
"""

__version__ = '1.0.0'
__author__ = 'Aarti S Ravikumar'

# Public API exports - lazy imports to handle missing dependencies gracefully
try:
    from boxcounting.box_counter_utils import BoxCounterUtils
    from boxcounting.box_counter_helpers import BoxCounterHelpers
    from boxcounting.roi_image_label import ROIImageLabel
    from boxcounting.box_counter_compare_dialog import show_boxcount_comparison_dialog
    
    __all__ = [
        'BoxCounterUtils',
        'BoxCounterHelpers',
        'ROIImageLabel',
        'show_boxcount_comparison_dialog',
        '__version__',
        '__author__',
    ]
except ImportError as e:
    # If dependencies are missing, provide informative error message
    import warnings
    warnings.warn(
        f"Some boxcounting dependencies are not available: {e}. "
        "Install required packages: pip install opencv-python PyQt6 numpy scikit-image matplotlib",
        ImportWarning
    )
    __all__ = ['__version__', '__author__']
