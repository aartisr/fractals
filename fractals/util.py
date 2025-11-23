"""
Fractal Utilities Module
========================

Provides utility functions and classes for fractal visualization and UI operations.

This module contains:
    - Image conversion utilities (NumPy ↔ QPixmap)
    - Resolution parsing helpers
    - Fractal information database for educational display

Author: Aarti S Ravikumar
License: MIT
Version: 2.0.0
"""

from typing import Tuple, Optional
import numpy as np
from PyQt6.QtGui import QImage, QPixmap

# ============================================================================
# IMAGE CONVERSION UTILITIES
# ============================================================================

def np_to_pixmap(arr: np.ndarray) -> QPixmap:
    """
    Convert NumPy array to QPixmap for PyQt6 display.
    
    Handles both grayscale and color images, automatically converting data types
    and formats as needed for Qt's image system.
    
    Args:
        arr: NumPy array representing image data
            - 2D array: Grayscale image (height × width)
            - 3D array: Color image (height × width × channels)
                * 3 channels: RGB
                * 4 channels: RGBA
    
    Returns:
        QPixmap ready for display in QLabel or other Qt widgets
    
    Raises:
        ValueError: If array has unsupported dimensions or channel count
        
    Supported Formats:
        - Grayscale: 2D array, any numeric dtype → Format_Grayscale8
        - RGB: 3D array with 3 channels → Format_RGB888
        - RGBA: 3D array with 4 channels → Format_RGBA8888
    
    Type Conversion:
        Non-uint8 arrays are automatically converted to uint8.
        Values should be in range [0, 255] for proper display.
    
    Memory Safety:
        QImage uses arr.data directly, so the original array must remain
        in memory until the QPixmap is displayed. The conversion to QPixmap
        creates a copy, making it safe to modify the original array afterward.
    
    Example:
        >>> import numpy as np
        >>> gray_image = np.random.randint(0, 256, (400, 600), dtype=np.uint8)
        >>> pixmap = np_to_pixmap(gray_image)
        >>> label.setPixmap(pixmap)
        
        >>> rgb_image = np.random.randint(0, 256, (400, 600, 3), dtype=np.uint8)
        >>> color_pixmap = np_to_pixmap(rgb_image)
    """
    # Validate input
    if not isinstance(arr, np.ndarray):
        raise TypeError(f"Expected numpy.ndarray, got {type(arr).__name__}")
    
    if arr.ndim not in (2, 3):
        raise ValueError(
            f"Array must be 2D (grayscale) or 3D (color), got {arr.ndim}D"
        )
    
    # Ensure uint8 dtype for Qt compatibility
    if arr.dtype != np.uint8:
        # Clip and convert to avoid overflow
        arr = np.clip(arr, 0, 255).astype(np.uint8)
    
    # Make array contiguous in memory for QImage
    if not arr.flags['C_CONTIGUOUS']:
        arr = np.ascontiguousarray(arr)
    
    # Create QImage based on array dimensions
    if arr.ndim == 2:
        # Grayscale image
        height, width = arr.shape
        bytes_per_line = width
        qimg = QImage(
            arr.data,
            width,
            height,
            bytes_per_line,
            QImage.Format.Format_Grayscale8
        )
    else:
        # Color image (RGB or RGBA)
        height, width, channels = arr.shape
        bytes_per_line = channels * width
        
        if channels == 3:
            qimg = QImage(
                arr.data,
                width,
                height,
                bytes_per_line,
                QImage.Format.Format_RGB888
            )
        elif channels == 4:
            qimg = QImage(
                arr.data,
                width,
                height,
                bytes_per_line,
                QImage.Format.Format_RGBA8888
            )
        else:
            raise ValueError(
                f"Unsupported channel count: {channels}. "
                f"Expected 3 (RGB) or 4 (RGBA)"
            )
    
    # Convert to QPixmap (creates internal copy, safe from array changes)
    return QPixmap.fromImage(qimg)


