import numpy as np

class Mandelbrot:
    """
    Mandelbrot class for generating Mandelbrot fractals.

    Attributes:
        width (int): The width of the output fractal image in pixels.
        height (int): The height of the output fractal image in pixels.
        x_min (float): The minimum x-coordinate of the complex plane.
        x_max (float): The maximum x-coordinate of the complex plane.
        y_min (float): The minimum y-coordinate of the complex plane.
        y_max (float): The maximum y-coordinate of the complex plane.
        max_iter (int): The maximum number of iterations for the Mandelbrot calculation.
        power (int): The power to which the complex number is raised during iteration.

    Methods:
        generate():
            Generates the Mandelbrot fractal as a 2D NumPy array.

            Returns:
                np.ndarray: A 2D array where each element represents the iteration count
                            at which the corresponding point in the complex plane escaped
                            the Mandelbrot set.
    """
    def __init__(self, width, height, x_min, x_max, y_min, y_max, max_iter, power):
        self.width = width
        self.height = height
        self.x_min = x_min
        self.x_max = x_max
        self.y_min = y_min
        self.y_max = y_max
        self.max_iter = max_iter
        self.power = power

    def generate(self):
        # Precompute grid
        width, height = self.width, self.height
        x_vals = np.linspace(self.x_min, self.x_max, width)
        y_vals = np.linspace(self.y_min, self.y_max, height)
        X, Y = np.meshgrid(x_vals, y_vals)
        C = X + 1j * Y

        # Initialize arrays
        Z = np.zeros_like(C, dtype=complex)
        fractal = np.zeros(C.shape, dtype=int)
        mask = np.ones(C.shape, dtype=bool)  # Tracks points still iterating

        # Iteratively compute the Mandelbrot set
        for n in range(self.max_iter):
            Z[mask] = Z[mask]**self.power + C[mask]
            escaped = np.abs(Z) > 2
            fractal[mask & escaped] = n
            mask &= ~escaped  # Update mask to exclude escaped points

        return fractal