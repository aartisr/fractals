import numpy as np
from fractals.newton import NewtonFractal

def test_newton_fractal_generate_shape():
    n = NewtonFractal(width=32, height=32, x_min=-2, x_max=2, y_min=-2, y_max=2, max_iter=10, n=3)
    result = n.generate()
    assert isinstance(result, np.ndarray)
    assert result.shape == (32, 32)
    assert np.any(result > 0)
