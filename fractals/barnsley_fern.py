"""
Barnsley Fern Fractal Generator Module

Implements the Barnsley Fern fractal using an Iterated Function System (IFS).
The fern is created through the probabilistic application of four affine
transformations, each representing different parts of the fern structure.

Mathematical Background:
    The Barnsley fern uses four affine transformations with different probabilities:
    - f1 (1%): Stem - creates the base structure
    - f2 (85%): Successively smaller leaflets - main body
    - f3 (7%): Largest left-hand leaflet
    - f4 (7%): Largest right-hand leaflet

Key Features:
    - Probabilistic IFS implementation
    - Configurable resolution and iteration count
    - Optimized point generation for high-quality output
    - Automatic coordinate mapping and scaling

References:
    Barnsley, M. (1988). "Fractals Everywhere"
    https://en.wikipedia.org/wiki/Barnsley_fern
"""

from typing import Tuple

import numpy as np


# ============================================================================
# CONSTANTS - IFS TRANSFORMATION PARAMETERS
# ============================================================================

# Transformation f1: Stem (probability = 1%)
# Maps point to vertical line (creates stem)
F1_PROBABILITY_THRESHOLD = 0.01
F1_MATRIX_A = 0.0
F1_MATRIX_B = 0.0
F1_MATRIX_C = 0.0
F1_MATRIX_D = 0.16
F1_OFFSET_E = 0.0
F1_OFFSET_F = 0.0

# Transformation f2: Successively smaller leaflets (probability = 85%)
# Main body of the fern
F2_PROBABILITY_THRESHOLD = 0.86
F2_MATRIX_A = 0.85
F2_MATRIX_B = 0.04
F2_MATRIX_C = -0.04
F2_MATRIX_D = 0.85
F2_OFFSET_E = 0.0
F2_OFFSET_F = 1.6

# Transformation f3: Largest left-hand leaflet (probability = 7%)
F3_PROBABILITY_THRESHOLD = 0.93
F3_MATRIX_A = 0.2
F3_MATRIX_B = -0.26
F3_MATRIX_C = 0.23
F3_MATRIX_D = 0.22
F3_OFFSET_E = 0.0
F3_OFFSET_F = 1.6

# Transformation f4: Largest right-hand leaflet (probability = 7%)
# Applied for remaining probability (> 0.93)
F4_MATRIX_A = -0.15
F4_MATRIX_B = 0.28
F4_MATRIX_C = 0.26
F4_MATRIX_D = 0.24
F4_OFFSET_E = 0.0
F4_OFFSET_F = 0.44

# Coordinate system parameters
COORDINATE_OFFSET_X = 2.5  # X offset for centering
COORDINATE_SCALE_X_DIVISOR = 5  # Scale factor for X-axis
COORDINATE_SCALE_Y_DIVISOR = 10  # Scale factor for Y-axis

# Point generation parameters
POINTS_PER_ITERATION = 500  # Number of points per iteration level
INITIAL_X = 0.0  # Starting X coordinate
INITIAL_Y = 0.0  # Starting Y coordinate


