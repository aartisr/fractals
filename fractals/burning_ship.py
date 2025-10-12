import numpy as np


class BurningShip:
    """
    BurningShip fractal generator.

    This class generates the Burning Ship fractal, a variation of the Mandelbrot set
    that uses the absolute values of the real and imaginary parts of the complex number
    during iteration. The fractal is generated on a 2D grid with specified dimensions
    and bounds.

    Attributes:
        width (int): The width of the fractal image in pixels.
        height (int): The height of the fractal image in pixels.
        x_min (float): The minimum x-coordinate of the complex plane.
        x_max (float): The maximum x-coordinate of the complex plane.
        y_min (float): The minimum y-coordinate of the complex plane.
        y_max (float): The maximum y-coordinate of the complex plane.
        max_iter (int): The maximum number of iterations for the fractal computation.
        power (int): The power to which the complex number is raised during iteration.

    Methods:
        generate():
            Generates the Burning Ship fractal as a 2D NumPy array.

            Returns:
                np.ndarray: A 2D array representing the fractal, where each element
                corresponds to the number of iterations before divergence.
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
        # Precompute scaling factors and grid
        width, height = self.width, self.height
        x_vals = np.linspace(self.x_min, self.x_max, width)
        y_vals = np.linspace(self.y_min, self.y_max, height)
        fractal = np.zeros((height, width), dtype=int)

        # Iterate over the grid
        for i, y in enumerate(y_vals):
            for j, x in enumerate(x_vals):
                c = complex(x, y)
                z = 0
                for n in range(self.max_iter):
                    if abs(z) > 2:
                        fractal[i, j] = n
                        break
                    # Precompute absolute values for the Burning Ship transformation
                    z = complex(abs(z.real), abs(z.imag)) ** self.power + c

        return fractal
