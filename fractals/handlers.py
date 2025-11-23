"""
Fractal UI Event Handlers Module

Provides event handlers and utility functions for fractal-related UI operations
including parameter changes, fractal generation, display rendering, and file I/O.

This module serves as the bridge between the UI layer (PyQt6 widgets) and the
fractal generation algorithms, handling:
    - User input validation and parameter updates
    - Threaded fractal generation to maintain UI responsiveness
    - Image rendering and visualization with matplotlib
    - File save operations

Architecture:
    All handlers accept 'self' as the first parameter, which should be the
    MainWindow instance from ui.py. This allows handlers to access UI widgets
    and application state without tight coupling.

Threading Model:
    Fractal generation is performed in a background thread to prevent UI
    freezing during computation-intensive operations. Results are communicated
    back to the main thread via a queue.

Usage:
    from fractals.handlers import combo_frac_type_changed, generate_fractal_threaded
    
    # In MainWindow class:
    combo_box.currentTextChanged.connect(lambda s: combo_frac_type_changed(self, s))
    button.clicked.connect(lambda: generate_fractal_threaded(self))

Note:
    These handlers modify MainWindow state directly. Ensure the MainWindow
    instance has all required attributes before calling handlers.
"""

from typing import Tuple, Optional, Any
import queue
import threading
import time

import cv2
import matplotlib
import matplotlib.colors
import matplotlib.pyplot as plt
import numpy as np
from PyQt6.QtGui import QImage, QPixmap
from PyQt6.QtWidgets import QMessageBox, QFileDialog

from fractals.barnsley_fern import BarnsleyFern
from fractals.burning_ship import BurningShip
from fractals.julia import Julia
from fractals.mandelbrot import Mandelbrot
from fractals.newton import NewtonFractal
from fractals.sierpinski_triangle import SierpinskiTriangle
from fractals.util import FractalInfoUtil, np_to_pixmap, get_resolution


# ============================================================================
# CONSTANTS
# ============================================================================

# Progress Tracking
PROGRESS_COMPLETE: int = 100
"""Progress bar value when generation is complete"""

QUEUE_CHECK_DELAY: float = 0.1
"""Delay in seconds between queue checks"""

THREAD_START_DELAY: float = 0.1
"""Delay after starting thread to ensure initialization"""

# File Operations
DEFAULT_SAVE_FILENAME: str = "fractal.png"
"""Default filename for saving fractal images"""

SAVE_IMAGE_DPI: int = 100
"""DPI setting for saved fractal images"""

SAVE_IMAGE_FILTER: str = "(*.png)"
"""File filter for save dialog"""

# Fractal-Specific Display Settings
FRACTAL_EXTENTS: dict = {
    "Mandelbrot": (-2, 1, -1.5, 1.5),
    "Julia": (-2, 2, -2, 2),
    "Burning Ship": (-2, 2, -2, 2),
    "Newton": (-2, 2, -2, 2),
    "Barnsley Fern": (0, 8, 0, 10),
    "Sierpinski Triangle": (0, 1, 0, 1),
}
"""Coordinate extents for each fractal type"""

SIERPINSKI_COLORMAP: str = "binary"
"""Colormap specifically for Sierpinski Triangle"""

# Fractal Parameters
POWER_DEPENDENT_FRACTALS: list = ["Mandelbrot", "Burning Ship"]
"""Fractals that use the power parameter"""

JULIA_CONSTANT_FRACTAL: str = "Julia"
"""Fractal that uses Julia set constant (c)"""


# ============================================================================
# PARAMETER VALIDATION AND UI HANDLERS
# ============================================================================

def combo_frac_type_changed(self, fractal_type: str) -> None:
    """
    Handle fractal type selection changes.
    
    Updates the information display and shows/hides parameter fields
    based on the selected fractal type's requirements.
    
    Args:
        self: MainWindow instance
        fractal_type: Selected fractal type name
        
    Side Effects:
        - Updates self.fractal_type
        - Shows/hides power parameter widgets (Mandelbrot, Burning Ship)
        - Shows/hides Julia constant parameter widgets (Julia set)
        - Updates fractal information text area if available
    """
    # Update fractal information display
    if hasattr(self, "text_area"):
        fractal_info = FractalInfoUtil.get_fractal_info(fractal_type)
        self.text_area.setText(fractal_info)
    
    # Store selected fractal type
    self.fractal_type = fractal_type
    
    # Configure parameter visibility based on fractal type
    _update_parameter_visibility(self, fractal_type)


