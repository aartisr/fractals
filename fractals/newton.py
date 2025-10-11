import numpy as np

class NewtonFractal:
    """
    A class to generate the Newton fractal.

    Attributes:
        width (int): Width of the fractal image in pixels.
        height (int): Height of the fractal image in pixels.
        x_min, x_max, y_min, y_max (float): Bounds of the complex plane.
        max_iter (int): Maximum number of iterations for convergence.
        n (int): Degree of the polynomial (default is 3).

    Methods:
        generate():
            Generates the Newton fractal and returns it as a 2D NumPy array.
    """
    def __init__(self, width, height, x_min, x_max, y_min, y_max, max_iter, n=3):
        self.width = width
        self.height = height
        self.x_min = x_min
        self.x_max = x_max
        self.y_min = y_min
        self.y_max = y_max
        self.max_iter = max_iter
        self.n = n

    def generate(self):
        # Precompute grid and roots
        width, height = self.width, self.height
        x_vals = np.linspace(self.x_min, self.x_max, width)
        y_vals = np.linspace(self.y_min, self.y_max, height)
        X, Y = np.meshgrid(x_vals, y_vals)
        Z = X + 1j * Y
        roots = np.exp(2j * np.pi * np.arange(self.n) / self.n)

        # Initialize fractal array
        fractal = np.zeros(Z.shape, dtype=int)

        # Iteratively refine Z
        for _ in range(self.max_iter):
            Z -= (Z**self.n - 1) / (self.n * Z**(self.n - 1))
        
        # Find the closest root for each point
        distances = np.abs(Z[..., np.newaxis] - roots)
        fractal = np.argmin(distances, axis=-1)

        return fractal