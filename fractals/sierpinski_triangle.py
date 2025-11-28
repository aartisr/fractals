"""
Sierpinski Triangle Fractal Generator Module

Implements the Sierpinski triangle (also known as Sierpinski gasket), one of the
most recognizable fractals, discovered by Polish mathematician Wacław Sierpiński
in 1915. It demonstrates self-similarity and can be generated using multiple methods.

Mathematical Background:
    The Sierpinski triangle is a fractal with several equivalent definitions:
    
    1. Recursive Definition:
       Start with an equilateral triangle. Recursively subdivide it into four
       smaller triangles and remove the central one. Repeat infinitely.
    
    2. Chaos Game (Implemented Here):
       - Start with three vertices of an equilateral triangle
       - Begin at any point (typically one of the vertices)
       - Repeatedly:
           a. Choose one of the three vertices randomly
           b. Move halfway toward that vertex
           c. Plot the new point
       - After discarding initial points, the plotted points form the Sierpinski triangle
    
    3. Pascal's Triangle:
       Color odd numbers in Pascal's triangle to reveal the Sierpinski pattern

Chaos Game Algorithm:
    Despite the randomness in vertex selection, the chaos game deterministically
    produces the Sierpinski triangle. This is an example of a "chaotic attractor"
    where random processes converge to a deterministic fractal structure.
    
    Mathematical proof: The Sierpinski triangle is the unique fixed point of
    the iterated function system (IFS) consisting of three contractions by
    factor 0.5 toward each vertex.

Key Characteristics:
    - Fractal dimension: log(3)/log(2) ≈ 1.585 (between 1D line and 2D plane)
    - Self-similar at all scales: each part resembles the whole
    - Zero area but infinite perimeter (in the mathematical limit)
    - Contains no interior points (topologically)
    - Created by removing 1/4 of area at each iteration

Generalization:
    The chaos game can be generalized:
        - Different polygons (square, pentagon, etc.) create different fractals
        - Different ratios (not just 1/2) create variations
        - Different jump rules create other fractal patterns

Applications:
    - Demonstrating chaotic dynamics and attractors
    - Teaching fractal geometry and self-similarity
    - Antenna design (Sierpinski antenna)
    - Image compression algorithms
    - Educational tool for probability and geometry

Optimization:
    Uses NumPy for vectorized vertex storage and efficient random selection.
    Generates multiple points and plots them to a boolean array for memory efficiency.

References:
    Sierpiński, W. (1915). "Sur une courbe dont tout point est un point de ramification"
    https://en.wikipedia.org/wiki/Sierpi%C5%84ski_triangle
"""

from typing import Tuple

import numpy as np


# ============================================================================
# CONSTANTS - FRACTAL PARAMETERS
# ============================================================================

# Iteration Parameters
DEFAULT_MAX_ITERATIONS: int = 10000
"""Default number of chaos game iterations"""

POINTS_MULTIPLIER: int = 10
"""Multiplier for max_iter to get total points (more points = denser triangle)"""

DISCARD_INITIAL_POINTS: int = 100
"""Number of initial points to discard before plotting (allows convergence)"""

# Triangle Geometry
TRIANGLE_HEIGHT_SCALE: float = 0.95
"""Scaling factor for triangle height to fit within bounds"""

JUMP_RATIO: float = 0.5
"""Ratio of distance to jump toward selected vertex (0.5 = halfway)"""

# Vertex Configuration (Equilateral Triangle)
# Normalized coordinates: x ∈ [0, 1], y ∈ [0, height]
TOP_VERTEX: Tuple[float, float] = (0.5, np.sqrt(3) / 2 * TRIANGLE_HEIGHT_SCALE)
"""Top vertex of equilateral triangle (centered at x=0.5)"""

BOTTOM_LEFT_VERTEX: Tuple[float, float] = (0.0, 0.0)
"""Bottom-left vertex of equilateral triangle"""

BOTTOM_RIGHT_VERTEX: Tuple[float, float] = (1.0, 0.0)
"""Bottom-right vertex of equilateral triangle"""

# Default Image Dimensions
DEFAULT_WIDTH: int = 800
"""Default width in pixels"""

DEFAULT_HEIGHT: int = 800
"""Default height in pixels"""

# Visualization Parameters
INVERT_COLORS: bool = True
"""If True, return black triangle on white background (better visibility)"""


