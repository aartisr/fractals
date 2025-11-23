import numpy as np
from fractals.julia import Julia

def test_julia_generate_shape():
    j = Julia(width=32, height=32, x_min=-2, x_max=2, y_min=-2, y_max=2, max_iter=10, c=complex(-0.7, 0.27015))
    result = j.generate()
    assert isinstance(result, np.ndarray)
    assert result.shape == (32, 32)
    assert np.any(result > 0)
