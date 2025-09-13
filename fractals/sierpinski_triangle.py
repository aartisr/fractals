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
        self.fractal = np.zeros((height, width))

    def generate(self):
        x, y = 0, 0
        width, height = self.width, self.height
        scale_x = width  # Precompute scaling factor for x
        scale_y = height  # Precompute scaling factor for y

        random_numbers = np.random.rand(self.max_iter)  # Generate all random numbers at once

        for r in random_numbers:
            if r < 0.5:
                x, y = 0.5 * x, 0.5 * y
            elif r < 0.75:
                x, y = 0.5 * x + 0.25, 0.5 * y + 0.5
            else:
                x, y = 0.5 * x + 0.5, 0.5 * y

            i = int(x * scale_x)
            j = int(y * scale_y)
            if 0 <= i < width and 0 <= j < height:
                self.fractal[j, i] += 1

        return self.fractal