def _update_parameter_visibility(self, fractal_type: str) -> None:
    """
    Show or hide parameter widgets based on fractal type requirements.
    
    Args:
        self: MainWindow instance
        fractal_type: Selected fractal type name
    """
    # Determine which parameters are needed
    needs_power = fractal_type in POWER_DEPENDENT_FRACTALS
    needs_julia_constant = fractal_type == JULIA_CONSTANT_FRACTAL
    
    # Update power parameter visibility
    self.power_label.setVisible(needs_power)
    self.power_entry.setVisible(needs_power)
    
    # Update Julia constant parameter visibility
    self.c_real_label.setVisible(needs_julia_constant)
    self.c_real_entry.setVisible(needs_julia_constant)
    self.c_imag_label.setVisible(needs_julia_constant)
    self.c_imag_entry.setVisible(needs_julia_constant)


def combo_resolution_changed(self, resolution: str) -> None:
    """
    Handle resolution selection changes.
    
    Args:
        self: MainWindow instance
        resolution: Selected resolution string (e.g., "800x600")
        
    Side Effects:
        Updates self.resolution
    """
    self.resolution = resolution


def combo_color_scheme_changed(self, color_scheme: str) -> None:
    """
    Handle color scheme selection changes.
    
    Args:
        self: MainWindow instance
        color_scheme: Selected matplotlib colormap name
        
    Side Effects:
        Updates self.color_scheme
    """
    self.color_scheme = color_scheme


def edit_max_iter_changed(self) -> None:
    """
    Validate and update maximum iterations parameter.
    
    Attempts to parse the max iterations entry field as an integer.
    Shows a warning dialog if the input is invalid.
    
    Args:
        self: MainWindow instance
        
    Side Effects:
        Updates self.max_iter if input is valid
        Shows warning dialog if input is invalid
    """
    try:
        max_iter_value = int(self.max_iter_entry.text())
        self.max_iter = max_iter_value
    except ValueError:
        QMessageBox.warning(
            self,
            "Invalid Maximum Iterations",
            "The entered value must be a positive integer.\n\n"
            "Example: 256, 512, 1024"
        )


def edit_power_changed(self) -> None:
    """
    Validate and update power parameter.
    
    Attempts to parse the power entry field as a float, accepting both
    comma and period as decimal separators for international compatibility.
    
    Args:
        self: MainWindow instance
        
    Side Effects:
        Updates self.power if input is valid
        Shows warning dialog if input is invalid
    """
    try:
        # Normalize decimal separator (support both comma and period)
        power_text = self.power_entry.text().replace(",", ".")
        power_value = float(power_text)
        self.power = power_value
    except ValueError:
        QMessageBox.warning(
            self,
            "Invalid Power Value",
            "The entered value must be a decimal number.\n\n"
            "Example: 2.0, 3.5, 4.0"
        )


def edit_c_real_changed(self) -> None:
    """
    Validate and update Julia set constant (real part).
    
    Attempts to parse the real part entry field as a float, accepting both
    comma and period as decimal separators.
    
    Args:
        self: MainWindow instance
        
    Side Effects:
        Updates self.c_real if input is valid
        Shows warning dialog if input is invalid
    """
    try:
        # Normalize decimal separator
        c_real_text = self.c_real_entry.text().replace(",", ".")
        c_real_value = float(c_real_text)
        self.c_real = c_real_value
    except ValueError:
        QMessageBox.warning(
            self,
            "Invalid Julia Constant (Real Part)",
            "The entered value must be a decimal number.\n\n"
            "Example: -0.7, 0.285, 0.0"
        )


def edit_c_imag_changed(self) -> None:
    """
    Validate and update Julia set constant (imaginary part).
    
    Attempts to parse the imaginary part entry field as a float, accepting
    both comma and period as decimal separators.
    
    Args:
        self: MainWindow instance
        
    Side Effects:
        Updates self.c_imag if input is valid
        Shows warning dialog if input is invalid
    """
    try:
        # Normalize decimal separator
        c_imag_text = self.c_imag_entry.text().replace(",", ".")
        c_imag_value = float(c_imag_text)
        self.c_imag = c_imag_value
    except ValueError:
        QMessageBox.warning(
            self,
            "Invalid Julia Constant (Imaginary Part)",
            "The entered value must be a decimal number.\n\n"
            "Example: 0.27015, -0.1, 0.0"
        )


