"""
Fractal Workspace UI
===================

This application provides a graphical user interface (GUI) for generating, visualizing, and analyzing fractals.

Features:
- Generate and customize various fractal types (Mandelbrot, Julia, Burning Ship, Newton, Barnsley Fern, Sierpinski Triangle)
- Save generated fractal images
- Take notes and view fractal dimension formulas
- Perform box counting (fractal dimension estimation) on regions of interest (ROI) in images

Instructions:
1. Run this script to launch the Fractal Workspace.
2. Use the tabs to switch between Fractal Generator, Fractal Box Counting, and Box Counter tools.
3. In the Fractal Generator tab, select a fractal type, adjust parameters, and click 'Generate Fractal'.
4. In the Box Counter tab, load an image, set ROI size, and click on the image to compute the fractal dimension of the selected region.
5. Use the Save button to export fractal images.

Requirements:
- Python 3.7+
- PyQt6
- OpenCV (cv2)
- NumPy
- Matplotlib
- scikit-image
"""
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
    QSizePolicy,
    QTabWidget
)
from PyQt6.QtCore import Qt
import sys
import cv2
import numpy as np
import matplotlib
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg
import threading
import queue
import time
from fractals import Mandelbrot, Julia, BurningShip, NewtonFractal, BarnsleyFern, SierpinskiTriangle
from skimage.morphology import skeletonize
from PyQt6.QtGui import QImage, QPixmap

# Import ROIImageLabel and BoxCounterUtils from the new modules
from boxcounting.roi_image_label import ROIImageLabel
from boxcounting.box_counter_utils import BoxCounterUtils
from boxcounting.box_counter_helpers import BoxCounterHelpers

matplotlib.use("QtAgg")

