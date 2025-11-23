# API Documentation

## Fractal Workspace - Complete API Reference

**Version:** 2.0.0  
**Author:** Aarti S Ravikumar  
**License:** MIT  
**Last Updated:** November 22, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Fractals Package](#fractals-package)
   - [Fractal Generators](#fractal-generators)
   - [Utility Functions](#utility-functions)
   - [Event Handlers](#event-handlers)
3. [Box Counting Package](#box-counting-package)
   - [Core Utilities](#core-utilities)
   - [Helper Functions](#helper-functions)
   - [Interactive Widgets](#interactive-widgets)
4. [Tumor Detection Package](#tumor-detection-package)
   - [Detection Worker](#detection-worker)
   - [UI Handlers](#ui-handlers)
   - [Utilities](#utilities)
5. [Common Patterns](#common-patterns)
6. [Type Definitions](#type-definitions)
7. [Error Handling](#error-handling)
8. [Examples](#examples)

---

## Overview

The Fractal Workspace provides a comprehensive API for:
- **Generating mathematical fractals** with customizable parameters
- **Analyzing fractal dimensions** using the box counting method
- **Detecting tumors** in medical images using YOLOv5
- **Interactive visualization** with PyQt6-based UI

### Installation

```bash
pip install -r requirements.txt
```

### Quick Start

```python
from fractals import Mandelbrot, Julia
from fractals.util import np_to_pixmap, FractalInfoUtil
from boxcounting.box_counter_utils import BoxCounterUtils
from tumors.handlers import run_tumor_detection

# Generate a Mandelbrot fractal
mandelbrot = Mandelbrot(width=800, height=600, max_iter=256)
fractal_array = mandelbrot.generate()

# Calculate fractal dimension
dimension = BoxCounterUtils.compute_fractal_dimension(fractal_array)

# Get educational information
info = FractalInfoUtil.get_info("Mandelbrot Set")
```

---

## Fractals Package

### Fractal Generators

All fractal generators follow a consistent interface pattern.

#### Base Fractal Interface

```python
class FractalGenerator:
    def __init__(self, width: int, height: int, max_iter: int, **kwargs):
        """Initialize fractal generator with dimensions and iteration limit."""
        pass
    
    def generate(self) -> np.ndarray:
        """Generate and return the fractal as a NumPy array."""
        pass
```

---

#### Mandelbrot

**Module:** `fractals.mandelbrot`

##### Class: `Mandelbrot`

Generates the classic Mandelbrot set fractal using the equation `z = z² + c`.

**Constructor:**
```python
Mandelbrot(
    width: int = 800,
    height: int = 600,
    max_iter: int = 256,
    power: int = 2,
    x_min: float = -2.5,
    x_max: float = 1.5,
    y_min: float = -1.5,
    y_max: float = 1.5
)
```

**Parameters:**
- `width` (int): Image width in pixels. Default: 800
- `height` (int): Image height in pixels. Default: 600
- `max_iter` (int): Maximum iterations for escape calculation. Default: 256
- `power` (int): Exponent in the formula z^power + c. Default: 2
- `x_min`, `x_max` (float): Real axis bounds. Default: -2.5 to 1.5
- `y_min`, `y_max` (float): Imaginary axis bounds. Default: -1.5 to 1.5

**Methods:**

```python
def generate(self) -> np.ndarray:
    """
    Generate the Mandelbrot set.
    
    Returns:
        np.ndarray: 2D array of iteration counts (shape: height × width)
    
    Algorithm:
        For each point c in the complex plane:
        - Start with z = 0
        - Iterate: z = z^power + c
        - Count iterations until |z| > 2 or max_iter reached
    """
```

**Example:**
```python
from fractals import Mandelbrot

# Standard Mandelbrot
mandel = Mandelbrot(width=1024, height=768, max_iter=512)
fractal_data = mandel.generate()

# Multibrot (higher power)
multibrot = Mandelbrot(width=800, height=600, power=3)
multibrot_data = multibrot.generate()

# Zoomed into interesting region
zoom = Mandelbrot(
    width=1920,
    height=1080,
    max_iter=1000,
    x_min=-0.7,
    x_max=-0.4,
    y_min=-0.3,
    y_max=0.0
)
zoom_data = zoom.generate()
```

---

#### Julia Set

**Module:** `fractals.julia`

##### Class: `Julia`

Generates Julia set fractals, the complement to the Mandelbrot set.

**Constructor:**
```python
Julia(
    width: int = 800,
    height: int = 600,
    max_iter: int = 256,
    c_real: float = -0.7,
    c_imag: float = 0.27015,
    power: int = 2,
    x_min: float = -2.0,
    x_max: float = 2.0,
    y_min: float = -1.5,
    y_max: float = 1.5
)
```

**Parameters:**
- `width` (int): Image width in pixels. Default: 800
- `height` (int): Image height in pixels. Default: 600
- `max_iter` (int): Maximum iterations. Default: 256
- `c_real` (float): Real part of constant c. Default: -0.7
- `c_imag` (float): Imaginary part of constant c. Default: 0.27015
- `power` (int): Exponent in z^power + c. Default: 2
- `x_min`, `x_max`, `y_min`, `y_max` (float): Complex plane bounds

**Methods:**

```python
def generate(self) -> np.ndarray:
    """
    Generate the Julia set.
    
    Returns:
        np.ndarray: 2D array of iteration counts
    
    Algorithm:
        For each point z₀ in the complex plane:
        - Use fixed c (c_real + c_imag*i)
        - Iterate: z = z^power + c
        - Count iterations until |z| > 2 or max_iter reached
    """
```

**Example:**
```python
from fractals import Julia

# Classic Julia set
julia = Julia(c_real=-0.7, c_imag=0.27015)
data = julia.generate()

# Dendritic Julia
dendritic = Julia(c_real=0.0, c_imag=1.0, max_iter=512)
dendrite_data = dendritic.generate()

# Higher power Julia
cubic = Julia(c_real=-0.4, c_imag=0.6, power=3)
cubic_data = cubic.generate()
```

---

#### Newton Fractal

**Module:** `fractals.newton`

##### Class: `NewtonFractal`

Generates fractals using Newton's method for finding polynomial roots.

**Constructor:**
```python
NewtonFractal(
    width: int = 800,
    height: int = 600,
    max_iter: int = 50,
    power: int = 3,
    x_min: float = -2.0,
    x_max: float = 2.0,
    y_min: float = -2.0,
    y_max: float = 2.0
)
```

**Parameters:**
- `width`, `height` (int): Image dimensions
- `max_iter` (int): Maximum Newton iterations. Default: 50
- `power` (int): Degree of polynomial (z^power - 1 = 0). Default: 3
- `x_min`, `x_max`, `y_min`, `y_max` (float): Complex plane bounds

**Methods:**

```python
def generate(self) -> np.ndarray:
    """
    Generate Newton fractal basins of attraction.
    
    Returns:
        np.ndarray: 2D array where values indicate which root was found
    
    Algorithm:
        Solves z^power - 1 = 0 using Newton's method:
        - Iterate: z_new = z - f(z)/f'(z)
        - Color by which root converges to
        - Creates basins of attraction patterns
    """
```

**Example:**
```python
from fractals import NewtonFractal

# Cubic roots (3 basins)
cubic = NewtonFractal(power=3, max_iter=50)
basins = cubic.generate()

# Higher degree for more complex patterns
quintic = NewtonFractal(power=5, max_iter=100, width=1024, height=1024)
complex_basins = quintic.generate()
```

---

#### Burning Ship

**Module:** `fractals.burning_ship`

##### Class: `BurningShip`

Generates the Burning Ship fractal, a variant using absolute values.

**Constructor:**
```python
BurningShip(
    width: int = 800,
    height: int = 600,
    max_iter: int = 256,
    x_min: float = -2.0,
    x_max: float = 1.0,
    y_min: float = -2.0,
    y_max: float = 1.0
)
```

**Parameters:**
- `width`, `height` (int): Image dimensions
- `max_iter` (int): Maximum iterations
- `x_min`, `x_max`, `y_min`, `y_max` (float): Complex plane bounds

**Methods:**

```python
def generate(self) -> np.ndarray:
    """
    Generate the Burning Ship fractal.
    
    Returns:
        np.ndarray: 2D array of iteration counts
    
    Algorithm:
        Modified Mandelbrot with absolute values:
        - z_new = (|Re(z)| + i|Im(z)|)² + c
        - Creates ship-like appearance
        - Different symmetry than Mandelbrot
    """
```

**Example:**
```python
from fractals import BurningShip

ship = BurningShip(width=1200, height=900, max_iter=512)
data = ship.generate()
```

---

#### Sierpinski Triangle

**Module:** `fractals.sierpinski_triangle`

##### Class: `SierpinskiTriangle`

Generates the Sierpinski triangle using the chaos game algorithm.

**Constructor:**
```python
SierpinskiTriangle(
    width: int = 800,
    height: int = 600,
    max_iter: int = 100000
)
```

**Parameters:**
- `width`, `height` (int): Image dimensions
- `max_iter` (int): Number of random points to plot. Default: 100,000

**Methods:**

```python
def generate(self) -> np.ndarray:
    """
    Generate Sierpinski triangle using chaos game.
    
    Returns:
        np.ndarray: 2D boolean array (True where points exist)
    
    Algorithm:
        Chaos game method:
        1. Start with random point
        2. Choose random vertex of triangle
        3. Move halfway to that vertex
        4. Plot point
        5. Repeat max_iter times
    """
```

**Example:**
```python
from fractals import SierpinskiTriangle

# Standard detail
triangle = SierpinskiTriangle(width=800, height=600)
data = triangle.generate()

# High detail
high_detail = SierpinskiTriangle(
    width=1920,
    height=1080,
    max_iter=500000
)
detailed_data = high_detail.generate()
```

---

#### Barnsley Fern

**Module:** `fractals.barnsley_fern`

##### Class: `BarnsleyFern`

Generates a fern-like fractal using iterated function systems (IFS).

**Constructor:**
```python
BarnsleyFern(
    width: int = 800,
    height: int = 600,
    max_iter: int = 100000
)
```

**Parameters:**
- `width`, `height` (int): Image dimensions
- `max_iter` (int): Number of IFS iterations. Default: 100,000

**Methods:**

```python
def generate(self) -> np.ndarray:
    """
    Generate Barnsley fern using IFS.
    
    Returns:
        np.ndarray: 2D boolean array showing fern structure
    
    Algorithm:
        Probabilistic IFS with 4 transformations:
        - f1 (1%): Stem
        - f2 (85%): Main frond
        - f3 (7%): Left branch
        - f4 (7%): Right branch
        
        Each transformation applies affine matrix to current point.
    """
```

**Example:**
```python
from fractals import BarnsleyFern

# Standard fern
fern = BarnsleyFern(width=600, height=800)
data = fern.generate()

# High resolution
hires = BarnsleyFern(width=1200, height=1600, max_iter=1000000)
hires_data = hires.generate()
```

---

### Utility Functions

**Module:** `fractals.util`

#### Function: `np_to_pixmap`

Convert NumPy array to PyQt6 QPixmap for display.

```python
def np_to_pixmap(
    np_array: np.ndarray,
    color_scheme: str = 'viridis'
) -> Optional[QPixmap]:
    """
    Convert NumPy array to colored QPixmap.
    
    Args:
        np_array: 2D NumPy array (fractal data or image)
        color_scheme: Matplotlib colormap name
            Options: 'viridis', 'plasma', 'inferno', 'magma',
                     'hot', 'cool', 'twilight', etc.
    
    Returns:
        QPixmap object ready for display, or None if conversion fails
    
    Raises:
        ValueError: If array is empty or has invalid dimensions
        TypeError: If input is not a NumPy array
    
    Validation:
        - Checks array is not empty
        - Validates dimensions (must be 2D or 3D)
        - Normalizes values to 0-255 range
        - Applies colormap
        - Converts to QImage then QPixmap
    
    Example:
        >>> fractal = mandelbrot.generate()
        >>> pixmap = np_to_pixmap(fractal, 'plasma')
        >>> label.setPixmap(pixmap)
    """
```

**Supported Color Schemes:**
- **Sequential:** viridis, plasma, inferno, magma, cividis
- **Temperature:** hot, cool, twilight, twilight_shifted
- **Diverging:** RdYlBu, RdBu, coolwarm, bwr
- **Qualitative:** Set1, Set2, Set3, Paired

---

#### Function: `get_resolution`

Parse resolution string to width and height integers.

```python
def get_resolution(resolution: str) -> Tuple[int, int]:
    """
    Parse resolution string to (width, height) tuple.
    
    Args:
        resolution: String in format "WIDTHxHEIGHT"
            Examples: "800x600", "1920x1080", "1024x768"
    
    Returns:
        Tuple of (width, height) as integers
    
    Raises:
        ValueError: If format is invalid or values are not positive integers
    
    Validation:
        - Must contain exactly one 'x' or '×'
        - Both dimensions must be positive integers
        - Reasonable bounds checking
    
    Example:
        >>> width, height = get_resolution("1920x1080")
        >>> print(width, height)
        1920 1080
    """
```

---

#### Class: `FractalInfoUtil`

Educational information database for fractals.

```python
class FractalInfoUtil:
    """
    Provides educational information about fractals.
    
    Static Methods:
        get_info(fractal_name: str) -> str
    
    Supported Fractals:
        - Mandelbrot Set
        - Julia Set
        - Newton Fractal
        - Burning Ship
        - Sierpinski Triangle
        - Barnsley Fern
    """
    
    @staticmethod
    def get_info(fractal_name: str) -> str:
        """
        Get comprehensive information about a fractal.
        
        Args:
            fractal_name: Name of the fractal (case-insensitive)
        
        Returns:
            Formatted string with:
            - Mathematical description
            - Discovery history
            - Key properties
            - Applications
            - Interesting facts
        
        Example:
            >>> info = FractalInfoUtil.get_info("Mandelbrot Set")
            >>> print(info)
            
            === Mandelbrot Set ===
            
            The Mandelbrot set is defined by the equation z = z² + c...
            [comprehensive information follows]
        """
```

---

### Event Handlers

**Module:** `fractals.handlers`

#### Function: `generate_fractal_threaded`

Generate fractal in background thread (UI method).

```python
def generate_fractal_threaded(self) -> None:
    """
    Start fractal generation in worker thread.
    
    Args:
        self: MainWindow instance with UI components
    
    Side Effects:
        - Disables generate button
        - Shows progress indicator
        - Spawns worker thread
        - Queues result for display
    
    Thread Safety:
        Uses queue.Queue for thread-safe communication
    
    UI Flow:
        1. Validate parameters
        2. Create worker thread
        3. Start generation
        4. Check queue periodically
        5. Display result when ready
    """
```

#### Function: `save_fractal`

Save current fractal to file.

```python
def save_fractal(self) -> None:
    """
    Save displayed fractal to image file.
    
    Args:
        self: MainWindow instance
    
    Supported Formats:
        - PNG (recommended, lossless)
        - JPEG (compressed)
        - BMP (uncompressed)
        - TIFF (high quality)
    
    Features:
        - File dialog for location selection
        - Format auto-detection from extension
        - Error handling and user feedback
    
    Example Flow:
        1. User clicks Save button
        2. File dialog appears
        3. User selects location/format
        4. Image saved with current color scheme
    """
```

---

## Box Counting Package

**Module:** `boxcounting`

### Core Utilities

#### Class: `BoxCounterUtils`

**Module:** `boxcounting.box_counter_utils`

Static methods for box counting and fractal dimension analysis.

```python
class BoxCounterUtils:
    """
    Core utilities for fractal dimension calculation.
    
    Static Methods:
        compute_fractal_dimension(image, min_box_size, max_box_size)
        count_boxes(binary_image, box_size)
        create_log_spaced_box_sizes(min_size, max_size, num_points)
    """
```

##### Method: `compute_fractal_dimension`

```python
@staticmethod
def compute_fractal_dimension(
    image: np.ndarray,
    min_box_size: int = 2,
    max_box_size: int = 256,
    num_points: int = 20
) -> Tuple[float, np.ndarray, np.ndarray]:
    """
    Calculate fractal dimension using box counting method.
    
    Args:
        image: Binary or grayscale image (will be thresholded)
        min_box_size: Smallest box size to test (pixels)
        max_box_size: Largest box size to test (pixels)
        num_points: Number of box sizes to sample
    
    Returns:
        Tuple of:
        - dimension (float): Fractal dimension (typically 1.0-2.0)
        - box_sizes (np.ndarray): Array of box sizes used
        - counts (np.ndarray): Number of boxes for each size
    
    Algorithm:
        1. Convert image to binary (threshold at 127)
        2. Generate log-spaced box sizes
        3. For each box size, count boxes containing pattern
        4. Perform linear regression on log-log plot
        5. Slope = negative fractal dimension
    
    Example:
        >>> dimension, sizes, counts = BoxCounterUtils.compute_fractal_dimension(
        ...     fractal_image,
        ...     min_box_size=2,
        ...     max_box_size=128
        ... )
        >>> print(f"Fractal dimension: {dimension:.3f}")
    """
```

##### Method: `count_boxes`

```python
@staticmethod
def count_boxes(binary_image: np.ndarray, box_size: int) -> int:
    """
    Count boxes of given size that contain part of the pattern.
    
    Args:
        binary_image: Binary image (0 or 255)
        box_size: Size of counting box (square)
    
    Returns:
        Number of boxes containing at least one white pixel
    
    Algorithm:
        Divides image into grid of box_size × box_size squares
        and counts how many contain pattern pixels.
    """
```

---

### Helper Functions

**Module:** `boxcounting.box_counter_helpers`

#### Class: `BoxCounterHelpers`

```python
class BoxCounterHelpers:
    """
    Helper functions for image processing and ROI selection.
    
    Static Methods:
        load_image(file_path) -> np.ndarray
        select_roi(image) -> Tuple[int, int, int, int]
        crop_to_roi(image, roi) -> np.ndarray
    """
```

##### Method: `load_image`

```python
@staticmethod
def load_image(file_path: str) -> Optional[np.ndarray]:
    """
    Load image file as NumPy array.
    
    Args:
        file_path: Path to image file
    
    Returns:
        NumPy array (grayscale) or None if load fails
    
    Supported Formats:
        PNG, JPEG, BMP, TIFF, GIF
    
    Processing:
        - Loads image
        - Converts to grayscale if needed
        - Returns as uint8 array
    """
```

---

### Interactive Widgets

#### Class: `ROIImageLabel`

**Module:** `boxcounting.roi_image_label`

Custom QLabel for interactive region-of-interest selection.

```python
class ROIImageLabel(QLabel):
    """
    Interactive label widget for ROI selection.
    
    Signals:
        roi_selected: Emitted when ROI selection complete
            Args: (x, y, width, height) in image coordinates
    
    Mouse Interaction:
        - Click and drag to draw rectangle
        - Visual feedback during selection
        - Coordinate transformation from widget to image space
    
    Methods:
        set_image(pixmap: QPixmap)
        get_roi() -> Tuple[int, int, int, int]
        clear_roi()
    """
    
    def set_image(self, pixmap: QPixmap) -> None:
        """Set the image to display and enable ROI selection."""
    
    def get_roi(self) -> Tuple[int, int, int, int]:
        """Get current ROI in image coordinates (x, y, w, h)."""
    
    def clear_roi(self) -> None:
        """Clear current ROI selection."""
```

---

#### Function: `show_boxcount_comparison_dialog`

```python
def show_boxcount_comparison_dialog(
    parent: QWidget,
    img1: np.ndarray,
    img2: np.ndarray
) -> None:
    """
    Display interactive dialog comparing two images' fractal dimensions.
    
    Args:
        parent: Parent widget
        img1: First image (NumPy array)
        img2: Second image (NumPy array)
    
    Features:
        - Side-by-side image display
        - ROI selection on both images
        - Real-time dimension calculation
        - Comparative analysis
        - Export results
    
    UI Components:
        - Image displays with ROI tools
        - Dimension results panel
        - Log-log plots
        - Statistical comparison
    
    Example:
        >>> from boxcounting.box_counter_compare_dialog import show_boxcount_comparison_dialog
        >>> show_boxcount_comparison_dialog(window, image1, image2)
    """
```

---

## Tumor Detection Package

**Module:** `tumors`

### Detection Worker

#### Class: `DetectionWorker`

**Module:** `tumors.detection_worker`

Asynchronous worker for running tumor detection processes.

```python
class DetectionWorker(QThread):
    """
    Background worker for YOLOv5 tumor detection.
    
    Signals:
        finished: Emitted when detection completes
            Args: (success: bool, output_path: str, error_msg: str)
        progress: Emitted during processing
            Args: (message: str)
    
    Thread Safety:
        - Runs in separate QThread
        - Can be cancelled mid-execution
        - Timeout protection
    """
    
    def __init__(
        self,
        command: List[str],
        expected_output_path: str,
        timeout: int = 300
    ):
        """
        Initialize detection worker.
        
        Args:
            command: YOLOv5 command to execute
                Example: ['python', 'yolov5/detect.py', '--weights', ...]
            expected_output_path: Where detection saves result
            timeout: Maximum execution time (seconds)
                Default: 300 (5 minutes)
                Max: 1800 (30 minutes)
        
        Raises:
            ValueError: If command invalid or timeout out of range
            FileNotFoundError: If script path doesn't exist
        
        Validation:
            - Validates command structure
            - Checks script exists
            - Validates output path
            - Ensures timeout in reasonable range
        """
```

##### Methods:

```python
def run(self) -> None:
    """
    Execute detection subprocess.
    
    Process:
        1. Emit progress signal
        2. Run subprocess with timeout
        3. Verify output file created
        4. Emit finished signal with results
    
    Error Handling:
        - TimeoutExpired: Detection took too long
        - CalledProcessError: Detection failed
        - FileNotFoundError: Output not created
        - PermissionError: Cannot write output
    
    Thread Safety:
        Checks self._cancelled flag periodically
    """

def is_running(self) -> bool:
    """Check if worker is currently executing."""

def cancel(self) -> None:
    """Request worker cancellation (best-effort)."""
```

**Example:**

```python
from tumors.detection_worker import DetectionWorker

worker = DetectionWorker(
    command=[
        'python', 'yolov5/detect.py',
        '--weights', 'models/tumor_detector_axial.pt',
        '--source', 'image.jpg',
        '--project', 'output',
        '--name', 'results'
    ],
    expected_output_path='output/results/image.jpg',
    timeout=600  # 10 minutes
)

worker.finished.connect(on_detection_complete)
worker.progress.connect(on_progress_update)
worker.start()
```

---

### UI Handlers

**Module:** `tumors.handlers`

#### Function: `run_tumor_detection`

```python
def run_tumor_detection(self, idx: int) -> None:
    """
    Run tumor detection on selected image.
    
    Args:
        self: MainWindow instance with tumor UI components
        idx: Image slot index (0=axial, 1=coronal, 2=sagittal)
    
    Process:
        1. Get selected image from UI
        2. Validate model exists for view
        3. Create temporary file if needed
        4. Build YOLOv5 command
        5. Start DetectionWorker thread
        6. Display results when complete
    
    Features:
        - Multi-format support (JPG, PNG, GIF, TIFF)
        - Automatic temp file management
        - Progress feedback
        - Error recovery
    
    Model Selection:
        - idx 0: tumor_detector_axial.pt
        - idx 1: tumor_detector_coronal.pt
        - idx 2: tumor_detector_sagittal.pt
    
    Timeout:
        60 seconds per detection
    
    Example:
        >>> # User double-clicks image in slot 0
        >>> run_tumor_detection(window, idx=0)
    """
```

#### Function: `handle_tumor_image_double_click`

```python
def handle_tumor_image_double_click(
    self,
    idx: int,
    label: QLabel
) -> None:
    """
    Handle double-click on tumor image slot.
    
    Args:
        self: MainWindow instance
        idx: Image slot index
        label: QLabel that was double-clicked
    
    Process:
        1. Open file dialog
        2. Load selected image
        3. Create thumbnail
        4. Display in label
        5. Store reference for detection
    
    Supported Formats:
        - Images: *.jpg, *.jpeg, *.png, *.bmp, *.tiff
        - Animations: *.gif (first frame extracted)
    
    Thumbnail:
        - Max size: 200×200 pixels
        - Maintains aspect ratio
        - Smooth transformation
    """
```

#### Function: `zoom_tumor_image`

```python
def zoom_tumor_image(self, idx: int, direction: str) -> None:
    """
    Zoom tumor image in/out.
    
    Args:
        self: MainWindow instance
        idx: Image slot index
        direction: 'in', 'out', or 'reset'
    
    Zoom Behavior:
        - 'in': Multiply by 1.2× (ZOOM_STEP)
        - 'out': Divide by 1.2×
        - 'reset': Return to original size
    
    Zoom Range:
        - Minimum: 0.1× (10%)
        - Maximum: 10.0× (1000%)
    
    Quality:
        - Smooth transformation
        - Maintains aspect ratio
        - No pixelation at reasonable zoom levels
    """
```

---

### Utilities

**Module:** `tumors.tumor_detector`

#### Function: `download_sample_images`

```python
def download_sample_images(
    output_dir: Optional[str] = None
) -> List[str]:
    """
    Download sample tumor detection images.
    
    Args:
        output_dir: Directory to save images
            Default: tumors/originals
    
    Returns:
        List of paths to successfully downloaded images
    
    Downloads:
        - Axial view: Brain MRI axial slice
        - Coronal view: Brain MRI coronal slice
        - Sagittal view: Brain MRI sagittal slice
    
    Network:
        - 3 retry attempts per image
        - 30 second timeout per download
        - Validates file size > 0
    
    Example:
        >>> paths = download_sample_images('data/samples')
        >>> print(f"Downloaded {len(paths)} images")
    """
```

#### Function: `get_model_path`

```python
def get_model_path(view: str) -> str:
    """
    Get model file path for anatomical view.
    
    Args:
        view: View name ('axial', 'coronal', or 'sagittal')
    
    Returns:
        Path to corresponding .pt model file
    
    Raises:
        ValueError: If view name not recognized
    
    Model Locations:
        - axial: tumors/output_models/tumor_detector_axial.pt
        - coronal: tumors/output_models/tumor_detector_coronal.pt
        - sagittal: tumors/output_models/tumor_detector_sagittal.pt
    
    Example:
        >>> model = get_model_path('axial')
        >>> print(model)
        tumors/output_models/tumor_detector_axial.pt
    """
```

#### Function: `validate_model_files`

```python
def validate_model_files() -> dict:
    """
    Check if all required model files exist.
    
    Returns:
        Dictionary: {'view_name': exists_bool, ...}
            Example: {'axial': True, 'coronal': False, 'sagittal': True}
    
    Use Case:
        Check before running detection to ensure models available.
    
    Example:
        >>> status = validate_model_files()
        >>> missing = [v for v, exists in status.items() if not exists]
        >>> if missing:
        ...     print(f"Missing models: {', '.join(missing)}")
    """
```

---

## Common Patterns

### Threading Pattern

All background operations use QThread for UI responsiveness:

```python
from PyQt6.QtCore import QThread, pyqtSignal

class Worker(QThread):
    finished = pyqtSignal(object)  # Result signal
    progress = pyqtSignal(str)     # Progress signal
    
    def run(self):
        # Do work
        result = perform_computation()
        self.finished.emit(result)

# In UI code:
worker = Worker()
worker.finished.connect(on_complete)
worker.start()
```

### Error Handling Pattern

Consistent error handling across modules:

```python
try:
    result = operation()
except SpecificError as e:
    logger.error(f"Operation failed: {e}")
    # Show user-friendly message
    QMessageBox.warning(self, "Error", str(e))
except Exception as e:
    logger.exception("Unexpected error")
    # Generic error message
    QMessageBox.critical(self, "Error", "An unexpected error occurred")
```

### Logging Pattern

All modules use Python's logging:

```python
import logging

logger = logging.getLogger(__name__)

# Usage:
logger.debug("Detailed debug info")
logger.info("Normal operation")
logger.warning("Warning condition")
logger.error("Error occurred")
logger.exception("Error with traceback")
```

---

## Type Definitions

### Common Types

```python
from typing import Tuple, List, Optional, Union
import numpy as np
from PyQt6.QtGui import QPixmap

# Image types
ImageArray = np.ndarray  # 2D or 3D array
GrayscaleImage = np.ndarray  # 2D array, uint8
ColorImage = np.ndarray  # 3D array (H, W, 3), uint8

# Coordinate types
Point = Tuple[int, int]  # (x, y)
ROI = Tuple[int, int, int, int]  # (x, y, width, height)
Resolution = Tuple[int, int]  # (width, height)

# Fractal result types
FractalData = np.ndarray  # 2D array of iteration counts or boolean
DimensionResult = Tuple[float, np.ndarray, np.ndarray]  # (dimension, sizes, counts)

# Command types
Command = List[str]  # Subprocess command as list
FilePath = str  # Absolute or relative file path
```

---

## Error Handling

### Exception Hierarchy

```python
# Built-in exceptions used:
ValueError          # Invalid parameters
TypeError           # Wrong type
FileNotFoundError   # File/path doesn't exist
PermissionError     # No permission for operation
TimeoutError        # Operation timed out
RuntimeError        # Runtime error condition

# subprocess exceptions:
subprocess.TimeoutExpired      # Subprocess timeout
subprocess.CalledProcessError  # Subprocess failed

# Network exceptions:
urllib.error.URLError    # Network error
urllib.error.HTTPError   # HTTP error (404, 500, etc.)
```

### Error Messages

User-facing error messages follow this format:

```python
# Good error messages:
"Failed to load image: file not found"
"Detection timed out after 60 seconds"
"Invalid resolution format. Use WIDTHxHEIGHT (e.g., 1920x1080)"

# Bad error messages (avoid):
"Error"
"Something went wrong"
"Exception occurred"
```

---

## Examples

### Example 1: Generate and Save Fractal

```python
from fractals import Mandelbrot
from fractals.util import np_to_pixmap

# Generate fractal
fractal_gen = Mandelbrot(
    width=1920,
    height=1080,
    max_iter=512,
    x_min=-0.8,
    x_max=-0.4,
    y_min=-0.3,
    y_max=0.1
)

fractal_data = fractal_gen.generate()

# Convert to image
pixmap = np_to_pixmap(fractal_data, color_scheme='plasma')

# Save to file
pixmap.save('mandelbrot_zoom.png', 'PNG')

print(f"Saved fractal: {fractal_data.shape}")
```

### Example 2: Calculate Fractal Dimension

```python
from fractals import SierpinskiTriangle
from boxcounting.box_counter_utils import BoxCounterUtils
import numpy as np

# Generate fractal
sierpinski = SierpinskiTriangle(width=1024, height=1024, max_iter=200000)
fractal = sierpinski.generate()

# Convert boolean to uint8
fractal_img = (fractal * 255).astype(np.uint8)

# Calculate dimension
dimension, sizes, counts = BoxCounterUtils.compute_fractal_dimension(
    fractal_img,
    min_box_size=4,
    max_box_size=256,
    num_points=25
)

print(f"Fractal dimension: {dimension:.4f}")
print(f"Expected (Sierpinski): ~1.585")
```

### Example 3: Batch Generate Fractals

```python
from fractals import Julia
from fractals.util import np_to_pixmap
import numpy as np

# Generate Julia set family
c_values = [
    (-0.7, 0.27015),   # Classic
    (0.0, 1.0),        # Dendritic
    (-0.4, 0.6),       # Spiral
    (-0.8, 0.156),     # Douady's rabbit
]

for idx, (c_real, c_imag) in enumerate(c_values):
    julia = Julia(
        width=800,
        height=600,
        max_iter=256,
        c_real=c_real,
        c_imag=c_imag
    )
    
    data = julia.generate()
    pixmap = np_to_pixmap(data, 'viridis')
    pixmap.save(f'julia_{idx+1}.png', 'PNG')
    
    print(f"Generated Julia set {idx+1}: c = {c_real} + {c_imag}i")
```

### Example 4: Compare Two Images

```python
from boxcounting.box_counter_utils import BoxCounterUtils
from boxcounting.box_counter_helpers import BoxCounterHelpers
import cv2

# Load two images
img1 = BoxCounterHelpers.load_image('image1.jpg')
img2 = BoxCounterHelpers.load_image('image2.jpg')

# Calculate dimensions
dim1, _, _ = BoxCounterUtils.compute_fractal_dimension(img1)
dim2, _, _ = BoxCounterUtils.compute_fractal_dimension(img2)

# Compare
print(f"Image 1 dimension: {dim1:.4f}")
print(f"Image 2 dimension: {dim2:.4f}")
print(f"Difference: {abs(dim1 - dim2):.4f}")

if dim1 > dim2:
    print("Image 1 has higher complexity")
else:
    print("Image 2 has higher complexity")
```

### Example 5: Tumor Detection Pipeline

```python
from tumors.tumor_detector import download_sample_images, validate_model_files
from tumors.handlers import run_tumor_detection
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)

# Validate models exist
status = validate_model_files()
if not all(status.values()):
    missing = [view for view, exists in status.items() if not exists]
    print(f"Warning: Missing models for {missing}")

# Download sample images
paths = download_sample_images('data/samples')
print(f"Downloaded {len(paths)} sample images")

# In UI context (would be called from MainWindow):
# run_tumor_detection(window, idx=0)  # Run on axial view
```

### Example 6: Custom Fractal with Different Colormaps

```python
from fractals import NewtonFractal
from fractals.util import np_to_pixmap

# Generate Newton fractal
newton = NewtonFractal(
    width=1200,
    height=1200,
    power=5,  # Quintic roots
    max_iter=100
)

basins = newton.generate()

# Save with different color schemes
colormaps = ['twilight', 'hsv', 'rainbow', 'jet']

for cmap in colormaps:
    pixmap = np_to_pixmap(basins, color_scheme=cmap)
    pixmap.save(f'newton_quintic_{cmap}.png', 'PNG')
    print(f"Saved with {cmap} colormap")
```

---

## Additional Resources

### Documentation Files

- **[README.md](README.md)**: Project overview and quick start
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Contribution guidelines
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)**: Community standards

### Wiki Pages

Located in `wiki/` directory:

- **[Home.md](wiki/Home.md)**: Wiki homepage
- **[Fractal-Types-and-Equations.md](wiki/Fractal-Types-and-Equations.md)**: Mathematical details
- **[Box-Counting-Method.md](wiki/Box-Counting-Method.md)**: Algorithm explanation
- **[Box-Counting-Comparison-Stepwise.md](wiki/Box-Counting-Comparison-Stepwise.md)**: Usage guide
- **[Fractals-in-Medical-Imaging.md](wiki/Fractals-in-Medical-Imaging.md)**: Medical applications

### Source Code Organization

```
fractals/               # Main package
├── __init__.py        # Package exports
├── mandelbrot.py      # Mandelbrot set
├── julia.py           # Julia sets
├── newton.py          # Newton fractals
├── burning_ship.py    # Burning Ship
├── sierpinski_triangle.py  # Sierpinski
├── barnsley_fern.py   # Barnsley fern
├── util.py            # Utilities
└── handlers.py        # UI event handlers

boxcounting/           # Box counting package
├── __init__.py
├── box_counter_utils.py      # Core algorithms
├── box_counter_helpers.py    # Helper functions
├── box_counter_compare_dialog.py  # Comparison UI
└── roi_image_label.py        # ROI widget

tumors/                # Tumor detection package
├── detection_worker.py  # Async worker
├── handlers.py         # UI handlers
└── tumor_detector.py   # Utilities

yolov5/                # YOLOv5 integration
tests/                 # Unit tests
```

---

## Support

### Logging

Enable debug logging for troubleshooting:

```python
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='fractals_debug.log'
)
```

### Performance Tips

1. **Fractal Generation:**
   - Start with lower resolutions (800×600)
   - Increase max_iter gradually
   - Use threading for responsiveness

2. **Box Counting:**
   - Reduce num_points for faster computation
   - Use appropriate min/max box sizes
   - Consider image downsampling for large images

3. **Tumor Detection:**
   - Use appropriate confidence threshold (0.4 default)
   - Monitor timeout settings
   - Clean up temporary files

### Common Issues

**Issue:** Fractal generation is slow
- **Solution:** Reduce resolution or max_iter, or use JIT compilation

**Issue:** Box counting gives unexpected results
- **Solution:** Check image is binary, adjust box size range

**Issue:** Detection fails with timeout
- **Solution:** Increase timeout parameter, check GPU availability

---

## Version History

**Version 2.0.0** (Current)
- Refactored all modules to production quality
- Added comprehensive documentation
- Enhanced error handling
- Improved type safety with type hints
- Added logging throughout

**Version 1.0.0**
- Initial implementation
- Basic fractal generators
- Box counting functionality
- Tumor detection integration

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

**Author:** Aarti S Ravikumar  
**Copyright:** © 2025

---

*This documentation is current as of November 22, 2025. For the latest updates, see the repository.*