# ============================================================================
# THREADED FRACTAL GENERATION
# ============================================================================

def generate_fractal_threaded(self) -> None:
    """
    Start fractal generation in a background thread.
    
    Initiates threaded fractal generation to keep the UI responsive during
    computation. Creates a queue for thread communication and starts monitoring
    for completion.
    
    Args:
        self: MainWindow instance
        
    Side Effects:
        - Creates self.queue for inter-thread communication
        - Starts background thread running generate_fractal()
        - Initiates queue monitoring via check_queue()
        - Shows error dialog if thread creation fails
        
    Threading Model:
        Main Thread: UI updates, queue monitoring
        Worker Thread: Fractal computation
        Communication: Queue (thread-safe)
    """
    self.queue = queue.Queue()
    
    try:
        # Start generation in background thread
        worker_thread = threading.Thread(
            target=generate_fractal,
            args=(self, self.queue),
            daemon=True
        )
        worker_thread.start()
        
        # Allow thread to initialize
        time.sleep(THREAD_START_DELAY)
        
        # Begin monitoring for completion
        check_queue(self)
        
    except Exception as e:
        QMessageBox.critical(
            self,
            "Thread Creation Error",
            f"Failed to start fractal generation thread.\n\n"
            f"Error: {e}"
        )


def check_queue(self) -> None:
    """
    Monitor the generation queue for completion.
    
    Recursively checks the queue for fractal generation results. If the
    result is ready, displays it; otherwise, updates progress and rechecks.
    Handles both successful results and error messages from worker thread.
    
    Args:
        self: MainWindow instance
        
    Side Effects:
        - Updates progress bar value
        - Calls display_fractal() when generation completes
        - Shows error dialog if worker thread encountered an error
        - Recursively calls itself until completion
        - Re-enables generate button on error
        
    Note:
        This implements a polling mechanism rather than blocking wait to
        keep the UI responsive. Receives tuples from worker thread:
        - Success: (fractal, fractal_type, color_scheme)
        - Error: ('ERROR', error_title, error_message)
    """
    try:
        # Try to get result without blocking
        result = self.queue.get_nowait()
        
        # Check if this is an error message from worker thread
        # Must check isinstance and type of first element carefully to avoid
        # ambiguous truth value error when result is a numpy array
        if (isinstance(result, tuple) and 
            len(result) == 3 and 
            isinstance(result[0], str) and 
            result[0] == 'ERROR'):
            _, error_title, error_message = result
            # Show error dialog on main thread (safe)
            QMessageBox.critical(self, error_title, error_message)
            self.generate_button.setEnabled(True)
            self.progress.setValue(0)
        else:
            # Normal result: unpack and display
            fractal, fractal_type, color_scheme = result
            # Generation complete - update UI
            self.progress.setValue(PROGRESS_COMPLETE)
            display_fractal(self, fractal, fractal_type, color_scheme)
        
    except queue.Empty:
        # Still generating - update progress and recheck
        self.progress.setValue(self.progress_value)
        time.sleep(QUEUE_CHECK_DELAY)
        check_queue(self)
        
    except Exception as e:
        # Queue communication error
        QMessageBox.critical(
            self,
            "Queue Communication Error",
            f"Error retrieving fractal generation result.\n\n"
            f"Error: {e}"
        )
        self.generate_button.setEnabled(True)
        self.progress.setValue(0)