def get_resolution(self) -> Tuple[int, int]:
    """
    Parse resolution string and return width and height as integers.
    
    Extracts dimensions from common resolution format strings like "800x600",
    "1920x1080", etc.
    
    Args:
        self: Object with 'resolution' attribute containing format "WIDTHxHEIGHT"
    
    Returns:
        Tuple of (width, height) as integers
    
    Raises:
        ValueError: If resolution string is malformed or contains invalid numbers
        AttributeError: If self.resolution doesn't exist
    
    Expected Format:
        - "WIDTHxHEIGHT" where WIDTH and HEIGHT are positive integers
        - Case-insensitive separator (x or X)
        - Examples: "800x600", "1920x1080", "3840x2160"
    
    Example:
        >>> class Config:
        ...     resolution = "1920x1080"
        >>> config = Config()
        >>> width, height = get_resolution(config)
        >>> print(f"{width}x{height}")
        1920x1080
    """
    if not hasattr(self, 'resolution'):
        raise AttributeError("Object must have 'resolution' attribute")
    
    res_text = self.resolution
    
    if not isinstance(res_text, str):
        raise TypeError(
            f"Resolution must be string, got {type(res_text).__name__}"
        )
    
    # Normalize case and split
    parts = res_text.lower().split('x')
    
    if len(parts) != 2:
        raise ValueError(
            f"Invalid resolution format: '{res_text}'. "
            f"Expected 'WIDTHxHEIGHT' (e.g., '800x600')"
        )
    
    try:
        width = int(parts[0].strip())
        height = int(parts[1].strip())
    except ValueError as e:
        raise ValueError(
            f"Invalid resolution values in '{res_text}': {e}"
        )
    
    # Validate positive dimensions
    if width <= 0 or height <= 0:
        raise ValueError(
            f"Resolution dimensions must be positive: {width}x{height}"
        )
    
    return width, height


# ============================================================================
# FRACTAL INFORMATION DATABASE
# ============================================================================

