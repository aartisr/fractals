import numpy as np


class SierpinskiTriangle:
    """
    SierpinskiTriangle is a class for generating the Sierpinski Triangle fractal.

    Attributes:
        width (int): The width of the fractal grid.
        height (int): The height of the fractal grid.
        max_iter (int): The maximum number of iterations to generate the fractal.
        fractal (numpy.ndarray): A 2D array representing the fractal grid.

    Methods:
        generate():
            Generates the Sierpinski Triangle fractal using an iterative random process.
            Returns:
                numpy.ndarray: A 2D array representing the generated fractal.
    """

    def __init__(self, width, height, max_iter):
        self.width = width
        self.height = height
        self.max_iter = max_iter
        self.fractal = np.zeros((height, width), dtype=bool)

    def generate(self):
        # Vertices of an equilateral triangle, normalized and centered
        v = np.array(
            [
                [0.5, np.sqrt(3) / 2 * 0.95],  # top
                [0, 0],  # bottom left
                [1, 0],  # bottom right
            ]
        )
        x, y = 0.5, np.sqrt(3) / 2 * 0.95  # start at top vertex
        width, height = self.width, self.height
        # Increase the number of points for better visibility
        n_points = self.max_iter * 10
        for _ in range(n_points):
            idx = np.random.randint(0, 3)
            x = (x + v[idx, 0]) / 2
            y = (y + v[idx, 1]) / 2
            i = int(x * (width - 1))
            j = int((height - 1) - y * (height - 1))  # y axis: top to bottom
            if 0 <= i < width and 0 <= j < height:
                self.fractal[j, i] = True
        # Invert so triangle is black on white background for visibility
        return (~self.fractal).astype(float)
