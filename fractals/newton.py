"""
Newton Fractal Generator Module

Implements the Newton fractal, a fascinating fractal generated using Newton's method
for finding roots of complex polynomials. The fractal visualizes which root each
starting point in the complex plane converges to.

Mathematical Background:
    Newton's method is an iterative root-finding algorithm that uses the formula:
        z_{n+1} = z_n - f(z_n) / f'(z_n)
    
    For the polynomial f(z) = z^n - 1, this becomes:
        z_{n+1} = z_n - (z_n^n - 1) / (n * z_n^(n-1))
    
    Simplifying:
        z_{n+1} = ((n-1) * z_n^n + 1) / (n * z_n^(n-1))
    
    Or equivalently:
        z_{n+1} = z_n - (z_n^n - 1) / (n * z_n^(n-1))

The Roots:
    For f(z) = z^n - 1, the n roots are the n-th roots of unity:
        r_k = e^(2πik/n) for k = 0, 1, 2, ..., n-1
    
    These roots are evenly spaced around the unit circle in the complex plane.
    For example:
        - n=3: Three roots forming an equilateral triangle
        - n=4: Four roots forming a square
        - n=5: Five roots forming a regular pentagon
        - n=6: Six roots forming a regular hexagon

Fractal Structure:
    The Newton fractal divides the complex plane into basins of attraction,
    where each basin contains all points that converge to the same root.
    The boundaries between basins exhibit fractal properties:
        - Self-similar at all scales
        - Infinitely intricate boundary structure
        - Sensitive dependence on initial conditions
    
    Key characteristics:
        - Higher degree polynomials (larger n) create more complex patterns
        - Symmetry: n-fold rotational symmetry around the origin
        - Julia-like behavior at basin boundaries
        - Chaotic regions where convergence is slow or unclear

Visualization:
    Points are colored based on which root they converge to, creating
    distinct colored regions with fractal boundaries. The number of
    iterations to convergence can also be encoded for additional detail.

Applications:
    - Visualizing convergence behavior of numerical methods
    - Studying basin boundaries in dynamical systems
    - Educational tool for complex analysis
    - Artistic fractal generation

Optimization:
    Uses vectorized NumPy operations to compute Newton iterations for
    all points simultaneously, then identifies the closest root.

References:
    Cayley, A. (1879). "The Newton-Fourier Imaginary Problem"
    https://en.wikipedia.org/wiki/Newton_fractal
"""

from typing import Tuple

import numpy as np


# ============================================================================
# CONSTANTS - FRACTAL PARAMETERS
# ============================================================================

# Convergence Parameters
DEFAULT_MAX_ITERATIONS: int = 50
"""Default maximum iterations for Newton's method convergence"""

DEFAULT_TOLERANCE: float = 1e-6
"""Convergence tolerance for root identification"""

DEFAULT_POLYNOMIAL_DEGREE: int = 3
"""Default degree of polynomial z^n - 1 (creates n-fold symmetry)"""

# Default Complex Plane Bounds (Centered on Origin)
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

# Polynomial Degree Presets
POLYNOMIAL_PRESETS: dict = {
    "triangle": 3,  # Three roots forming equilateral triangle
    "square": 4,    # Four roots forming square
    "pentagon": 5,  # Five roots forming regular pentagon
    "hexagon": 6,   # Six roots forming regular hexagon
    "heptagon": 7,  # Seven roots forming regular heptagon
    "octagon": 8,   # Eight roots forming regular octagon
}
"""Preset polynomial degrees creating different symmetric patterns"""