class FractalInfoUtil:
    """
    Provides educational information about different fractal types.
    
    This class serves as a centralized database of fractal descriptions,
    mathematical formulas, and properties for display in the UI's info panel.
    
    All information is formatted as HTML for rich text display in Qt widgets.
    
    Supported Fractals:
        - Mandelbrot Set
        - Julia Set
        - Burning Ship
        - Newton Fractal
        - Barnsley Fern
        - Sierpinski Triangle
    
    Usage:
        >>> info_html = FractalInfoUtil.get_fractal_info("Mandelbrot")
        >>> info_label.setText(info_html)
    """
    
    # Fractal dimension constants for reference
    MANDELBROT_DIMENSION = 2.0
    JULIA_DIMENSION_RANGE = (1.0, 2.0)
    BURNING_SHIP_DIMENSION = 2.0
    NEWTON_DIMENSION_RANGE = (1.5, 2.0)
    BARNSLEY_FERN_DIMENSION = 1.67
    SIERPINSKI_DIMENSION = np.log(3) / np.log(2)  # ≈ 1.585
    
    @staticmethod
    def get_fractal_info(fractal_type: str) -> str:
        """
        Get detailed HTML-formatted information about a fractal type.
        
        Returns mathematical formulas, descriptions, and fractal dimensions
        formatted for display in Qt rich text widgets.
        
        Args:
            fractal_type: Name of the fractal (case-insensitive)
                Valid values: "Mandelbrot", "Julia", "Burning Ship",
                             "Newton", "Barnsley Fern", "Sierpinski Triangle"
        
        Returns:
            HTML-formatted string containing:
                - Fractal name and description
                - Mathematical formula(s)
                - Parameter explanations
                - Fractal dimension information
        
        Default Behavior:
            Returns generic information if fractal_type is not recognized
        
        Example:
            >>> info = FractalInfoUtil.get_fractal_info("Mandelbrot")
            >>> print("Mandelbrot" in info)
            True
        """
        # Normalize fractal type for case-insensitive matching
        fractal_type = fractal_type.strip()
        
        if fractal_type == "Mandelbrot":
            return FractalInfoUtil._get_mandelbrot_info()
        elif fractal_type == "Julia":
            return FractalInfoUtil._get_julia_info()
        elif fractal_type == "Burning Ship":
            return FractalInfoUtil._get_burning_ship_info()
        elif fractal_type == "Newton":
            return FractalInfoUtil._get_newton_info()
        elif fractal_type == "Barnsley Fern":
            return FractalInfoUtil._get_barnsley_fern_info()
        elif fractal_type == "Sierpinski Triangle":
            return FractalInfoUtil._get_sierpinski_triangle_info()
        else:
            return FractalInfoUtil._get_default_info()
    
    # ========================================================================
    # INDIVIDUAL FRACTAL INFO METHODS
    # ========================================================================
    
    @staticmethod
    def _get_mandelbrot_info() -> str:
        """Get Mandelbrot set information."""
        return (
            "<h3>Mandelbrot Set</h3>"
            "<p>The Mandelbrot set is a set of complex numbers <i>c</i> for which "
            "the sequence defined by <b>z<sub>n+1</sub> = z<sub>n</sub><sup>p</sup> + c</b> "
            "(with z<sub>0</sub> = 0) does not diverge to infinity. "
            "The boundary of the Mandelbrot set is a fractal.</p>"
            "<b>Formula:</b><br>"
            "<div style='text-align:center; font-size:16px; margin:10px 0;'>"
            "z<sub>n+1</sub> = z<sub>n</sub><sup>p</sup> + c"
            "</div>"
            "<b>Parameters:</b>"
            "<ul style='margin-top:8px;'>"
            "<li><b>p:</b> Power parameter (typically 2 for classic Mandelbrot)</li>"
            "<li><b>c:</b> Complex parameter (varies per pixel location)</li>"
            "<li><b>z<sub>0</sub>:</b> Initial value (always 0 for Mandelbrot)</li>"
            "</ul>"
            "<p><b>Fractal Dimension:</b> The boundary has a fractal dimension "
            f"of approximately {FractalInfoUtil.MANDELBROT_DIMENSION}.</p>"
            "<p style='font-size:13px; color:#555;'>"
            "<i>Named after mathematician Benoit Mandelbrot, who studied it in 1980.</i>"
            "</p>"
        )
    
    @staticmethod
    def _get_julia_info() -> str:
        """Get Julia set information."""
        return (
            "<h3>Julia Set</h3>"
            "<p>Julia sets are generated by iterating "
            "<b>z<sub>n+1</sub> = z<sub>n</sub><sup>p</sup> + c</b> "
            "for each point z<sub>0</sub> in the complex plane, with a fixed "
            "complex constant <i>c</i>. The resulting set of points that do not "
            "escape to infinity forms the Julia set.</p>"
            "<b>Formula:</b><br>"
            "<div style='text-align:center; font-size:16px; margin:10px 0;'>"
            "z<sub>n+1</sub> = z<sub>n</sub><sup>p</sup> + c"
            "</div>"
            "<b>Parameters:</b>"
            "<ul style='margin-top:8px;'>"
            "<li><b>p:</b> Power parameter (typically 2)</li>"
            "<li><b>c:</b> Complex constant (user-defined, determines shape)</li>"
            "<li><b>z<sub>0</sub>:</b> Initial value (varies per pixel)</li>"
            "</ul>"
            "<p><b>Fractal Dimension:</b> Julia sets can have non-integer fractal "
            f"dimensions, typically between {FractalInfoUtil.JULIA_DIMENSION_RANGE[0]} "
            f"and {FractalInfoUtil.JULIA_DIMENSION_RANGE[1]}.</p>"
            "<p style='font-size:13px; color:#555;'>"
            "<i>Named after mathematician Gaston Julia, who studied these sets in 1918.</i>"
            "</p>"
        )
    
    @staticmethod
    def _get_burning_ship_info() -> str:
        """Get Burning Ship fractal information."""
        return (
            "<h3>Burning Ship Fractal</h3>"
            "<p>The Burning Ship fractal is defined by iterating "
            "<b>z<sub>n+1</sub> = (|Re(z<sub>n</sub>)| + i|Im(z<sub>n</sub>)|)<sup>p</sup> + c</b> "
            "with z<sub>0</sub> = 0. The absolute values of the real and imaginary "
            "components create the characteristic 'ship' shape when rendered.</p>"
            "<b>Formula:</b><br>"
            "<div style='text-align:center; font-size:16px; margin:10px 0;'>"
            "z<sub>n+1</sub> = (|Re(z<sub>n</sub>)| + i|Im(z<sub>n</sub>)|)<sup>p</sup> + c"
            "</div>"
            "<b>Parameters:</b>"
            "<ul style='margin-top:8px;'>"
            "<li><b>p:</b> Power parameter (typically 2)</li>"
            "<li><b>c:</b> Complex parameter (varies per pixel)</li>"
            "<li><b>|Re(z)|, |Im(z)|:</b> Absolute values of components</li>"
            "</ul>"
            "<p><b>Fractal Dimension:</b> The boundary has an estimated fractal "
            f"dimension of about {FractalInfoUtil.BURNING_SHIP_DIMENSION}.</p>"
            "<p style='font-size:13px; color:#555;'>"
            "<i>Discovered by Michael Michelitsch and Otto Rössler in 1992.</i>"
            "</p>"
        )
    
    @staticmethod
    def _get_newton_info() -> str:
        """Get Newton fractal information."""
        return (
            "<h3>Newton Fractal</h3>"
            "<p>The Newton fractal visualizes the basins of attraction for "
            "Newton's root-finding method applied to a polynomial equation. "
            "For a function f(z), the iteration is "
            "<b>z<sub>n+1</sub> = z<sub>n</sub> - f(z<sub>n</sub>)/f'(z<sub>n</sub>)</b>. "
            "Each color represents points that converge to a particular root.</p>"
            "<b>Formula:</b><br>"
            "<div style='text-align:center; font-size:16px; margin:10px 0;'>"
            "z<sub>n+1</sub> = z<sub>n</sub> - f(z<sub>n</sub>)/f'(z<sub>n</sub>)"
            "</div>"
            "<b>Parameters:</b>"
            "<ul style='margin-top:8px;'>"
            "<li><b>f(z):</b> Polynomial function (e.g., z<sup>3</sup> - 1)</li>"
            "<li><b>f'(z):</b> Derivative of the polynomial</li>"
            "<li><b>Roots:</b> Solutions where f(z) = 0</li>"
            "</ul>"
            "<p><b>Fractal Dimension:</b> The fractal dimension of basin boundaries "
            f"depends on the polynomial and is typically between "
            f"{FractalInfoUtil.NEWTON_DIMENSION_RANGE[0]} and "
            f"{FractalInfoUtil.NEWTON_DIMENSION_RANGE[1]}.</p>"
            "<p style='font-size:13px; color:#555;'>"
            "<i>Based on Newton-Raphson method discovered by Isaac Newton in 1669.</i>"
            "</p>"
        )
    
    @staticmethod
    def _get_barnsley_fern_info() -> str:
        """Get Barnsley Fern information."""
        return (
            "<h3>Barnsley Fern</h3>"
            "<p>The Barnsley Fern is a fractal constructed using an iterated "
            "function system (IFS) of affine transformations. It visually "
            "resembles a natural fern leaf and demonstrates how complex natural "
            "forms can emerge from simple mathematical rules.</p>"
            "<b>Affine Transformations:</b><br>"
            "<div style='font-size:14px; margin:10px 20px;'>"
            "x<sub>n+1</sub> = a<sub>i</sub>x<sub>n</sub> + "
            "b<sub>i</sub>y<sub>n</sub> + e<sub>i</sub><br>"
            "y<sub>n+1</sub> = c<sub>i</sub>x<sub>n</sub> + "
            "d<sub>i</sub>y<sub>n</sub> + f<sub>i</sub>"
            "</div>"
            "<p>Four transformations are used, each selected with a specific "
            "probability to create different parts of the fern (stem, leaflets).</p>"
            "<p><b>Fractal Dimension:</b> The Barnsley Fern has a fractal dimension "
            f"of approximately {FractalInfoUtil.BARNSLEY_FERN_DIMENSION}.</p>"
            "<p style='font-size:13px; color:#555;'>"
            "<i>Created by mathematician Michael Barnsley in 1988.</i>"
            "</p>"
        )
    
    @staticmethod
    def _get_sierpinski_triangle_info() -> str:
        """Get Sierpinski Triangle information."""
        dimension = FractalInfoUtil.SIERPINSKI_DIMENSION
        return (
            "<div style='background:#eaf3fa; border-radius:10px; "
            "padding:12px 18px 10px 18px; margin-bottom:8px;'>"
            "<h3 style='color:#1976d2; margin-top:0;'>Sierpinski Triangle</h3>"
            "<p style='font-size:15px; color:#0a2342;'>"
            "The Sierpinski Triangle is a self-similar fractal constructed by "
            "recursively removing the central triangle from a larger equilateral "
            "triangle. It can also be generated using the chaos game algorithm, "
            "where points are plotted by repeatedly jumping halfway toward "
            "randomly chosen vertices."
            "</p>"
            "<div style='background:#fffbe7; border:1.5px solid #f7d774; "
            "border-radius:8px; padding:10px 14px; margin:10px 0;'>"
            "<b style='color:#b8860b; font-size:16px;'>Fractal Dimension:</b><br>"
            "<span style='font-size:20px; color:#b8860b;'>"
            f"D = log(3) / log(2) &asymp; {dimension:.3f}"
            "</span>"
            "</div>"
            "<p style='font-size:14.5px; color:#0a2342;'>"
            "<b>Properties:</b>"
            "</p>"
            "<ul style='font-size:14px; color:#0a2342; margin-top:5px;'>"
            "<li>Self-similar at all scales</li>"
            "<li>Infinite perimeter, zero area</li>"
            "<li>Classic example of deterministic fractal</li>"
            "</ul>"
            "<p style='font-size:13px; color:#555; margin-bottom:0;'>"
            "<i>Named after Polish mathematician Wacław Sierpiński (1915).</i>"
            "</p>"
            "</div>"
        )
    
    @staticmethod
    def _get_default_info() -> str:
        """Get default information for unknown fractal types."""
        return (
            "<div style='text-align:center; padding:20px;'>"
            "<h3 style='color:#666;'>Fractal Information</h3>"
            "<p style='color:#888; font-size:14px;'>"
            "Select a fractal type from the dropdown menu to see "
            "detailed mathematical information, formulas, and properties."
            "</p>"
            "<p style='color:#aaa; font-size:13px; margin-top:20px;'>"
            "Available fractals: Mandelbrot, Julia, Burning Ship, "
            "Newton, Barnsley Fern, Sierpinski Triangle"
            "</p>"
            "</div>"
        )


# ============================================================================
# MODULE EXPORTS
# ============================================================================

__all__ = [
    'np_to_pixmap',
    'get_resolution',
    'FractalInfoUtil',
]
