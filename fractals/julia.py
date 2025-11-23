"""
Julia Set Fractal Generator Module

Implements the Julia set fractal, one of the most famous fractals in mathematics,
discovered by French mathematician Gaston Julia in 1918. The Julia set is closely
related to the Mandelbrot set but uses a fixed complex constant instead of varying it.

Mathematical Background:
    The Julia set is defined by the iteration formula:
        z_{n+1} = z_n^2 + c
    
    where:
        - z starts as the coordinate being tested (unlike Mandelbrot where z starts at 0)
        - c is a fixed complex constant (the Julia set parameter)
        - The iteration continues until either:
            * |z| > escape_radius (point escapes → not in the set)
            * max_iter is reached (point is in the set)
    
    Different values of c produce dramatically different Julia set shapes:
        - c = -0.7 + 0.27015i: Creates a "douady rabbit" shape
        - c = -0.8 + 0.156i: Creates a beautiful spiral pattern
        - c = 0.285 + 0.01i: Creates a dendrite (tree-like) structure
        - c = -0.4 + 0.6i: Creates disconnected dust patterns

Key Characteristics:
    - Connected or disconnected based on c value
    - Self-similar at all scales (fractal dimension)
    - Chaotic boundary behavior
    - Relationship to Mandelbrot set: Julia sets for c values inside the
      Mandelbrot set are connected; outside are disconnected
    
Optimization:
    Uses vectorized NumPy operations with masked arrays for efficient
    computation across all pixels simultaneously.

References:
    Julia, G. (1918). "Mémoire sur l'itération des fonctions rationnelles"
    https://en.wikipedia.org/wiki/Julia_set
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

DEFAULT_X_MAX: float = 2.0
"""Default maximum x-coordinate (real axis)"""

DEFAULT_Y_MIN: float = -2.0
"""Default minimum y-coordinate (imaginary axis)"""

DEFAULT_Y_MAX: float = 2.0
"""Default maximum y-coordinate (imaginary axis)"""

# Default Image Dimensions
DEFAULT_WIDTH: int = 800
"""Default width in pixels"""

DEFAULT_HEIGHT: int = 800
"""Default height in pixels"""

# Popular Julia Set Constants
JULIA_PRESETS: dict = {
    "douady_rabbit": complex(-0.7, 0.27015),
    "dendrite": complex(0.285, 0.01),
    "san_marco": complex(-0.75, 0.0),
    "spiral": complex(-0.8, 0.156),
    "siegel_disk": complex(-0.391, -0.587),
    "dragon": complex(-0.4, 0.6),
}
"""Preset c values that produce interesting Julia sets"""


class Julia:
    """
    Julia Set Fractal Generator
    
    Generates Julia set fractals using a vectorized escape-time algorithm.
    The Julia set is computed by iterating z_{n+1} = z_n^2 + c for each
    point in the complex plane, where c is a fixed complex constant.
    
    The choice of c dramatically affects the fractal's appearance:
        - Points inside the Mandelbrot set produce connected Julia sets
        - Points outside produce disconnected "dust" patterns
        - Points on the boundary create the most interesting shapes
    
    Algorithm:
        1. Create grid of complex coordinates (z values) spanning the specified bounds
        2. For each iteration:
            a. Apply transformation: z = z^2 + c
            b. Check which points satisfy |z| > escape_radius
            c. Record iteration count when escape occurs
            d. Stop iterating escaped points (using mask)
        3. Return 2D array of iteration counts
    
    Attributes:
        width: Image width in pixels
        height: Image height in pixels
        x_min: Minimum x-coordinate (real axis) of complex plane
        x_max: Maximum x-coordinate (real axis) of complex plane
        y_min: Minimum y-coordinate (imaginary axis) of complex plane
        y_max: Maximum y-coordinate (imaginary axis) of complex plane
        max_iter: Maximum iterations before assuming point is in the set
        c: Julia set constant (complex number)
        escape_radius: Threshold for determining divergence
    
    Example:
        >>> # Generate "douady rabbit" Julia set
        >>> julia = Julia(
        ...     width=800,
        ...     height=800,
        ...     x_min=-2.0,
        ...     x_max=2.0,
        ...     y_min=-2.0,
        ...     y_max=2.0,
        ...     max_iter=256,
        ...     c=complex(-0.7, 0.27015)
        ... )
        >>> fractal = julia.generate()
        >>> print(fractal.shape)
        (800, 800)
        
        >>> # Use preset constant
        >>> dendrite_julia = Julia(
        ...     width=1200,
        ...     height=1200,
        ...     c=JULIA_PRESETS["dendrite"]
        ... )
        >>> fractal_dendrite = dendrite_julia.generate()
    
    Performance:
        Uses vectorized NumPy operations with masked arrays for efficiency.
        Typical performance: ~1-2 seconds for 800x800 at 256 iterations.
    
    Note:
        Higher max_iter values provide more detail but increase computation time.
        For exploration, start with max_iter=128, then increase for final renders.
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
        c: complex = complex(-0.7, 0.27015)
    ):
        """
        Initialize Julia set fractal generator.
        
        Args:
            width: Image width in pixels (default: 800)
            height: Image height in pixels (default: 800)
            x_min: Minimum real coordinate (default: -2.0)
            x_max: Maximum real coordinate (default: 2.0)
            y_min: Minimum imaginary coordinate (default: -2.0)
            y_max: Maximum imaginary coordinate (default: 2.0)
            max_iter: Maximum iterations (default: 256)
            c: Julia set constant (default: -0.7+0.27015i, "douady rabbit")
            
        Raises:
            ValueError: If width/height <= 0, or if x_min >= x_max, or y_min >= y_max
            
        Tips:
            - Try c values from JULIA_PRESETS for interesting patterns
            - c values inside Mandelbrot set create connected fractals
            - c values outside create disconnected "dust" patterns
            - For zooming, adjust x_min, x_max, y_min, y_max to focus on regions
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
        self.c: complex = c
        self.escape_radius: float = DEFAULT_ESCAPE_RADIUS

    # ========================================================================
    # PUBLIC INTERFACE
    # ========================================================================

    def generate(self) -> np.ndarray:
        """
        Generate the Julia set fractal.
        
        Computes the escape-time algorithm for each point in the complex plane
        grid using vectorized operations for efficiency. Uses a mask to track
        which points are still being iterated vs. already escaped.
        
        Returns:
            2D numpy array (height × width) where each value represents the
            number of iterations before the point escaped. Points that never
            escape (within max_iter) have value 0.
            
        Algorithm Complexity:
            Time: O(width × height × max_iter) worst case
            Space: O(width × height) for arrays
            
        Optimization:
            Uses NumPy vectorization and masked arrays to avoid iterating
            on already-escaped points, significantly improving performance
            over naive pixel-by-pixel iteration.
            
        Note:
            The returned array contains raw iteration counts. For visualization,
            apply a colormap or normalization. Values range from 0 to max_iter.
        """
        # Generate complex plane grid
        Z = self._create_complex_grid()
        
        # Initialize output and tracking arrays
        fractal = np.zeros(Z.shape, dtype=np.int32)
        mask = np.ones(Z.shape, dtype=bool)
        
        # Compute escape times using vectorized iteration
        self._compute_escape_times_vectorized(Z, fractal, mask)
        
        return fractal

    # ========================================================================
    # GRID GENERATION
    # ========================================================================

    def _create_complex_grid(self) -> np.ndarray:
        """
        Create a grid of complex numbers spanning the specified bounds.
        
        Generates a 2D array where each element is a complex number
        representing a point in the complex plane.
        
        Returns:
            2D numpy array of complex numbers (height × width)
        """
        x_vals = np.linspace(self.x_min, self.x_max, self.width)
        y_vals = np.linspace(self.y_min, self.y_max, self.height)
        X, Y = np.meshgrid(x_vals, y_vals)
        Z = X + 1j * Y
        return Z

    # ========================================================================
    # VECTORIZED ESCAPE TIME COMPUTATION
    # ========================================================================

    def _compute_escape_times_vectorized(
        self,
        Z: np.ndarray,
        fractal: np.ndarray,
        mask: np.ndarray
    ) -> None:
        """
        Compute escape times using vectorized operations with masking.
        
        Iterates the Julia set formula z = z^2 + c for all points simultaneously,
        using a boolean mask to track which points are still being iterated.
        Points that escape are removed from the mask to avoid unnecessary computation.
        
        Args:
            Z: Grid of complex numbers (modified in-place)
            fractal: Output array for iteration counts (modified in-place)
            mask: Boolean mask tracking active points (modified in-place)
            
        Side Effects:
            Updates fractal array with escape iteration counts
            Updates mask to exclude escaped points
            Modifies Z in-place during iteration
            
        Algorithm:
            For each iteration n:
                1. Apply transformation only to masked points: Z[mask] = Z[mask]^2 + c
                2. Identify newly escaped points: |Z| > escape_radius
                3. Record iteration count for newly escaped points
                4. Update mask to exclude escaped points
        """
        for iteration in range(self.max_iter):
            # Apply Julia set transformation only to active points
            Z[mask] = Z[mask] ** 2 + self.c
            
            # Identify points that just escaped
            escaped = self._check_escape_condition(Z)
            
            # Record iteration count for newly escaped points
            newly_escaped = mask & escaped
            fractal[newly_escaped] = iteration
            
            # Update mask to stop iterating on escaped points
            mask &= ~escaped
            
            # Early exit if all points have escaped
            if not mask.any():
                break

    def _check_escape_condition(self, Z: np.ndarray) -> np.ndarray:
        """
        Check which points have escaped to infinity.
        
        Args:
            Z: Grid of complex numbers
            
        Returns:
            Boolean array where True indicates the point has escaped
        """
        return np.abs(Z) > self.escape_radius
