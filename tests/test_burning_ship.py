import numpy as np
from fractals.burning_ship import BurningShip

def test_burning_ship_generate_shape():
    b = BurningShip(width=32, height=32, x_min=-2, x_max=1, y_min=-1.5, y_max=1.5, max_iter=10, power=2)
    result = b.generate()
    assert isinstance(result, np.ndarray)
    assert result.shape == (32, 32)
    assert np.any(result > 0)
