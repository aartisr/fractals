import numpy as np

class Julia:
    def __init__(self, width, height, x_min, x_max, y_min, y_max, max_iter, c):
        """
        Initialize the parameters for generating a Julia set fractal.

        Args:
            width (int): The width of the output image in pixels.
            height (int): The height of the output image in pixels.
            x_min (float): The minimum value of the real axis.
            x_max (float): The maximum value of the real axis.
            y_min (float): The minimum value of the imaginary axis.
            y_max (float): The maximum value of the imaginary axis.
            max_iter (int): The maximum number of iterations for the fractal computation.
            c (complex): The complex constant used in the Julia set formula.
        """
        self.width = width
        self.height = height
        self.x_min = x_min
        self.x_max = x_max
        self.y_min = y_min
        self.y_max = y_max
        self.max_iter = max_iter
        self.c = c

    def generate(self):
        # Precompute grid
        width, height = self.width, self.height
        x_vals = np.linspace(self.x_min, self.x_max, width)
        y_vals = np.linspace(self.y_min, self.y_max, height)
        X, Y = np.meshgrid(x_vals, y_vals)
        Z = X + 1j * Y

        # Initialize arrays
        fractal = np.zeros(Z.shape, dtype=int)
        mask = np.ones(Z.shape, dtype=bool)  # Tracks points still iterating

        # Iteratively compute the Julia set
        for n in range(self.max_iter):
            Z[mask] = Z[mask]**2 + self.c
            escaped = np.abs(Z) > 2
            fractal[mask & escaped] = n
            mask &= ~escaped  # Update mask to exclude escaped points

        return fractal