def generate_fractal(self, q: queue.Queue) -> None:
    """
    Generate the selected fractal (worker thread function).
    
    Creates the appropriate fractal generator instance based on the selected
    type and parameters, generates the fractal, and places the result in the
    queue for the main thread to retrieve.
    
    Args:
        self: MainWindow instance
        q: Queue for passing results back to main thread
        
    Side Effects:
        - Disables generate button during computation
        - Resets progress bar
        - Creates fractal generator instance
        - Puts result tuple in queue:
            * Success: (fractal, fractal_type, color_scheme)
            * Error: ('ERROR', error_title, error_message)
        - Stores fractal data in self.fractal
        
    Threading:
        This function runs in a background thread and should NOT directly
        modify UI elements or show dialogs. All UI communication must go
        through the queue to avoid threading issues (especially on macOS).
    """
    # Disable UI controls during generation
    self.generate_button.setEnabled(False)
    self.progress_value = 0
    self.progress.setValue(self.progress_value)
    
    # Retrieve generation parameters
    fractal_type = self.fractal_type
    width, height = get_resolution(self)
    max_iter = self.max_iter
    color_scheme = self.color_scheme
    
    try:
        # Generate the appropriate fractal
        fractal = _create_and_generate_fractal(
            self, fractal_type, width, height, max_iter
        )
        
        # Send result to main thread via queue
        q.put((fractal, fractal_type, color_scheme))
        
        # Store for potential save operation
        self.fractal = fractal
        self.color_scheme_final = color_scheme
        
    except Exception as e:
        # Send error to main thread via queue (do NOT show dialog from worker thread!)
        error_message = (
            f"Error generating {fractal_type} fractal.\n\n"
            f"Error: {e}\n\n"
            f"Please check your parameters and try again."
        )
        q.put(('ERROR', 'Fractal Generation Error', error_message))


def _create_and_generate_fractal(
    self,
    fractal_type: str,
    width: int,
    height: int,
    max_iter: int
) -> np.ndarray:
    """
    Create and generate the specified fractal.
    
    Factory function that instantiates the appropriate fractal generator
    class and calls its generate() method.
    
    Args:
        self: MainWindow instance
        fractal_type: Type of fractal to generate
        width: Image width in pixels
        height: Image height in pixels
        max_iter: Maximum iterations
        
    Returns:
        Generated fractal as 2D numpy array
        
    Raises:
        ValueError: If fractal_type is unknown
    """
    if fractal_type == "Mandelbrot":
        return Mandelbrot(
            width, height,
            x_min=-2, x_max=1,
            y_min=-1.5, y_max=1.5,
            max_iter=max_iter,
            power=self.power
        ).generate()
    
    elif fractal_type == "Julia":
        c = complex(self.c_real, self.c_imag)
        return Julia(
            width, height,
            x_min=-2, x_max=2,
            y_min=-2, y_max=2,
            max_iter=max_iter,
            c=c
        ).generate()
    
    elif fractal_type == "Burning Ship":
        return BurningShip(
            width, height,
            x_min=-2, x_max=2,
            y_min=-2, y_max=2,
            max_iter=max_iter,
            power=self.power
        ).generate()
    
    elif fractal_type == "Newton":
        return NewtonFractal(
            width, height,
            x_min=-2, x_max=2,
            y_min=-2, y_max=2,
            max_iter=max_iter
        ).generate()
    
    elif fractal_type == "Barnsley Fern":
        return BarnsleyFern(
            width, height,
            max_iter=max_iter
        ).generate()
    
    elif fractal_type == "Sierpinski Triangle":
        return SierpinskiTriangle(
            width, height,
            max_iter=max_iter
        ).generate()
    
    else:
        raise ValueError(f"Unknown fractal type: {fractal_type}")


# ============================================================================
# FRACTAL DISPLAY AND VISUALIZATION
# ============================================================================

def display_fractal(
    self,
    fractal: np.ndarray,
    fractal_type: str,
    color_scheme: str
) -> None:
    """
    Display the generated fractal image on the matplotlib canvas.
    
    Renders the fractal array using matplotlib with appropriate colormaps,
    normalization, and coordinate extents for the selected fractal type.
    
    Args:
        self: MainWindow instance
        fractal: 2D numpy array of fractal data
        fractal_type: Name of the fractal type
        color_scheme: Matplotlib colormap name
        
    Side Effects:
        - Updates self.fractal, self.fractal_type, self.color_scheme_final
        - Clears and redraws matplotlib axes
        - Updates canvas with new image
        - Re-enables generate button
        - Shows error dialog if rendering fails
        
    Visualization:
        - Applies data normalization for color mapping
        - Sets appropriate coordinate extents per fractal type
        - Adds title showing fractal type and color scheme
    """
    try:
        # Store display parameters
        self.fractal = fractal
        self.fractal_type = fractal_type
        self.color_scheme_final = color_scheme
        
        # Clear previous plot
        self.ax.clear()
        
        # Get display configuration for this fractal type
        cmap, norm, extent = _get_display_config(fractal, fractal_type, color_scheme)
        
        # Render fractal image
        self.ax.imshow(fractal, cmap=cmap, norm=norm, extent=extent)
        self.ax.set_title(f"{fractal_type} - {color_scheme}")
        
        # Update canvas
        self.canvas.draw()
        
    except Exception as e:
        QMessageBox.critical(
            self,
            "Display Error",
            f"Error rendering fractal visualization.\n\n"
            f"Error: {e}"
        )
    finally:
        # Always re-enable generate button
        self.generate_button.setEnabled(True)