class BarnsleyFern:
    """
    Generator for the Barnsley Fern fractal using Iterated Function Systems.
    
    The Barnsley fern is one of the most famous examples of an Iterated Function
    System (IFS). It uses four affine transformations applied probabilistically
    to generate a natural-looking fern pattern. The fern demonstrates self-similarity
    and is a classic example of how simple mathematical rules can create complex,
    natural-looking structures.
    
    The algorithm works by:
    1. Starting at the origin (0, 0)
    2. Randomly selecting one of four transformations based on probability
    3. Applying the transformation to get a new point
    4. Plotting the point and repeating
    
    Attributes:
        width: Image width in pixels
        height: Image height in pixels
        max_iter: Iteration count controlling fern density
        fractal: 2D array storing point density at each pixel
        
    Example:
        >>> fern = BarnsleyFern(width=800, height=600, max_iter=100)
        >>> image = fern.generate()
        >>> # image contains the fern pattern as a density map
    """

    def __init__(self, width: int, height: int, max_iter: int):
        """
        Initialize the Barnsley Fern generator.
        
        Args:
            width: Width of output image in pixels (recommended: 600-1200)
            height: Height of output image in pixels (recommended: 800-1600)
            max_iter: Iteration level for density (recommended: 50-200)
                     Higher values create denser, more detailed ferns
                     
        Note:
            The actual number of points generated is max_iter * 500,
            so max_iter=100 generates 50,000 points.
        """
        self.width: int = width
        self.height: int = height
        self.max_iter: int = max_iter
        self.fractal: np.ndarray = np.zeros((height, width), dtype=np.float32)

    # ========================================================================
    # PUBLIC INTERFACE
    # ========================================================================

    def generate(self) -> np.ndarray:
        """
        Generate the Barnsley Fern fractal pattern.
        
        Uses the probabilistic Iterated Function System (IFS) method to
        generate the fern. Four affine transformations are applied randomly
        based on their probability weights, creating the characteristic
        fern structure.
        
        Returns:
            2D numpy array (height × width) where each value represents
            the density of points at that pixel. Higher values indicate
            more points mapped to that location.
            
        Algorithm:
            1. Initialize starting point at origin
            2. Generate random values for transformation selection
            3. For each random value, apply appropriate transformation
            4. Map transformed point to pixel coordinates
            5. Increment density at that pixel
            
        Note:
            The returned array contains raw density values. For visualization,
            consider normalizing or applying a colormap.
        """
        # Initialize coordinate system parameters
        scale_x, scale_y = self._compute_scale_factors()
        
        # Generate all random numbers upfront for performance
        n_points = self._compute_total_points()
        random_numbers = np.random.rand(n_points)
        
        # Apply IFS transformations
        self._apply_ifs_transformations(random_numbers, scale_x, scale_y)
        
        return self.fractal

    # ========================================================================
    # COORDINATE SYSTEM HELPERS
    # ========================================================================

    def _compute_scale_factors(self) -> Tuple[float, float]:
        """
        Compute scaling factors for mapping mathematical coordinates to pixels.
        
        The Barnsley fern mathematical coordinates need to be scaled to fit
        within the pixel dimensions of the output image.
        
        Returns:
            Tuple of (scale_x, scale_y) factors for coordinate transformation
        """
        scale_x = self.width / COORDINATE_SCALE_X_DIVISOR
        scale_y = self.height / COORDINATE_SCALE_Y_DIVISOR
        return scale_x, scale_y

    def _compute_total_points(self) -> int:
        """
        Calculate total number of points to generate.
        
        Returns:
            Total points = max_iter × POINTS_PER_ITERATION
        """
        return self.max_iter * POINTS_PER_ITERATION

    def _map_to_pixel_coordinates(
        self,
        x: float,
        y: float,
        scale_x: float,
        scale_y: float
    ) -> Tuple[int, int]:
        """
        Convert mathematical coordinates to pixel coordinates.
        
        Args:
            x: Mathematical X coordinate
            y: Mathematical Y coordinate
            scale_x: X-axis scaling factor
            scale_y: Y-axis scaling factor
            
        Returns:
            Tuple of (pixel_x, pixel_y) integer coordinates
        """
        pixel_x = int((x + COORDINATE_OFFSET_X) * scale_x)
        pixel_y = int(y * scale_y)
        return pixel_x, pixel_y

    def _is_within_bounds(self, pixel_x: int, pixel_y: int) -> bool:
        """
        Check if pixel coordinates are within image bounds.
        
        Args:
            pixel_x: X pixel coordinate
            pixel_y: Y pixel coordinate
            
        Returns:
            True if coordinates are within image bounds, False otherwise
        """
        return 0 <= pixel_x < self.width and 0 <= pixel_y < self.height

    # ========================================================================
    # IFS TRANSFORMATION LOGIC
    # ========================================================================

    def _apply_ifs_transformations(
        self,
        random_numbers: np.ndarray,
        scale_x: float,
        scale_y: float
    ) -> None:
        """
        Apply Iterated Function System transformations to generate fern.
        
        Iterates through random numbers, applying one of four transformations
        based on probability thresholds, and plots resulting points.
        
        Args:
            random_numbers: Array of random values in [0, 1)
            scale_x: X-axis scaling factor
            scale_y: Y-axis scaling factor
            
        Side Effects:
            Updates self.fractal with point density values
        """
        x, y = INITIAL_X, INITIAL_Y
        
        for r in random_numbers:
            # Select and apply transformation based on probability
            x, y = self._select_transformation(r, x, y)
            
            # Map to pixel coordinates and plot
            pixel_x, pixel_y = self._map_to_pixel_coordinates(x, y, scale_x, scale_y)
            
            if self._is_within_bounds(pixel_x, pixel_y):
                self.fractal[pixel_y, pixel_x] += 1

    def _select_transformation(
        self,
        random_value: float,
        x: float,
        y: float
    ) -> Tuple[float, float]:
        """
        Select and apply one of four IFS transformations based on probability.
        
        Transformation probabilities:
        - f1 (1%):  Stem
        - f2 (85%): Main leaflets
        - f3 (7%):  Left leaflet
        - f4 (7%):  Right leaflet
        
        Args:
            random_value: Random number in [0, 1) for transformation selection
            x: Current X coordinate
            y: Current Y coordinate
            
        Returns:
            Tuple of transformed (new_x, new_y) coordinates
        """
        if random_value < F1_PROBABILITY_THRESHOLD:
            return self._apply_f1_transformation(x, y)
        elif random_value < F2_PROBABILITY_THRESHOLD:
            return self._apply_f2_transformation(x, y)
        elif random_value < F3_PROBABILITY_THRESHOLD:
            return self._apply_f3_transformation(x, y)
        else:
            return self._apply_f4_transformation(x, y)

    # ========================================================================
    # AFFINE TRANSFORMATIONS
    # ========================================================================

    @staticmethod
    def _apply_f1_transformation(x: float, y: float) -> Tuple[float, float]:
        """
        Apply f1 transformation - creates the stem (1% probability).
        
        Transformation matrix:
        [ 0.00  0.00 ] [x]   [0.00]
        [ 0.00  0.16 ] [y] + [0.00]
        
        Args:
            x: Current X coordinate
            y: Current Y coordinate
            
        Returns:
            Transformed (x, y) coordinates
        """
        new_x = F1_MATRIX_A * x + F1_MATRIX_B * y + F1_OFFSET_E
        new_y = F1_MATRIX_C * x + F1_MATRIX_D * y + F1_OFFSET_F
        return new_x, new_y

    @staticmethod
    def _apply_f2_transformation(x: float, y: float) -> Tuple[float, float]:
        """
        Apply f2 transformation - main body leaflets (85% probability).
        
        Transformation matrix:
        [ 0.85  0.04 ] [x]   [0.00]
        [-0.04  0.85 ] [y] + [1.60]
        
        Args:
            x: Current X coordinate
            y: Current Y coordinate
            
        Returns:
            Transformed (x, y) coordinates
        """
        new_x = F2_MATRIX_A * x + F2_MATRIX_B * y + F2_OFFSET_E
        new_y = F2_MATRIX_C * x + F2_MATRIX_D * y + F2_OFFSET_F
        return new_x, new_y

    @staticmethod
    def _apply_f3_transformation(x: float, y: float) -> Tuple[float, float]:
        """
        Apply f3 transformation - left leaflet (7% probability).
        
        Transformation matrix:
        [ 0.20 -0.26 ] [x]   [0.00]
        [ 0.23  0.22 ] [y] + [1.60]
        
        Args:
            x: Current X coordinate
            y: Current Y coordinate
            
        Returns:
            Transformed (x, y) coordinates
        """
        new_x = F3_MATRIX_A * x + F3_MATRIX_B * y + F3_OFFSET_E
        new_y = F3_MATRIX_C * x + F3_MATRIX_D * y + F3_OFFSET_F
        return new_x, new_y

    @staticmethod
    def _apply_f4_transformation(x: float, y: float) -> Tuple[float, float]:
        """
        Apply f4 transformation - right leaflet (7% probability).
        
        Transformation matrix:
        [-0.15  0.28 ] [x]   [0.00]
        [ 0.26  0.24 ] [y] + [0.44]
        
        Args:
            x: Current X coordinate
            y: Current Y coordinate
            
        Returns:
            Transformed (x, y) coordinates
        """
        new_x = F4_MATRIX_A * x + F4_MATRIX_B * y + F4_OFFSET_E
        new_y = F4_MATRIX_C * x + F4_MATRIX_D * y + F4_OFFSET_F
        return new_x, new_y
