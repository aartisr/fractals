"""
Burning Ship Fractal Generator Module

Implements the Burning Ship fractal, a fascinating variation of the Mandelbrot set
discovered by Michael Michelitsch and Otto E. Rössler in 1992. The fractal is
generated using absolute values of the real and imaginary components during iteration,
creating a distinctive ship-like appearance.

Mathematical Background:
    The Burning Ship fractal uses the iteration formula:
        z_{n+1} = (|Re(z_n)| + i|Im(z_n)|)^p + c
    
    where:
        - z starts at 0
        - c is the complex coordinate being tested
        - p is the power (typically 2)
        - |Re(z)| and |Im(z)| are absolute values of real and imaginary parts
    
    The iteration continues until either:
        - |z| > escape_radius (typically 2), indicating divergence
        - max_iter is reached, indicating the point is in the set

Key Characteristics:
    - Creates ship-like structures in the complex plane
    - Self-similar at different scales
    - Highly sensitive to parameter changes
    - Optimal viewing region: x ∈ [-2, 1], y ∈ [-2, 1]

References:
    Michelitsch, M., & Rössler, O. E. (1992). "The Burning Ship Fractal"
    https://en.wikipedia.org/wiki/Burning_Ship_fractal
"""

from typing import Tuple

import numpy as np


# ============================================================================
# CONSTANTS - FRACTAL PARAMETERS
# ============================================================================

# Divergence Parameters
DEFAULT_ESCAPE_RADIUS: float = 2.0
"""Threshold for determining if a point escapes to infinity"""

DEFAULT_MAX_ITERATIONS: int = 256
"""Default maximum iterations before assuming point is in the set"""

# Default Complex Plane Bounds
DEFAULT_X_MIN: float = -2.0
"""Default minimum x-coordinate (real axis)"""

DEFAULT_X_MAX: float = 1.0
"""Default maximum x-coordinate (real axis)"""

DEFAULT_Y_MIN: float = -2.0
"""Default minimum y-coordinate (imaginary axis)"""

DEFAULT_Y_MAX: float = 1.0
"""Default maximum y-coordinate (imaginary axis)"""

# Default Image Dimensions
DEFAULT_WIDTH: int = 800
"""Default width in pixels"""

DEFAULT_HEIGHT: int = 800
"""Default height in pixels"""

# Algorithm Parameters
DEFAULT_POWER: int = 2
"""Default power for the iteration formula (standard is 2)"""

INITIAL_Z: complex = 0 + 0j
"""Starting value for iteration (always 0 for Burning Ship)"""


