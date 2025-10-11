import numpy as np
from fractals.sierpinski_triangle import SierpinskiTriangle

def test_sierpinski_triangle_generate_shape():
    s = SierpinskiTriangle(width=32, height=32, max_iter=50)
    result = s.generate()
    assert isinstance(result, np.ndarray)
    assert result.shape == (32, 32)
    assert np.any(result > 0)