class MainWindow(QMainWindow):

    """
    Main window for the Fractal Workspace application.
    Provides tabs for fractal generation, notes, and box counting.
    """

    def __init__(self):
        """
        Initialize the main window and set up all tabs and UI components.
        """
        super().__init__()
        self.setWindowTitle("Fractal Workspace")
        # self.resize(640, 800)
        self.resize(1200, 800)
        
        # Create a QTabWidget
        self.tabs = QTabWidget()

        # Create the first tab (Fractal Generator)
        self.fractal_tab = QWidget()
        self.setup_fractal_tab()
        self.tabs.addTab(self.fractal_tab, "Fractal Generator")

        # Create the second tab (Settings or Notes)
        self.notes_tab = QWidget()
        self.setup_notes_tab()
        self.tabs.addTab(self.notes_tab, "Fractal Box Counting")
        
         # Create third tab (Fractal Box Counter)
        self.box_counter_tab = QWidget()
        self.setup_box_counter_tab()
        self.tabs.addTab(self.box_counter_tab, "Box Counter")
        
        # Set the QTabWidget as the central widget
        self.setCentralWidget(self.tabs)
      

    def setup_fractal_tab(self):
        """
        Set up the Fractal Generator tab UI, including controls for fractal type, resolution, color scheme, and parameters.
        Handles all widget creation and layout for the fractal generator.
        """
        # Set the QTabWidget as the central widget
       
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

        
        self.fractal_tab.setLayout(layout)
        # widget = QWidget()
        # widget.setLayout(layout)
        # self.setCentralWidget(widget)

    def setup_notes_tab(self):
        """
        Set up the Notes tab UI for user notes and reference formulas.
        Provides a QTextEdit for user notes.
        """
        layout = QGridLayout()

        # Add a QTextEdit for notes
        self.text_area = QTextEdit()
        self.text_area.setPlaceholderText("Enter your notes here...")
        layout.addWidget(self.text_area, 0, 0)

        self.notes_tab.setLayout(layout)
        
    def combo_frac_type_changed(self, s):
        """
        Update parameter fields visibility based on selected fractal type.
        Args:
            s (str): Selected fractal type.
        """
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
        """
        Update the selected resolution.
        Args:
            s (str): Selected resolution string.
        """
        self.resolution = s

    def combo_color_scheme_changed(self, s):
        """
        Update the selected color scheme.
        Args:
            s (str): Selected color scheme.
        """
        self.color_scheme = s

    def edit_max_iter_changed(self):
        """
        Validate and update the maximum iterations parameter.
        Shows a warning if the value is not an integer.
        """
        try:
            self.max_iter = int(self.max_iter_entry.text())
        except ValueError:
            QMessageBox.warning(self, "Max Iterations Warning!", "The entered value must be an integer number.")

    def edit_power_changed(self):
        """
        Validate and update the power parameter.
        Shows a warning if the value is not a float.
        """
        try:
            power = self.power_entry.text().replace(",", ".")
            self.power = float(power)
        except ValueError:
            QMessageBox.warning(self, "Power Warning!", "The entered value must be a decimal number.")

    def edit_c_real_changed(self):
        """
        Validate and update the real part of the Julia set constant.
        Shows a warning if the value is not a float.
        """
        try:
            c_real = self.c_real_entry.text().replace(",", ".")
            self.c_real = float(c_real)
        except ValueError:
            QMessageBox.warning(self, "Constant (c) Real Part Warning!", "The entered value must be a decimal number.")

    def edit_c_imag_changed(self):
        """
        Validate and update the imaginary part of the Julia set constant.
        Shows a warning if the value is not a float.
        """
        try:
            c_imag = self.c_imag_entry.text().replace(",", ".")
            self.c_imag = float(c_imag)
        except ValueError:
            QMessageBox.warning(self, "Constant (c) Imaginary Part Warning!", "The entered value must be a decimal number.")

    def generate_fractal_threaded(self):
        """
        Start fractal generation in a separate thread to keep the UI responsive.
        Handles exceptions and disables the generate button during processing.
        """
        self.queue = queue.Queue()
        try:
            threading.Thread(target=self.generate_fractal, args=(self.queue,)).start()
            time.sleep(0.1)
            self.check_queue()
        except Exception as e:
            QMessageBox.critical(self, "Thread Error", f"Error starting fractal generation thread: {e}")

    def check_queue(self):
        """
        Check the queue for completed fractal generation and update the UI.
        Handles queue empty state and updates progress.
        """
        try:
            fractal, fractal_type, color_scheme = self.queue.get_nowait()
            self.progress.setValue(100)
            self.display_fractal(fractal, fractal_type, color_scheme)
        except queue.Empty:
            self.progress.setValue(self.progress_value)
            time.sleep(0.1)
            self.check_queue()
        except Exception as e:
            QMessageBox.critical(self, "Queue Error", f"Error checking fractal generation queue: {e}")

    def generate_fractal(self, q):
        """
        Generate the selected fractal and put the result in the queue.
        Handles exceptions and disables the generate button during processing.
        """
        self.generate_button.setEnabled(False)
        self.progress_value = 0
        self.progress.setValue(self.progress_value)
        fractal_type = self.fractal_type
        width, height = self.get_resolution()
        max_iter = self.max_iter
        color_scheme = self.color_scheme

        try:
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
        except Exception as e:
            QMessageBox.critical(self, "Fractal Generation Error", f"Error generating fractal: {e}")
            self.generate_button.setEnabled(True)

    def display_fractal(self, fractal, fractal_type, color_scheme):
        """
        Display the generated fractal image on the canvas.
        Handles exceptions and ensures the UI is updated.
        """
        try:
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
        except Exception as e:
            QMessageBox.critical(self, "Display Error", f"Error displaying fractal: {e}")
        finally:
            self.generate_button.setEnabled(True)

    def save_fractal(self):
        """
        Save the currently displayed fractal image to a PNG file.
        Handles exceptions and shows user-friendly messages.
        """
        if hasattr(self, "fractal"):
            try:
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
            except Exception as e:
                QMessageBox.critical(self, "Save Error", f"Error saving fractal image: {e}")
        else:
            QMessageBox.warning(self, "Warning!", "No fractal data available to save.")

    def get_resolution(self):
        """
        Parse the selected resolution string and return width and height as integers.
        """
        res_text = self.resolution
        width, height = map(int, res_text.split("x"))
        return width, height