class NewtonFractal:
    """
    Newton Fractal Generator
    
    Generates Newton fractals using Newton's method applied to complex polynomials
    of the form f(z) = z^n - 1. The fractal visualizes the basins of attraction
    for each of the n roots of unity.
    
    Newton's method iteratively refines guesses for roots using:
        z_{n+1} = z_n - (z_n^n - 1) / (n * z_n^(n-1))
    
    Each point in the complex plane is assigned a color based on which root
    it converges to, creating beautiful fractal boundaries between basins.
    
    Algorithm:
        1. Create grid of complex coordinates (starting points)
        2. Compute the n-th roots of unity (target roots)
        3. Apply Newton's method iterations to all points simultaneously
        4. For each point, determine which root it converged to
        5. Return 2D array mapping points to root indices
    
    Attributes:
        width: Image width in pixels
        height: Image height in pixels
        x_min: Minimum x-coordinate (real axis) of complex plane
        x_max: Maximum x-coordinate (real axis) of complex plane
        y_min: Minimum y-coordinate (imaginary axis) of complex plane
        y_max: Maximum y-coordinate (imaginary axis) of complex plane
        max_iter: Maximum Newton iterations to perform
        n: Degree of polynomial (number of roots)
        tolerance: Convergence tolerance for root identification
    
    Example:
        >>> # Generate classic Newton fractal for z^3 - 1 = 0
        >>> newton = NewtonFractal(
        ...     width=800,
        ...     height=800,
        ...     x_min=-2.0,
        ...     x_max=2.0,
        ...     y_min=-2.0,
        ...     y_max=2.0,
        ...     max_iter=50,
        ...     n=3
        ... )
        >>> fractal = newton.generate()
        >>> print(fractal.shape)
        (800, 800)
        >>> print(f"Converged to {np.unique(fractal).size} different roots")
        Converged to 3 different roots
        
        >>> # Generate pentagon Newton fractal (5 roots)
        >>> pentagon = NewtonFractal(
        ...     width=1200,
        ...     height=1200,
        ...     n=POLYNOMIAL_PRESETS["pentagon"]
        ... )
        >>> fractal_5 = pentagon.generate()
        
        >>> # Zoom into basin boundary
        >>> zoom = NewtonFractal(
        ...     width=1600,
        ...     height=1600,
        ...     x_min=0.0,
        ...     x_max=1.0,
        ...     y_min=0.0,
        ...     y_max=1.0,
        ...     max_iter=100,  # More iterations for detail
        ...     n=3
        ... )
        >>> detail = zoom.generate()
    
    Performance:
        Uses vectorized NumPy operations to compute all Newton iterations
        simultaneously. Typical performance: ~0.5-1 second for 800x800 at 50 iterations.
    
    Note:
        - Higher n values create more complex symmetric patterns
        - More iterations (max_iter) reveal finer boundary details
        - The fractal has n-fold rotational symmetry
        - Basin boundaries exhibit self-similarity at all scales
        - Values in the returned array range from 0 to n-1 (root indices)
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
        n: int = DEFAULT_POLYNOMIAL_DEGREE
    ):
        """
        Initialize Newton fractal generator.
        
        Args:
            width: Image width in pixels (default: 800)
            height: Image height in pixels (default: 800)
            x_min: Minimum real coordinate (default: -2.0)
            x_max: Maximum real coordinate (default: 2.0)
            y_min: Minimum imaginary coordinate (default: -2.0)
            y_max: Maximum imaginary coordinate (default: 2.0)
            max_iter: Maximum Newton iterations (default: 50)
            n: Polynomial degree (number of roots) (default: 3)
            
        Raises:
            ValueError: If width/height <= 0, or if x_min >= x_max, or y_min >= y_max,
                       or if max_iter <= 0, or if n < 2
            
        Tips:
            - Use n=3,4,5,6... for different symmetric patterns
            - Use POLYNOMIAL_PRESETS for named configurations
            - Increase max_iter (e.g., 100) for zoomed-in views
            - Bounds of [-2, 2] x [-2, 2] show the full fractal structure
            - Higher n values create more intricate patterns
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
        if n < 2:
            raise ValueError(
                f"Polynomial degree must be >= 2 for meaningful fractals: n={n}"
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
        self.n: int = n
        self.tolerance: float = DEFAULT_TOLERANCE

    # ========================================================================
    # PUBLIC INTERFACE
    # ========================================================================

    def generate(self) -> np.ndarray:
        """
        Generate the Newton fractal.
        
        Applies Newton's method to find roots of z^n - 1 = 0 for each point
        in the complex plane. Colors each point based on which root it
        converges to.
        
        Returns:
            2D numpy array (height × width) where each value is an integer
            from 0 to n-1, representing which root the point converged to.
            
        Algorithm Complexity:
            Time: O(width × height × max_iter) for Newton iterations
            Space: O(width × height) for arrays
            
        Optimization:
            Uses NumPy vectorization to apply Newton's method to all points
            simultaneously, then uses broadcasting to compute distances to
            all roots efficiently.
            
        Note:
            The returned array contains root indices (0 to n-1). For visualization,
            use a discrete colormap with n distinct colors to show the basins
            of attraction.
        """
        # Generate complex plane grid (starting points)
        Z = self._create_complex_grid()
        
        # Compute the n-th roots of unity
        roots = self._compute_roots_of_unity()
        
        # Apply Newton's method to all points
        self._apply_newton_iterations(Z)
        
        # Determine which root each point converged to
        fractal = self._assign_to_nearest_root(Z, roots)
        
        return fractal

    # ========================================================================
    # GRID GENERATION
    # ========================================================================

    def _create_complex_grid(self) -> np.ndarray:
        """
        Create a grid of complex numbers spanning the specified bounds.
        
        Generates a 2D array where each element is a complex number
        representing a starting point for Newton's method.
        
        Returns:
            2D numpy array of complex numbers (height × width)
        """
        x_vals = np.linspace(self.x_min, self.x_max, self.width)
        y_vals = np.linspace(self.y_min, self.y_max, self.height)
        X, Y = np.meshgrid(x_vals, y_vals)
        Z = X + 1j * Y
        return Z

    # ========================================================================
    # ROOT COMPUTATION
    # ========================================================================

    def _compute_roots_of_unity(self) -> np.ndarray:
        """
        Compute the n-th roots of unity.
        
        The roots of z^n - 1 = 0 are evenly spaced around the unit circle:
            r_k = e^(2πik/n) for k = 0, 1, 2, ..., n-1
        
        Returns:
            1D numpy array of n complex numbers representing the roots
            
        Example:
            For n=3: [1+0j, -0.5+0.866j, -0.5-0.866j]
            (vertices of equilateral triangle on unit circle)
        """
        angles = 2.0 * np.pi * np.arange(self.n) / self.n
        roots = np.exp(1j * angles)
        return roots

    # ========================================================================
    # NEWTON'S METHOD ITERATION
    # ========================================================================

    def _apply_newton_iterations(self, Z: np.ndarray) -> None:
        """
        Apply Newton's method iterations to refine all points.
        
        Updates Z in-place by repeatedly applying the Newton iteration:
            z_{n+1} = z_n - (z_n^n - 1) / (n * z_n^(n-1))
        
        This can be rewritten as:
            z_{n+1} = z_n - (z_n^n - 1) / (n * z_n^(n-1))
                    = (n * z_n^n - z_n^n + 1) / (n * z_n^(n-1))
                    = ((n-1) * z_n^n + 1) / (n * z_n^(n-1))
        
        Args:
            Z: Grid of complex numbers (modified in-place)
            
        Side Effects:
            Modifies Z in-place to converge points toward roots
            
        Note:
            We use the direct formula to avoid division by zero issues.
            Points very close to zero may not converge properly.
        """
        for _ in range(self.max_iter):
            # Newton iteration: z = z - f(z)/f'(z)
            # For f(z) = z^n - 1:
            # f'(z) = n * z^(n-1)
            # z_new = z - (z^n - 1) / (n * z^(n-1))
            
            # Compute z^n
            z_power_n = Z ** self.n
            
            # Apply Newton formula (avoid division by zero)
            # Add small epsilon to denominator for numerical stability
            denominator = self.n * Z ** (self.n - 1)
            epsilon = 1e-10
            Z -= (z_power_n - 1) / (denominator + epsilon)

    # ========================================================================
    # ROOT ASSIGNMENT
    # ========================================================================

    def _assign_to_nearest_root(self, Z: np.ndarray, roots: np.ndarray) -> np.ndarray:
        """
        Assign each point to its nearest root.
        
        Computes the distance from each converged point to all roots,
        then assigns the point to the index of the closest root.
        
        Args:
            Z: Grid of converged complex numbers (height × width)
            roots: Array of n roots (1D array of length n)
            
        Returns:
            2D integer array (height × width) with values 0 to n-1,
            where each value indicates which root the point converged to
            
        Algorithm:
            Uses NumPy broadcasting to compute distances from each point
            to all roots simultaneously:
                distances shape: (height, width, n)
            Then uses argmin along the last axis to find the closest root.
        """
        # Broadcast: Z[..., np.newaxis] has shape (height, width, 1)
        # roots has shape (n,)
        # Subtraction broadcasts to shape (height, width, n)
        distances = np.abs(Z[..., np.newaxis] - roots)
        
        # Find index of minimum distance for each point
        fractal = np.argmin(distances, axis=-1)
        
        return fractal
