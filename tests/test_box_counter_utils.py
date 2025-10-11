import numpy as np
import pytest
from boxcounting.box_counter_utils import BoxCounterUtils

def test_box_counting_simple_square():
    # Create a simple 8x8 binary image with a filled square
    image = np.zeros((8, 8), dtype=np.uint8)
    image[2:6, 2:6] = 1
    counts, sizes = BoxCounterUtils.box_counting(image)
    assert len(counts) == len(sizes)
    assert all(c > 0 for c in counts)

def test_fractal_dim_returns_float():
    # Create a simple binary image
    image = np.zeros((16, 16), dtype=np.uint8)
    image[4:12, 4:12] = 1
    dim, elapsed = BoxCounterUtils.fractal_dim(image)
    assert isinstance(dim, float)
    assert dim > 0.0
