# fractals/__init__.py

from .barnsley_fern import BarnsleyFern
from .burning_ship import BurningShip
from .julia import Julia
from .mandelbrot import Mandelbrot
from .newton import NewtonFractal
from .sierpinski_triangle import SierpinskiTriangle

__all__ = [
    "BarnsleyFern",
    "BurningShip",
    "Julia",
    "Mandelbrot",
    "NewtonFractal",
    "SierpinskiTriangle",
]