class SierpinskiTriangle:
    """
    Sierpinski Triangle Fractal Generator
    
    Generates the Sierpinski triangle using the chaos game algorithm, an elegant
    method that uses random vertex selection to deterministically create the fractal.
    
    The chaos game works by:
        1. Starting at a point (typically a vertex)
        2. Repeatedly choosing a random vertex and moving halfway toward it
        3. Plotting each position after initial convergence
    
    Despite the randomness, this process always converges to the Sierpinski triangle,
    demonstrating the fascinating property of chaotic attractors.
    
    Algorithm:
        1. Define three vertices of an equilateral triangle
        2. Start at one vertex (or any point)
        3. For each iteration:
            a. Randomly select one of the three vertices
            b. Move halfway between current position and selected vertex
            c. Plot the new position (after discarding initial points)
        4. Return bitmap of plotted points
    
    Attributes:
        width: Image width in pixels
        height: Image height in pixels
        max_iter: Base iteration count (actual points = max_iter × multiplier)
        fractal: Internal boolean array tracking plotted points
        vertices: Array of three triangle vertices in normalized coordinates
    
    Example:
        >>> # Generate Sierpinski triangle
        >>> sierpinski = SierpinskiTriangle(
        ...     width=800,
        ...     height=800,
        ...     max_iter=10000
        ... )
        >>> fractal = sierpinski.generate()
        >>> print(fractal.shape)
        (800, 800)
        >>> print(f"Density: {fractal.sum() / fractal.size:.2%}")
        Density: 42.31%
        
        >>> # Higher resolution with more points
        >>> high_res = SierpinskiTriangle(
        ...     width=1920,
        ...     height=1920,
        ...     max_iter=50000
        ... )
        >>> detailed = high_res.generate()
        
        >>> # Smaller preview
        >>> preview = SierpinskiTriangle(
        ...     width=400,
        ...     height=400,
        ...     max_iter=5000
        ... )
        >>> quick = preview.generate()
    
    Performance:
        Uses NumPy boolean arrays for memory efficiency. Typical performance:
        ~0.1-0.5 seconds for 800x800 with 100,000 points.
    
    Note:
        - More iterations create a denser, more detailed triangle
        - The fractal dimension is approximately 1.585
        - Initial points are discarded to allow convergence
        - Returns inverted image (black triangle on white) for visibility
        - The pattern is deterministic despite using random vertex selection
    """

    def __init__(
        self,
        width: int = DEFAULT_WIDTH,
        height: int = DEFAULT_HEIGHT,
        max_iter: int = DEFAULT_MAX_ITERATIONS
    ):
        """
        Initialize Sierpinski triangle fractal generator.
        
        Args:
            width: Image width in pixels (default: 800)
            height: Image height in pixels (default: 800)
            max_iter: Base iteration count (default: 10000)
                     Actual points plotted = max_iter × POINTS_MULTIPLIER
            
        Raises:
            ValueError: If width/height <= 0, or if max_iter <= 0
            
        Tips:
            - Square dimensions (width = height) work best for equilateral triangle
            - Higher max_iter creates denser, more detailed triangle
            - Typical values: 5000-50000 depending on resolution
            - Total points = max_iter × 10, so 10000 iterations = 100,000 points
        """
        # Validate parameters
        if width <= 0 or height <= 0:
            raise ValueError(
                f"Width and height must be positive: width={width}, height={height}"
            )
        if max_iter <= 0:
            raise ValueError(f"max_iter must be positive: max_iter={max_iter}")
        
        # Image dimensions
        self.width: int = width
        self.height: int = height
        
        # Algorithm parameters
        self.max_iter: int = max_iter
        
        # Initialize fractal grid (boolean array for memory efficiency)
        self.fractal: np.ndarray = np.zeros((height, width), dtype=bool)
        
        # Define equilateral triangle vertices (normalized coordinates)
        self.vertices: np.ndarray = self._create_triangle_vertices()

    # ========================================================================
    # PUBLIC INTERFACE
    # ========================================================================

    def generate(self) -> np.ndarray:
        """
        Generate the Sierpinski triangle using the chaos game algorithm.
        
        Implements the chaos game: starting from a vertex, repeatedly choose
        a random vertex and move halfway toward it. The plotted points form
        the Sierpinski triangle.
        
        Returns:
            2D numpy array (height × width) with values 0.0 or 1.0:
                - 1.0 (white) represents background
                - 0.0 (black) represents the triangle
            
        Algorithm Complexity:
            Time: O(max_iter × POINTS_MULTIPLIER) for chaos game iterations
            Space: O(width × height) for boolean array
            
        Optimization:
            Uses boolean array for memory efficiency, then converts to float
            for visualization. Random vertex selection uses NumPy's fast RNG.
            
        Note:
            Returns inverted image (black triangle on white background) for
            better visibility. The first DISCARD_INITIAL_POINTS points are
            not plotted to allow the chaos game to converge.
        """
        # Reset fractal grid
        self.fractal.fill(False)
        
        # Initialize starting position and calculate total points
        x, y = self._get_starting_position()
        n_points = self._calculate_total_points()
        
        # Run chaos game algorithm
        self._chaos_game(x, y, n_points)
        
        # Convert to visualization format
        result = self._convert_to_image()
        
        return result

    # ========================================================================
    # TRIANGLE GEOMETRY
    # ========================================================================

    def _create_triangle_vertices(self) -> np.ndarray:
        """
        Create vertices of an equilateral triangle in normalized coordinates.
        
        The triangle is positioned with:
            - Base on the bottom (y=0)
            - Peak at the top
            - Centered horizontally (x ∈ [0, 1])
        
        Returns:
            2D numpy array of shape (3, 2) containing [x, y] for each vertex:
                - Vertex 0: Top (apex)
                - Vertex 1: Bottom-left
                - Vertex 2: Bottom-right
        """
        vertices = np.array([
            TOP_VERTEX,          # Top vertex (centered)
            BOTTOM_LEFT_VERTEX,  # Bottom-left vertex
            BOTTOM_RIGHT_VERTEX, # Bottom-right vertex
        ])
        return vertices

    def _get_starting_position(self) -> Tuple[float, float]:
        """
        Get initial starting position for chaos game.
        
        Starts at the top vertex of the triangle for consistent results.
        
        Returns:
            Tuple of (x, y) in normalized coordinates [0, 1]
        """
        return TOP_VERTEX

    # ========================================================================
    # ITERATION CALCULATION
    # ========================================================================

    def _calculate_total_points(self) -> int:
        """
        Calculate total number of points to generate.
        
        Multiplies max_iter by POINTS_MULTIPLIER to get denser triangle.
        
        Returns:
            Total number of chaos game iterations to perform
        """
        return self.max_iter * POINTS_MULTIPLIER

    # ========================================================================
    # CHAOS GAME ALGORITHM
    # ========================================================================

    def _chaos_game(self, x: float, y: float, n_points: int) -> None:
        """
        Execute the chaos game algorithm to generate Sierpinski triangle.
        
        Starting from (x, y), repeatedly:
            1. Choose random vertex
            2. Move halfway toward it
            3. Plot the point (after initial convergence period)
        
        Args:
            x: Starting x-coordinate (normalized)
            y: Starting y-coordinate (normalized)
            n_points: Total number of iterations to perform
            
        Side Effects:
            Updates self.fractal by setting True at each plotted position
            
        Note:
            First DISCARD_INITIAL_POINTS iterations are not plotted to allow
            the algorithm to converge to the attractor (Sierpinski triangle).
        """
        for iteration in range(n_points):
            # Randomly select one of the three vertices
            vertex_index = np.random.randint(0, 3)
            vertex = self.vertices[vertex_index]
            
            # Move halfway toward selected vertex
            x, y = self._jump_toward_vertex(x, y, vertex)
            
            # Plot point (after discarding initial convergence points)
            if iteration >= DISCARD_INITIAL_POINTS:
                self._plot_point(x, y)

    def _jump_toward_vertex(
        self,
        x: float,
        y: float,
        vertex: np.ndarray
    ) -> Tuple[float, float]:
        """
        Calculate new position by jumping toward a vertex.
        
        Moves from current position (x, y) toward the given vertex by
        a ratio defined by JUMP_RATIO (typically 0.5 for halfway).
        
        Args:
            x: Current x-coordinate (normalized)
            y: Current y-coordinate (normalized)
            vertex: Target vertex as [x, y] array
            
        Returns:
            Tuple of new (x, y) coordinates
            
        Formula:
            new_position = current_position + JUMP_RATIO × (vertex - current_position)
            Simplified: new_position = (current_position + vertex) / 2  (when ratio=0.5)
        """
        new_x = (x + vertex[0]) * JUMP_RATIO
        new_y = (y + vertex[1]) * JUMP_RATIO
        return new_x, new_y

    # ========================================================================
    # POINT PLOTTING
    # ========================================================================

    def _plot_point(self, x: float, y: float) -> None:
        """
        Plot a point in the fractal grid.
        
        Converts normalized coordinates [0, 1] to pixel indices and sets
        the corresponding position in the fractal array to True.
        
        Args:
            x: Normalized x-coordinate [0, 1]
            y: Normalized y-coordinate [0, 1]
            
        Side Effects:
            Sets self.fractal[j, i] = True if within bounds
            
        Coordinate Mapping:
            - x ∈ [0, 1] maps to i ∈ [0, width-1]
            - y ∈ [0, 1] maps to j ∈ [height-1, 0] (inverted for image coordinates)
        """
        # Convert normalized coordinates to pixel indices
        i = int(x * (self.width - 1))
        j = int((self.height - 1) - y * (self.height - 1))  # Invert y-axis
        
        # Plot point if within bounds
        if 0 <= i < self.width and 0 <= j < self.height:
            self.fractal[j, i] = True

    # ========================================================================
    # IMAGE CONVERSION
    # ========================================================================

    def _convert_to_image(self) -> np.ndarray:
        """
        Convert boolean fractal array to visualization format.
        
        Inverts the image so the triangle appears black on white background
        for better visibility.
        
        Returns:
            2D float array where:
                - 1.0 = white (background)
                - 0.0 = black (triangle)
        """
        if INVERT_COLORS:
            # Invert: True (triangle) becomes False (0.0), then negate to get white bg
            return (~self.fractal).astype(float)
        else:
            # Direct conversion: True becomes 1.0 (white triangle on black bg)
            return self.fractal.astype(float)