def _get_display_config(
    fractal: np.ndarray,
    fractal_type: str,
    color_scheme: str
) -> Tuple[Any, matplotlib.colors.Normalize, Tuple[float, float, float, float]]:
    """
    Get matplotlib display configuration for a fractal type.
    
    Determines the colormap, normalization, and coordinate extents
    appropriate for the specified fractal type.
    
    Args:
        fractal: 2D numpy array of fractal data
        fractal_type: Name of the fractal type
        color_scheme: Matplotlib colormap name
        
    Returns:
        Tuple of (colormap, normalization, extent)
    """
    # Special case: Sierpinski Triangle uses binary colormap
    if fractal_type == "Sierpinski Triangle":
        cmap = plt.get_cmap(SIERPINSKI_COLORMAP)
        norm = matplotlib.colors.Normalize(vmin=0, vmax=1)
    else:
        cmap = plt.get_cmap(color_scheme)
        norm = matplotlib.colors.Normalize(
            vmin=fractal.min(),
            vmax=fractal.max()
        )
    
    # Get coordinate extent for this fractal type
    extent = FRACTAL_EXTENTS.get(fractal_type, (0, 1, 0, 1))
    
    return cmap, norm, extent


# ============================================================================
# FILE I/O OPERATIONS
# ============================================================================

def save_fractal(self) -> None:
    """
    Save the currently displayed fractal to a PNG file.
    
    Opens a file save dialog and writes the fractal image using matplotlib's
    imsave function with the currently selected colormap.
    
    Args:
        self: MainWindow instance
        
    Side Effects:
        - Opens file save dialog
        - Writes PNG file to selected location
        - Shows success or error dialog
        
    Requirements:
        Requires self.fractal to exist (must generate fractal first)
    """
    if not hasattr(self, "fractal"):
        QMessageBox.warning(
            self,
            "No Fractal Generated",
            "Please generate a fractal before attempting to save."
        )
        return
    
    try:
        # Open save file dialog
        filename, _ = QFileDialog.getSaveFileName(
            self,
            caption="Save Fractal Image",
            directory=DEFAULT_SAVE_FILENAME,
            filter=SAVE_IMAGE_FILTER
        )
        
        # Check if user canceled
        if not filename:
            return
        
        # Get colormap and save image
        cmap = plt.get_cmap(self.color_scheme_final)
        plt.imsave(
            filename,
            self.fractal,
            cmap=cmap,
            origin="lower",
            dpi=SAVE_IMAGE_DPI
        )
        
        QMessageBox.information(
            self,
            "Save Successful",
            f"Fractal image saved successfully to:\n{filename}"
        )
        
    except Exception as e:
        QMessageBox.critical(
            self,
            "Save Error",
            f"Error saving fractal image.\n\n"
            f"Error: {e}"
        )


# ============================================================================
# LEGACY/PLACEHOLDER FUNCTIONS
# ============================================================================

def show_boxcount_comparison(parent, img1: np.ndarray, img2: np.ndarray) -> None:
    """
    Show box counting comparison dialog (placeholder).
    
    This is a placeholder function maintained for backward compatibility.
    The actual box counting comparison functionality is implemented in
    the boxcounting package.
    
    Args:
        parent: Parent widget
        img1: First image array
        img2: Second image array
        
    Note:
        This function is deprecated. Use the boxcounting package instead.
    """
    # Placeholder - actual implementation in boxcounting package
    pass

