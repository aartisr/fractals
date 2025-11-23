import numpy as np
from fractals.barnsley_fern import BarnsleyFern

def test_barnsley_fern_generate_shape():
    fern = BarnsleyFern(width=32, height=32, max_iter=100)
    result = fern.generate()
    assert isinstance(result, np.ndarray)
    assert result.shape == (32, 32)
    assert np.any(result > 0)