class BurningShip:
    """
    Burning Ship Fractal Generator
    
    Generates the Burning Ship fractal using an iterative escape-time algorithm
    with absolute value transformations on both real and imaginary components.
    
    The Burning Ship fractal is computed by iterating the formula:
        z_{n+1} = (|Re(z_n)| + i|Im(z_n)|)^p + c
    
    for each point c in the complex plane until either:
        1. |z| exceeds the escape radius (point escapes → colored by iteration count)
        2. Maximum iterations reached (point is in the set → typically colored black)
    
    Algorithm:
        1. Create grid of complex coordinates (c values) spanning the specified bounds
        2. For each coordinate c:
            a. Initialize z = 0
            b. Iterate: z = (|Re(z)| + i|Im(z)|)^power + c
            c. Check if |z| > escape_radius
            d. Record iteration count when escape occurs
        3. Return 2D array of iteration counts
    
    Attributes:
        width: Image width in pixels
        height: Image height in pixels
        x_min: Minimum x-coordinate (real axis) of complex plane
        x_max: Maximum x-coordinate (real axis) of complex plane
        y_min: Minimum y-coordinate (imaginary axis) of complex plane
        y_max: Maximum y-coordinate (imaginary axis) of complex plane
        max_iter: Maximum iterations before assuming point is in the set
        power: Exponent in iteration formula (typically 2)
        escape_radius: Threshold for determining divergence
    
    Example:
        >>> # Generate standard Burning Ship fractal
        >>> ship = BurningShip(
        ...     width=800,
        ...     height=800,
        ...     x_min=-2.0,
        ...     x_max=1.0,
        ...     y_min=-2.0,
        ...     y_max=1.0,
        ...     max_iter=256,
        ...     power=2
        ... )
        >>> fractal = ship.generate()
        >>> print(fractal.shape)
        (800, 800)
        
        >>> # Zoom into interesting region
        >>> ship_zoom = BurningShip(
        ...     width=1200,
        ...     height=1200,
        ...     x_min=-1.8,
        ...     x_max=-1.6,
        ...     y_min=-0.1,
        ...     y_max=0.1,
        ...     max_iter=512,
        ...     power=2
        ... )
        >>> fractal_zoom = ship_zoom.generate()
    
    Note:
        Higher max_iter values provide more detail but increase computation time.
        For exploration, start with max_iter=256, then increase for final renders.
    """

    def __init__(
        self,
        width: int = DEFAULT_WIDTH,
        height: int = DEFAULT_HEIGHT,
        x_min: float = DEFAULT_X_MIN,
        x_max: float = DEFAULT_X_MAX,
        y_min: float = DEFAULT_Y_MIN,
        y_max: float = DEFAULT_Y_MAX,
        max_iter: int = DEFAULT_MAX_ITERATIONS,
        power: int = DEFAULT_POWER
    ):
        """
        Initialize Burning Ship fractal generator.
        
        Args:
            width: Image width in pixels (default: 800)
            height: Image height in pixels (default: 800)
            x_min: Minimum real coordinate (default: -2.0)
            x_max: Maximum real coordinate (default: 1.0)
            y_min: Minimum imaginary coordinate (default: -2.0)
            y_max: Maximum imaginary coordinate (default: 1.0)
            max_iter: Maximum iterations (default: 256)
            power: Iteration power exponent (default: 2)
            
        Raises:
            ValueError: If width/height <= 0, or if x_min >= x_max, or y_min >= y_max
        """
        # Validate parameters
        if width <= 0 or height <= 0:
            raise ValueError(f"Width and height must be positive: width={width}, height={height}")
        if x_min >= x_max:
            raise ValueError(f"x_min must be less than x_max: x_min={x_min}, x_max={x_max}")
        if y_min >= y_max:
            raise ValueError(f"y_min must be less than y_max: y_min={y_min}, y_max={y_max}")
        if max_iter <= 0:
            raise ValueError(f"max_iter must be positive: max_iter={max_iter}")
        if power <= 0:
            raise ValueError(f"power must be positive: power={power}")
        
        # Image dimensions
        self.width: int = width
        self.height: int = height
        
        # Complex plane bounds
        self.x_min: float = x_min
        self.x_max: float = x_max
        self.y_min: float = y_min
        self.y_max: float = y_max
        
        # Algorithm parameters
        self.max_iter: int = max_iter
        self.power: int = power
        self.escape_radius: float = DEFAULT_ESCAPE_RADIUS

    # ========================================================================
    # PUBLIC INTERFACE
    # ========================================================================

    def generate(self) -> np.ndarray:
        """
        Generate the Burning Ship fractal.
        
        Computes the escape-time algorithm for each point in the complex plane
        grid, using absolute values of real and imaginary parts during iteration.
        
        Returns:
            2D numpy array (height × width) where each value represents the
            number of iterations before the point escaped. Points that never
            escape (within max_iter) have value 0.
            
        Algorithm Complexity:
            Time: O(width × height × max_iter) worst case
            Space: O(width × height) for output array
            
        Note:
            The returned array contains raw iteration counts. For visualization,
            apply a colormap or normalization. Values range from 0 to max_iter.
        """
        # Generate coordinate grids
        x_coords, y_coords = self._generate_coordinate_grids()
        
        # Initialize output array
        fractal = np.zeros((self.height, self.width), dtype=np.int32)
        
        # Compute escape times for all points
        self._compute_escape_times(x_coords, y_coords, fractal)
        
        return fractal

    # ========================================================================
    # COORDINATE GENERATION
    # ========================================================================

    def _generate_coordinate_grids(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate coordinate grids for the complex plane.
        
        Creates linearly spaced arrays for x (real) and y (imaginary)
        coordinates spanning the specified bounds.
        
        Returns:
            Tuple of (x_coords, y_coords) numpy arrays
        """
        x_coords = np.linspace(self.x_min, self.x_max, self.width)
        y_coords = np.linspace(self.y_min, self.y_max, self.height)
        return x_coords, y_coords

    # ========================================================================
    # ESCAPE TIME COMPUTATION
    # ========================================================================

    def _compute_escape_times(
        self,
        x_coords: np.ndarray,
        y_coords: np.ndarray,
        fractal: np.ndarray
    ) -> None:
        """
        Compute escape times for all points in the grid.
        
        Iterates over each point in the complex plane, applying the
        Burning Ship iteration formula until escape or max_iter.
        
        Args:
            x_coords: Array of x (real) coordinates
            y_coords: Array of y (imaginary) coordinates
            fractal: Output array to store iteration counts
            
        Side Effects:
            Updates fractal array in-place with escape iteration counts
        """
        for row_idx, y in enumerate(y_coords):
            for col_idx, x in enumerate(x_coords):
                c = complex(x, y)
                escape_iter = self._compute_point_escape_time(c)
                fractal[row_idx, col_idx] = escape_iter

    def _compute_point_escape_time(self, c: complex) -> int:
        """
        Compute escape time for a single point in the complex plane.
        
        Applies the Burning Ship iteration formula:
            z_{n+1} = (|Re(z_n)| + i|Im(z_n)|)^power + c
        
        Args:
            c: Complex coordinate to test
            
        Returns:
            Number of iterations before escape, or 0 if point never escapes
            
        Algorithm:
            1. Initialize z = 0
            2. For each iteration:
                a. Check if |z| > escape_radius (escaped)
                b. Apply transformation: z = (|Re(z)| + i|Im(z)|)^power + c
            3. Return iteration count if escaped, 0 otherwise
        """
        z = INITIAL_Z
        
        for iteration in range(self.max_iter):
            # Check escape condition
            if self._has_escaped(z):
                return iteration
            
            # Apply Burning Ship transformation
            z = self._apply_burning_ship_transformation(z, c)
        
        # Point did not escape within max_iter
        return 0

    # ========================================================================
    # ITERATION HELPERS
    # ========================================================================

    def _has_escaped(self, z: complex) -> bool:
        """
        Check if a complex number has escaped to infinity.
        
        Args:
            z: Complex number to check
            
        Returns:
            True if |z| > escape_radius, False otherwise
        """
        return abs(z) > self.escape_radius

    def _apply_burning_ship_transformation(self, z: complex, c: complex) -> complex:
        """
        Apply the Burning Ship iteration transformation.
        
        Transformation formula:
            z_{new} = (|Re(z)| + i|Im(z)|)^power + c
        
        This is what distinguishes the Burning Ship from the Mandelbrot set:
        taking absolute values of both components before raising to a power.
        
        Args:
            z: Current complex value
            c: Complex coordinate being tested
            
        Returns:
            Transformed complex value
        """
        # Extract and apply absolute values to both components
        abs_real = abs(z.real)
        abs_imag = abs(z.imag)
        
        # Construct new complex number with absolute values
        z_abs = complex(abs_real, abs_imag)
        
        # Apply power and add constant
        return z_abs ** self.power + c
