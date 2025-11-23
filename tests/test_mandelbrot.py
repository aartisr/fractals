import numpy as np
from fractals.mandelbrot import Mandelbrot

def test_mandelbrot_generate_shape():
    m = Mandelbrot(width=32, height=32, x_min=-2, x_max=1, y_min=-1.5, y_max=1.5, max_iter=10, power=2)
    result = m.generate()
    assert isinstance(result, np.ndarray)
    assert result.shape == (32, 32)
    assert np.issubdtype(result.dtype, np.integer)
    # Check that the array is not all zeros
    assert np.any(result > 0)