# Code for Box Counting
    def setup_box_counter_tab(self):
        """
        Set up the Box Counter tab UI for selecting images and computing fractal dimension of ROIs.
        Allows users to load an image, set ROI size, and click to measure fractal dimension.
        """
        layout = QGridLayout()

        # Controls
        self.bc_select_btn = QPushButton("Select Image")
        self.bc_select_btn.clicked.connect(self.bc_select_image)
        layout.addWidget(self.bc_select_btn, 0, 0, 1, 2)

        layout.addWidget(QLabel("ROI Size:"), 1, 0)
        self.bc_roi_edit = QLineEdit()
        self.bc_roi_edit.setPlaceholderText("e.g. 128")
        layout.addWidget(self.bc_roi_edit, 1, 1)

        self.bc_start_btn = QPushButton("Apply ROI Size")
        self.bc_start_btn.clicked.connect(self.bc_apply_roi_size)
        layout.addWidget(self.bc_start_btn, 2, 0, 1, 2)

        self.bc_status = QLabel("No image loaded.")
        layout.addWidget(self.bc_status, 3, 0, 1, 2)

        # Image display area
        # Image display area (make it fill remaining space)
        self.bc_image_label = ROIImageLabel(self)
        self.bc_image_label.setStyleSheet("QLabel { background: #111; border: 1px solid #444; }")
        self.bc_image_label.setMinimumSize(400, 400)
        self.bc_image_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.bc_image_label.setSizePolicy(
            QSizePolicy.Policy.Expanding,
            QSizePolicy.Policy.Expanding
        )
        # Span both columns, single row; give this row stretch
        layout.addWidget(self.bc_image_label, 4, 0, 1, 2)

        # Stretch: rows 0–3 (controls) minimal, row 4 (image) expands
        for r in range(0, 4):
            layout.setRowStretch(r, 0)
        layout.setRowStretch(4, 1)

        # Ensure columns expand evenly
        layout.setColumnStretch(0, 1)
        layout.setColumnStretch(1, 1)

        self.box_counter_tab.setLayout(layout)

        # State
        self.bc_image = None          # Original grayscale numpy image
        self.bc_roi_size = None
        self.bc_point = None          # (x, y) top-left of last ROI
        self.bc_last_fd = None
        self.bc_last_time = None
        
 # ---------- Box Counter (embedded) helpers ----------
    def bc_select_image(self):
        """
        Use BoxCounterHelpers to select and load an image for box counting.
        """
        result = BoxCounterHelpers.select_image(self)
        if result is None:
            return
        img, fname = result
        self.bc_image = img
        self.bc_point = None
        self.bc_last_fd = None
        self.bc_last_time = None
        self.bc_status.setText(f"Loaded: {fname}")
        BoxCounterHelpers.update_display(self)
        
    def bc_apply_roi_size(self):
        """
        Use BoxCounterHelpers to set the ROI size for box counting.
        """
        roi_size = BoxCounterHelpers.apply_roi_size(self, self.bc_roi_edit.text())
        if roi_size is None:
            return
        self.bc_roi_size = roi_size
        self.bc_status.setText(f"ROI size set to {roi_size}. Click in image to measure.")
        BoxCounterHelpers.update_display(self)

    def bc_update_display(self):
        """
        Use BoxCounterHelpers to update the display for box counting.
        """
        BoxCounterHelpers.update_display(self)
        
                
    def bc_compute_roi(self, x, y):
        """
        Use BoxCounterHelpers to compute the fractal dimension for the ROI and update the display.
        """
        BoxCounterHelpers.compute_roi(self, x, y)



# ====== Box Counting code end

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    app.exec()