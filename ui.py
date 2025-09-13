from PyQt6.QtWidgets import (
    QApplication,
    QMainWindow,
    QWidget,
    QGridLayout,
    QFileDialog,
    QPushButton,
    QComboBox,
    QMessageBox,
    QLineEdit,
    QLabel,
    QProgressBar,
    QTextEdit,
    QSizePolicy
)
from PyQt6.QtCore import Qt
import sys
import numpy as np
import matplotlib
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg
import threading
import queue
import time
from fractals import Mandelbrot, Julia, BurningShip, NewtonFractal, BarnsleyFern, SierpinskiTriangle

matplotlib.use("QtAgg")

class MainWindow(QMainWindow):

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Fractal Generator")
        # self.resize(640, 800)
        self.resize(1200, 800)

        self.fractal_type = "Mandelbrot"
        self.resolution = "500x500"
        self.color_scheme = "inferno"
        self.max_iter = 100
        self.power = 2.0
        self.c_real = -0.42
        self.c_imag = 0.6
        self.fractal_types = [
            "Mandelbrot",
            "Julia",
            "Burning Ship",
            "Newton",
            "Barnsley Fern",
            "Sierpinski Triangle",
        ]
        self.resolutions = [
            "500x500",
            "800x800",
            "1024x1024",
            "1920x1080",
            "2560x1440",
            "3840x2160",
        ]
        self.color_schemes = [
            "inferno",
            "plasma",
            "viridis",
            "magma",
            "twilight",
            "coolwarm",
            "hot",
            "jet",
            "rainbow",
            "terrain",
            "ocean",
            "nipy_spectral",
        ]
        self.progress_value = 0

        layoutLeft = QGridLayout()
        layoutRight = QGridLayout()
        
        layout = QGridLayout()
        
        layout.addLayout(layoutLeft, 0, 0)
        layout.addLayout(layoutRight, 0, 1)

        self.fractal_menu_label = QLabel("Select Fractal Type:")
        self.fractal_menu = QComboBox()
        self.fractal_menu.setEditable(False)
        self.fractal_menu.addItems(self.fractal_types)
        self.fractal_menu.currentTextChanged.connect(self.combo_frac_type_changed)
        layoutLeft.addWidget(self.fractal_menu_label, 0, 0)
        layoutLeft.addWidget(self.fractal_menu, 0, 1)

        self.color_menu_label = QLabel("Select Resolution:")
        self.color_menu = QComboBox()
        self.color_menu.setEditable(False)
        self.color_menu.addItems(self.resolutions)
        self.color_menu.currentTextChanged.connect(self.combo_resolution_changed)
        layoutLeft.addWidget(self.color_menu_label, 1, 0)
        layoutLeft.addWidget(self.color_menu, 1, 1)

        self.color_menu_label = QLabel("Select Color Scheme:")
        self.color_menu = QComboBox()
        self.color_menu.setEditable(False)
        self.color_menu.addItems(self.color_schemes)
        self.color_menu.currentTextChanged.connect(self.combo_color_scheme_changed)
        layoutLeft.addWidget(self.color_menu_label, 2, 0)
        layoutLeft.addWidget(self.color_menu, 2, 1)

        self.max_iter_label = QLabel("Max Iterations:")
        self.max_iter_entry = QLineEdit()
        self.max_iter_entry.setText(str(self.max_iter))
        self.max_iter_entry.editingFinished.connect(self.edit_max_iter_changed)
        layoutLeft.addWidget(self.max_iter_label, 3, 0)
        layoutLeft.addWidget(self.max_iter_entry, 3, 1)

        self.power_label = QLabel("Power:")
        self.power_entry = QLineEdit()
        self.power_entry.setText(str(self.power))
        self.power_entry.editingFinished.connect(self.edit_power_changed)
        layoutLeft.addWidget(self.power_label, 4, 0)
        layoutLeft.addWidget(self.power_entry, 4, 1)

        self.c_real_label = QLabel("Constant (c) - Real Part:")
        self.c_real_entry = QLineEdit()
        self.c_real_entry.setText(str(self.c_real))
        self.c_real_entry.editingFinished.connect(self.edit_c_real_changed)
        self.c_imag_label = QLabel("Constant (c) - Imaginary Part:")
        self.c_imag_entry = QLineEdit()
        self.c_imag_entry.setText(str(self.c_imag))
        self.c_imag_entry.editingFinished.connect(self.edit_c_imag_changed)
        layoutLeft.addWidget(self.c_real_label,8, 0, alignment=Qt.AlignmentFlag.AlignTop) 
        layoutLeft.addWidget(self.c_real_entry, 8, 1) 
        layoutLeft.addWidget(self.c_imag_label, 9, 0) 
        layoutLeft.addWidget(self.c_imag_entry, 9, 1) 
        self.c_real_label.setVisible(False)
        self.c_real_entry.setVisible(False)
        self.c_imag_label.setVisible(False)
        self.c_imag_entry.setVisible(False)
        
        # self.text_area_label = QLabel("Notes:")
        # layout.addWidget(self.text_area_label, 5, 0)  # Add label for the text area

        self.text_area = QTextEdit()
        self.text_area.setPlaceholderText("Enter your notes here...")
        layoutLeft.addWidget(self.text_area, 5, 0, 3, 2)  # Add the text area to column 1
        
        # Set the content of the text area with a summary on fractals
        # Set the content of the text area with a formula
        self.text_area.setText(
            "<h3>Fractal Dimension Formula</h3>"
            "<p>The fractal dimension (D) can be calculated using the box-counting method:</p>"
            "<p style='text-align: center; font-size: 16px;'>"
            "<b>D = -lim<sub>&epsilon;→0</sub> (log(N(&epsilon;)) / log(&epsilon;))</b>"
            "</p>"
            "<p>Where:</p>"
            "<ul>"
            "<li><b>N(&epsilon;)</b> is the number of boxes of size <b>&epsilon;</b> needed to cover the fractal.</li>"
            "<li><b>&epsilon;</b> is the box size.</li>"
            "</ul>"
)

        # Adjust the size policy to make the text area responsive
        self.text_area.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)

        self.generate_button = QPushButton("Generate Fractal")
        self.generate_button.clicked.connect(self.generate_fractal_threaded)
        self.generate_button.setStyleSheet("QPushButton{padding: 6px;}")
        layoutRight.addWidget(self.generate_button, 0, 2, 1, 2)

        self.progress = QProgressBar()
        layoutRight.addWidget(self.progress, 1, 2, 1, 2)

        self.figure, self.ax = plt.subplots(figsize=(8, 8))
        self.canvas = FigureCanvasQTAgg(self.figure)
        layoutRight.addWidget(self.canvas, 2, 2, 4, 2)

        self.save_button = QPushButton("Save Fractal")
        self.save_button.clicked.connect(self.save_fractal)
        self.save_button.setStyleSheet("QPushButton{padding: 6px; font-weight: bold;}")
        layoutRight.addWidget(self.save_button, 6, 2, 1, 2)

        widget = QWidget()
        widget.setLayout(layout)
        self.setCentralWidget(widget)

    def combo_frac_type_changed(self, s):
        self.fractal_type = s
        fractal_type = self.fractal_type

        if fractal_type in ["Mandelbrot", "Burning Ship"]:
            self.power_label.setVisible(True)
            self.power_entry.setVisible(True)
            self.c_real_label.setVisible(False)
            self.c_real_entry.setVisible(False)
            self.c_imag_label.setVisible(False)
            self.c_imag_entry.setVisible(False)

        elif fractal_type == "Julia":
            self.power_label.setVisible(False)
            self.power_entry.setVisible(False)
            self.c_real_label.setVisible(True)
            self.c_real_entry.setVisible(True)
            self.c_imag_label.setVisible(True)
            self.c_imag_entry.setVisible(True)

        else:
            self.power_label.setVisible(False)
            self.power_entry.setVisible(False)
            self.c_real_label.setVisible(False)
            self.c_real_entry.setVisible(False)
            self.c_imag_label.setVisible(False)
            self.c_imag_entry.setVisible(False)

    def combo_resolution_changed(self, s):
        self.resolution = s

    def combo_color_scheme_changed(self, s):
        self.color_scheme = s

    def edit_max_iter_changed(self):
        try:
            self.max_iter = int(self.max_iter_entry.text())
        except:
            QMessageBox.warning(self, "Max Iterations Warning!", "The entered value must be an integer number.")

    def edit_power_changed(self):
        try:
            power = self.power_entry.text().replace(",", ".")
            self.power = float(power)
        except:
            QMessageBox.warning(self, "Power Warning!", "The entered value must be a decimal number.")

    def edit_c_real_changed(self):
        try:
            c_real = self.c_real_entry.text().replace(",", ".")
            self.c_real = float(c_real)
        except:
            QMessageBox.warning(self, "Constant (c) Real Part Warning!", "The entered value must be a decimal number.")

    def edit_c_imag_changed(self):
        try:
            c_imag = self.c_imag_entry.text().replace(",", ".")
            self.c_imag = float(c_imag)
        except:
            QMessageBox.warning(self, "Constant (c) Imaginary Part Warning!", "The entered value must be a decimal number.")

    def generate_fractal_threaded(self):
        self.queue = queue.Queue()
        threading.Thread(target=self.generate_fractal, args=(self.queue,)).start()
        time.sleep(0.1)
        self.check_queue()

    def check_queue(self):
        try:
            fractal, fractal_type, color_scheme = self.queue.get_nowait()
            self.progress.setValue(100)
            self.display_fractal(fractal, fractal_type, color_scheme)
        except queue.Empty:
            self.progress.setValue(self.progress_value)
            time.sleep(0.1)
            self.check_queue()

    def generate_fractal(self, q):
        self.generate_button.setEnabled(False)
        self.progress_value = 0
        self.progress.setValue(self.progress_value)
        fractal_type = self.fractal_type
        width, height = self.get_resolution()
        max_iter = self.max_iter
        color_scheme = self.color_scheme

        fractal = None
        if fractal_type == "Mandelbrot":
            fractal = Mandelbrot(width, height, -2, 1, -1.5, 1.5, max_iter, self.power).generate()
        elif fractal_type == "Julia":
            c = complex(self.c_real, self.c_imag)
            fractal = Julia(width, height, -2, 2, -2, 2, max_iter, c).generate()
        elif fractal_type == "Burning Ship":
            fractal = BurningShip(width, height, -2, 2, -2, 2, max_iter, self.power).generate()
        elif fractal_type == "Newton":
            fractal = NewtonFractal(width, height, -2, 2, -2, 2, max_iter).generate()
        elif fractal_type == "Barnsley Fern":
            fractal = BarnsleyFern(width, height, max_iter).generate()
        elif fractal_type == "Sierpinski Triangle":
            fractal = SierpinskiTriangle(width, height, max_iter).generate()

        q.put((fractal, fractal_type, color_scheme))
        self.fractal = fractal
        self.color_scheme_final = color_scheme

    def display_fractal(self, fractal, fractal_type, color_scheme):
        self.ax.clear()
        norm = matplotlib.colors.Normalize(vmin=fractal.min(), vmax=fractal.max())
        cmap = plt.get_cmap(color_scheme)

        width, height = self.get_resolution()

        if width == height:
            extent = (0, 1, 0, 1)
        else:
            aspect_ratio = width / height
            if aspect_ratio > 1:
                extent = (0, 16, 0, 9)
            else:
                extent = (0, 9, 0, 16)

        self.ax.imshow(fractal, cmap=cmap, norm=norm, extent=extent)
        self.ax.set_title(f"{fractal_type} - {color_scheme}")
        self.canvas.draw()
        self.generate_button.setEnabled(True)

    def save_fractal(self):
        if hasattr(self, "fractal"):
            filename = QFileDialog.getSaveFileName(
                self,
                caption="Save fractal in .png image",
                directory="fractal.png",
                filter="(*.png)",
            )
            if filename[0]:
                cmap = plt.get_cmap(self.color_scheme_final)
                plt.imsave(
                    filename[0],
                    self.fractal,
                    cmap=cmap,
                    origin="lower",
                    dpi=100,
                )
                QMessageBox.information(
                    self, "Success!", "Fractal image saved successfully."
                )
        else:
            QMessageBox.warning(self, "Warning!", "No fractal data available to save.")

    def get_resolution(self):
        res_text = self.resolution
        width, height = map(int, res_text.split("x"))
        return width, height

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    app.exec()