"""
Mandelbrot Set Fractal Generator Module

Implements the Mandelbrot set, one of the most iconic fractals in mathematics,
discovered by Benoit Mandelbrot in 1980. The Mandelbrot set is famous for its
infinite complexity and self-similarity at all scales.

Mathematical Background:
    The Mandelbrot set is defined by the iteration formula:
        z_{n+1} = z_n^p + c
    
    where:
        - z starts at 0 for each point
        - c is the coordinate being tested (varies across the complex plane)
        - p is the power (typically 2, but can be varied for multibrot sets)
        - The iteration continues until either:
            * |z| > escape_radius (point escapes → not in the set)
            * max_iter is reached (point is in the set)
    
    The classic Mandelbrot set uses p=2, giving the formula:
        z_{n+1} = z_n^2 + c

Key Characteristics:
    - The main cardioid and circular bulb contain points in the set
    - Intricate filaments connect to smaller copies of the set
    - Self-similar at all scales (fractal dimension ≈ 2)
    - Boundary is infinitely complex
    - Different power values create "multibrot" sets:
        * p=2: Classic Mandelbrot (cardioid shape)
        * p=3: Multibrot with trefoil symmetry
        * p=4: Multibrot with 4-fold symmetry
        * Higher powers create more symmetric patterns

Relationship to Julia Sets:
    Each point c in the Mandelbrot set corresponds to a Julia set:
        - If c is inside the Mandelbrot set → Julia set is connected
        - If c is outside the Mandelbrot set → Julia set is disconnected "dust"
        - Points on the boundary create the most interesting Julia sets

Optimization:
    Uses vectorized NumPy operations with masked arrays for efficient
    computation across all pixels simultaneously.

Interesting Regions:
    - Full set: x∈[-2.5, 1.0], y∈[-1.25, 1.25]
    - Seahorse valley: x∈[-0.75, -0.735], y∈[0.095, 0.115]
    - Elephant valley: x∈[0.25, 0.5], y∈[0.0, 0.25]
    - Spiral region: x∈[-0.7, -0.6], y∈[-0.5, -0.4]

References:
    Mandelbrot, B. (1980). "Fractal Aspects of the Iteration of z → λz(1-z)"
    https://en.wikipedia.org/wiki/Mandelbrot_set
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

DEFAULT_POWER: int = 2
"""Default power for the iteration formula (classic Mandelbrot uses 2)"""

# Default Complex Plane Bounds (Full Mandelbrot Set)
DEFAULT_X_MIN: float = -2.5
"""Default minimum x-coordinate (real axis)"""

DEFAULT_X_MAX: float = 1.0
"""Default maximum x-coordinate (real axis)"""

DEFAULT_Y_MIN: float = -1.25
"""Default minimum y-coordinate (imaginary axis)"""

DEFAULT_Y_MAX: float = 1.25
"""Default maximum y-coordinate (imaginary axis)"""

# Default Image Dimensions
DEFAULT_WIDTH: int = 800
"""Default width in pixels"""

DEFAULT_HEIGHT: int = 600
"""Default height in pixels"""

# Interesting Zoom Regions
INTERESTING_REGIONS: dict = {
    "full_set": {"x_min": -2.5, "x_max": 1.0, "y_min": -1.25, "y_max": 1.25},
    "seahorse_valley": {"x_min": -0.75, "x_max": -0.735, "y_min": 0.095, "y_max": 0.115},
    "elephant_valley": {"x_min": 0.25, "x_max": 0.5, "y_min": 0.0, "y_max": 0.25},
    "spiral": {"x_min": -0.7, "x_max": -0.6, "y_min": -0.5, "y_max": -0.4},
    "mini_mandelbrot": {"x_min": -0.16, "x_max": -0.14, "y_min": 1.025, "y_max": 1.045},
}
"""Preset regions showcasing interesting features of the Mandelbrot set"""


class Mandelbrot:
    """
    Mandelbrot Set Fractal Generator
    
    Generates Mandelbrot set fractals using a vectorized escape-time algorithm.
    The Mandelbrot set is computed by iterating z_{n+1} = z_n^p + c for each
    point c in the complex plane, starting with z_0 = 0.
    
    The power parameter allows generating "multibrot" sets:
        - power=2: Classic Mandelbrot set (most common)
        - power=3: Multibrot-3 with trefoil symmetry
        - power=4+: Higher order multibrots with increased symmetry
    
    Algorithm:
        1. Create grid of complex coordinates c (points to test)
        2. Initialize z to zero for all points
        3. For each iteration:
            a. Apply transformation: z = z^p + c
            b. Check which points satisfy |z| > escape_radius
            c. Record iteration count when escape occurs
            d. Stop iterating escaped points (using mask)
        4. Return 2D array of iteration counts
    
    Attributes:
        width: Image width in pixels
        height: Image height in pixels
        x_min: Minimum x-coordinate (real axis) of complex plane
        x_max: Maximum x-coordinate (real axis) of complex plane
        y_min: Minimum y-coordinate (imaginary axis) of complex plane
        y_max: Maximum y-coordinate (imaginary axis) of complex plane
        max_iter: Maximum iterations before assuming point is in the set
        power: Exponent in the iteration formula (2 for classic Mandelbrot)
        escape_radius: Threshold for determining divergence
    
    Example:
        >>> # Generate classic Mandelbrot set
        >>> mandel = Mandelbrot(
        ...     width=1920,
        ...     height=1080,
        ...     x_min=-2.5,
        ...     x_max=1.0,
        ...     y_min=-1.25,
        ...     y_max=1.25,
        ...     max_iter=256,
        ...     power=2
        ... )
        >>> fractal = mandel.generate()
        >>> print(fractal.shape)
        (1080, 1920)
        
        >>> # Generate Multibrot-3 (trefoil symmetry)
        >>> multibrot3 = Mandelbrot(
        ...     width=800,
        ...     height=800,
        ...     x_min=-2.0,
        ...     x_max=2.0,
        ...     y_min=-2.0,
        ...     y_max=2.0,
        ...     max_iter=256,
        ...     power=3
        ... )
        >>> fractal3 = multibrot3.generate()
        
        >>> # Zoom into interesting region
        >>> region = INTERESTING_REGIONS["seahorse_valley"]
        >>> detail = Mandelbrot(
        ...     width=1200,
        ...     height=1200,
        ...     max_iter=512,
        ...     power=2,
        ...     **region
        ... )
        >>> detailed_fractal = detail.generate()
    
    Performance:
        Uses vectorized NumPy operations with masked arrays for efficiency.
        Typical performance: ~1-2 seconds for 1920x1080 at 256 iterations.
    
    Note:
        Higher max_iter values provide more detail but increase computation time.
        For deep zooms, you may need max_iter > 1000 to see structure.
        Deeper zooms also require higher precision (may need arbitrary precision).
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
        Initialize Mandelbrot set fractal generator.
        
        Args:
            width: Image width in pixels (default: 800)
            height: Image height in pixels (default: 600)
            x_min: Minimum real coordinate (default: -2.5)
            x_max: Maximum real coordinate (default: 1.0)
            y_min: Minimum imaginary coordinate (default: -1.25)
            y_max: Maximum imaginary coordinate (default: 1.25)
            max_iter: Maximum iterations (default: 256)
            power: Exponent in iteration formula (default: 2 for classic Mandelbrot)
            
        Raises:
            ValueError: If width/height <= 0, or if x_min >= x_max, or y_min >= y_max,
                       or if max_iter <= 0, or if power < 2
            
        Tips:
            - Use power=2 for classic Mandelbrot set
            - Use power=3,4,5... for multibrot sets with increased symmetry
            - For deep zooms, increase max_iter (try 512, 1024, or higher)
            - Use INTERESTING_REGIONS presets to explore notable features
            - Higher iterations reveal more detail but take longer to compute
        """
        # Validate parameters
        if width <= 0 or height <= 0:
            raise ValueError(
                f"Width and height must be positive: width={width}, height={height}"
            )
        if x_min >= x_max:
            raise ValueError(
                f"x_min must be less than x_max: x_min={x_min}, x_max={x_max}"
            )
        if y_min >= y_max:
            raise ValueError(
                f"y_min must be less than y_max: y_min={y_min}, y_max={y_max}"
            )
        if max_iter <= 0:
            raise ValueError(f"max_iter must be positive: max_iter={max_iter}")
        if power < 2:
            raise ValueError(
                f"power must be >= 2 for meaningful fractals: power={power}"
            )
        
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
        self.escape_radius: float = DEFAULT_ESCAPE_RADIUS

    # ========================================================================
    # PUBLIC INTERFACE
    # ========================================================================

    def generate(self) -> np.ndarray:
        """
        Generate the Mandelbrot set fractal.
        
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
        # Generate complex plane grid (c values)
        C = self._create_complex_grid()
        
        # Initialize z and tracking arrays
        Z, fractal, mask = self._initialize_arrays(C)
        
        # Compute escape times using vectorized iteration
        self._compute_escape_times_vectorized(C, Z, fractal, mask)
        
        return fractal

    # ========================================================================
    # GRID GENERATION
    # ========================================================================

    def _create_complex_grid(self) -> np.ndarray:
        """
        Create a grid of complex numbers spanning the specified bounds.
        
        Generates a 2D array where each element is a complex number
        representing a point c in the complex plane to be tested.
        
        Returns:
            2D numpy array of complex numbers (height × width)
        """
        x_vals = np.linspace(self.x_min, self.x_max, self.width)
        y_vals = np.linspace(self.y_min, self.y_max, self.height)
        X, Y = np.meshgrid(x_vals, y_vals)
        C = X + 1j * Y
        return C

    # ========================================================================
    # ARRAY INITIALIZATION
    # ========================================================================

    def _initialize_arrays(self, C: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Initialize arrays for Mandelbrot computation.
        
        Args:
            C: Grid of complex numbers (c values)
            
        Returns:
            Tuple of (Z, fractal, mask) where:
                - Z: Complex array initialized to zero (z_0 = 0)
                - fractal: Integer array for iteration counts
                - mask: Boolean array tracking active points
        """
        Z = np.zeros_like(C, dtype=complex)
        fractal = np.zeros(C.shape, dtype=np.int32)
        mask = np.ones(C.shape, dtype=bool)
        return Z, fractal, mask

    # ========================================================================
    # VECTORIZED ESCAPE TIME COMPUTATION
    # ========================================================================

    def _compute_escape_times_vectorized(
        self,
        C: np.ndarray,
        Z: np.ndarray,
        fractal: np.ndarray,
        mask: np.ndarray
    ) -> None:
        """
        Compute escape times using vectorized operations with masking.
        
        Iterates the Mandelbrot formula z = z^p + c for all points simultaneously,
        using a boolean mask to track which points are still being iterated.
        Points that escape are removed from the mask to avoid unnecessary computation.
        
        Args:
            C: Grid of complex numbers (c values, constant)
            Z: Grid of complex numbers (z values, modified in-place)
            fractal: Output array for iteration counts (modified in-place)
            mask: Boolean mask tracking active points (modified in-place)
            
        Side Effects:
            Updates fractal array with escape iteration counts
            Updates mask to exclude escaped points
            Modifies Z in-place during iteration
            
        Algorithm:
            For each iteration n:
                1. Apply transformation only to masked points: Z[mask] = Z[mask]^p + C[mask]
                2. Identify newly escaped points: |Z| > escape_radius
                3. Record iteration count for newly escaped points
                4. Update mask to exclude escaped points
        """
        for iteration in range(self.max_iter):
            # Apply Mandelbrot transformation only to active points
            Z[mask] = Z[mask] ** self.power + C[mask]
            
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
