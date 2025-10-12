import numpy as np


class BarnsleyFern:
    """
    A class to generate the Barnsley Fern fractal.

    Attributes:
        width (int): The width of the fractal image in pixels.
        height (int): The height of the fractal image in pixels.
        max_iter (int): The maximum number of iterations to generate the fractal.
        fractal (numpy.ndarray): A 2D array representing the fractal image.

    Methods:
        generate():
            Generates the Barnsley Fern fractal and returns it as a 2D numpy array.
    """

    def __init__(self, width, height, max_iter):
        self.width = width
        self.height = height
        self.max_iter = max_iter
        self.fractal = np.zeros((height, width))

    def generate(self):
        x, y = 0, 0
        width, height = self.width, self.height
        scale_x = width / 5  # Precompute scaling factors
        scale_y = height / 10

        n_points = self.max_iter * 500  # Further increased for ultra-dense fern
        random_numbers = np.random.rand(n_points)

        for r in random_numbers:
            if r < 0.01:
                x, y = 0, 0.16 * y
            elif r < 0.86:
                x, y = 0.85 * x + 0.04 * y, -0.04 * x + 0.85 * y + 1.6
            elif r < 0.93:
                x, y = 0.2 * x - 0.26 * y, 0.23 * x + 0.22 * y + 1.6
            else:
                x, y = -0.15 * x + 0.28 * y, 0.26 * x + 0.24 * y + 0.44

            i = int((x + 2.5) * scale_x)
            j = int(y * scale_y)
            if 0 <= i < width and 0 <= j < height:
                self.fractal[j, i] += 1

        return self.fractal
