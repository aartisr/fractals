"""
Fractal Workspace - Interactive Fractal Generator & Analyzer

This application provides a comprehensive suite for fractal generation, analysis, and medical imaging:
- Fractal Generator: Create and visualize mathematical fractals (Mandelbrot, Julia, Newton, etc.)
- Box Counter: Compute fractal dimensions using the box counting method
- Image Compare: Compare two images using fractal dimension analysis
- Tumor Detection: Apply YOLOv5-based tumor detection on medical images

Author: Aarti S Ravikumar
Version: 1.0.0
License: See LICENSE file
"""

# =======================
# Standard Library Imports
# =======================
import sys
import threading
import queue
import time
from typing import Optional, Tuple

# =======================
# Third-Party Imports
# =======================
import cv2
import numpy as np
import matplotlib
import matplotlib.pyplot as plt
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QGridLayout, QFileDialog, QPushButton, 
    QComboBox, QMessageBox, QLineEdit, QLabel, QProgressBar, QSizePolicy, 
    QTabWidget, QFrame, QVBoxLayout, QSpacerItem, QHBoxLayout
)
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QImage, QPixmap, QMovie
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg

# =======================
# Local Imports
# =======================
from fractals.util import FractalInfoUtil
from fractals import Mandelbrot, Julia, BurningShip, NewtonFractal, BarnsleyFern, SierpinskiTriangle
from boxcounting.roi_image_label import ROIImageLabel
from boxcounting.box_counter_helpers import BoxCounterHelpers
from fractals.handlers import (
    np_to_pixmap, show_boxcount_comparison,
    combo_frac_type_changed, combo_resolution_changed, combo_color_scheme_changed,
    edit_max_iter_changed, edit_power_changed, edit_c_real_changed, edit_c_imag_changed,
    generate_fractal_threaded, save_fractal
)
from tumors.handlers import (
    handle_tumor_image_double_click,
    run_tumor_detection
)

# Set matplotlib backend
matplotlib.use("QtAgg")

# =======================
# Application Constants
# =======================
APP_TITLE = "Fractal Workspace"
APP_VERSION = "1.0.0"
MIN_WINDOW_SIZE = (600, 400)
DEFAULT_WINDOW_SIZE = (1200, 800)

# UI Constants
DEFAULT_PADDING = 16
DEFAULT_SPACING = 12
HEADER_PADDING = 8
CONTROL_PADDING = 18

# Image Constants
MIN_IMAGE_SIZE = (120, 120)
IMAGE_DISPLAY_SIZE = (180, 180)
SPINNER_SIZE = (32, 32)

# Default Fractal Parameters
DEFAULT_FRACTAL_TYPE = "Mandelbrot"
DEFAULT_RESOLUTION = "500x500"
DEFAULT_COLOR_SCHEME = "inferno"
DEFAULT_MAX_ITER = 100
DEFAULT_POWER = 2.0
DEFAULT_C_REAL = -0.42
DEFAULT_C_IMAG = 0.6
DEFAULT_ZOOM = 1.0

# Supported Formats
SUPPORTED_IMAGE_FORMATS = "Images (*.png *.jpg *.jpeg *.bmp *.tif *.tiff *.gif)"

# Style Constants (moved from inline to constants)
STYLE_HEADER = "color: #234; background: #eaf3fa; border-radius: 10px; padding: 8px 0 8px 16px; font-weight: bold;"
STYLE_BUTTON_PRIMARY = "QPushButton { font-size: 11pt; padding: 8px 18px; border-radius: 8px; background: #1976d2; color: #fff; font-weight: bold; } QPushButton:hover { background: #1565c0; }"
STYLE_BUTTON_SUCCESS = "QPushButton { font-size: 11pt; padding: 8px 18px; border-radius: 8px; background: #43a047; color: #fff; font-weight: bold; } QPushButton:hover { background: #388e3c; }"
STYLE_BUTTON_DANGER = "QPushButton { font-size: 11pt; padding: 6px 16px; border-radius: 8px; background: #e57373; color: #fff; font-weight: bold; } QPushButton:hover { background: #c62828; }"
STYLE_INPUT_FIELD = "QLineEdit { background: #fff; border: 1.5px solid #1976d2; border-radius: 7px; padding: 7px 11px; font-size: 15px; color: #0a2342; }"
STYLE_COMBO_BOX = "QComboBox { background: #fff; border: 1.5px solid #1976d2; border-radius: 7px; padding: 7px 13px; font-size: 15px; color: #0a2342; } QComboBox QAbstractItemView { background: #f7fafc; selection-background-color: #b5c7f7; color: #0a2342; }"
STYLE_IMAGE_BORDER = "border: 2.5px dashed #7da0c4; border-radius: 18px; background: #000; font-size: 13pt;"
STYLE_PROGRESS_BAR = "QProgressBar { border-radius: 7px; height: 18px; font-size: 14px; color: #0a2342; background: #eaf3fa; border: 1.5px solid #b5c7f7; } QProgressBar::chunk { background: #1976d2; border-radius: 7px; }"


class MainWindow(QMainWindow):
    """
    Main application window for the Fractal Workspace.
    
    This class manages all tabs and UI components including:
    - Fractal Generator tab for creating mathematical fractals
    - Box Counter tab for fractal dimension analysis
    - Image Compare tab for comparing images via box counting
    - Tumor Detection tab for medical image analysis
    """
    
    def __init__(self) -> None:
        """Initialize the main window and set up all tabs."""
        super().__init__()
        self.setWindowTitle(f"{APP_TITLE} v{APP_VERSION}")
        self.resize(*DEFAULT_WINDOW_SIZE)
        self.setMinimumSize(*MIN_WINDOW_SIZE)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)

        self.tabs = QTabWidget()
        self.tabs.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.setCentralWidget(self.tabs)

        # Fractal Generator Tab
        self.fractal_tab = QWidget()
        self.fractal_tab.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.setup_fractal_tab()
        self.tabs.addTab(self.fractal_tab, "Fractal Generator")

        # Box Counter Tab
        self.box_counter_tab = QWidget()
        self.box_counter_tab.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.setup_box_counter_tab()
        self.tabs.addTab(self.box_counter_tab, "Box Counter")

        # Image Compare Tab
        self.image_compare_tab = QWidget()
        self.image_compare_tab.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.setup_image_compare_tab()
        self.tabs.addTab(self.image_compare_tab, "Image Compare")

        # Tumor Detection Tab (move to bottom)
        self.tumor_detection_tab = QWidget()
        self.tumor_detection_tab.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.setup_tumor_detection_tab()
        self.tabs.addTab(self.tumor_detection_tab, "Tumor Detection")


    def setup_tumor_detection_tab(self):
        from PyQt6.QtWidgets import QGridLayout
        layout = QVBoxLayout()
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(6)

        # Header
        header = QLabel("<b style='font-size:20px;'>🧠 Tumor Detection</b>")
        header.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
        header.setStyleSheet("color: #234; background: #eaf3fa; border-radius: 10px; padding: 8px 0 8px 16px; font-weight: bold;")
        layout.addWidget(header)

        # Instructions
        instructions = QLabel(
            "<span style='color:#3d3d3d;'>Double-click an Original Image to load. Click <b>Detect</b> to run tumor detection and view results below.</span>"
        )
        instructions.setWordWrap(True)
        instructions.setStyleSheet(
            "font-size: 13px; padding-bottom: 8px; background: #f0f4f8; border-radius: 8px; padding: 10px 16px; color: #0a2342; border: 1.5px solid #b5c7f7;"
        )
        layout.addWidget(instructions)

        grid = QGridLayout()
        grid.setSpacing(12)

        self.tumor_orig_labels = []
        self.tumor_detected_labels = []
        self.tumor_detect_buttons = []

        model_titles = ["Axial Model", "Coronal Model", "Saggital Model"]
        import functools
        for col in range(3):
            # Model title
            title_label = QLabel(f"<b>{model_titles[col]}</b>")
            title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            title_label.setStyleSheet("font-size: 15pt; font-weight: bold; margin-bottom: 2px; margin-left: 2px;")
            grid.addWidget(title_label, 0, col)

            # Original Image label
            orig_label = QLabel(f"<b>Original Image {col+1}</b><br><span style='font-size:11pt;color:#cccccc'>(Double-click to load)</span>")
            orig_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            orig_label.setMinimumSize(140, 140)
            orig_label.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
            orig_label.setStyleSheet(
                "border: 2.5px dashed #7da0c4; border-radius: 18px; background: #000; font-size: 13pt; color: #fff;"
            )
            orig_label.mouseDoubleClickEvent = lambda event, idx=col: handle_tumor_image_double_click(self, idx)
            # Use the same icon and layout as Image Compare for the original image label
            orig_label.setText("""
                <div style='display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;'>
                <img src=':/qt-project.org/styles/commonstyle/images/dirclosed-32.png' width='38' height='38' style='margin-bottom:8px;opacity:0.7;'/><br>
                <b>Original Image {}</b><br><span style='font-size:11pt;color:#cccccc'>(Double-click to load)</span></div>
            """.format(col+1))
            self.tumor_orig_labels.append(orig_label)
            grid.addWidget(orig_label, 1, col)

            # Detect button
            detect_btn = QPushButton("Detect")
            detect_btn.setEnabled(False)
            detect_btn.setStyleSheet(
                "QPushButton { font-size: 13pt; padding: 8px 18px; border-radius: 8px; background: #43a047; color: #fff; font-weight: bold; } QPushButton:disabled { background: #b0b0b0; } QPushButton:hover:enabled { background: #388e3c; }"
            )
            detect_btn.clicked.connect(functools.partial(run_tumor_detection, self, col))
            self.tumor_detect_buttons.append(detect_btn)
            grid.addWidget(detect_btn, 2, col, alignment=Qt.AlignmentFlag.AlignHCenter)

            # Detected Image label
            detected_label = QLabel(f"<b>Tumor Detectection Result {col+1}</b><br><span style='font-size:11pt;color:#cccccc'>(Result)</span>")
            detected_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            detected_label.setMinimumSize(140, 140)
            detected_label.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
            detected_label.setStyleSheet(
                "border: 2.5px dashed #d32f2f; border-radius: 18px; background: #000; font-size: 13pt; color: #ff5252;"
            )
            # Use the same icon and layout as Image Compare for the detected result label
            detected_label.setText("""
                <div style='display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;'>
                <img src=':/qt-project.org/styles/commonstyle/images/dirclosed-32.png' width='38' height='38' style='margin-bottom:8px;opacity:0.7;'/><br>
                <b>Tumor Detection Result {}</b><br><span style='font-size:11pt;color:#cccccc'>(Result)</span></div>
            """.format(col+1))
            # Add drop shadow effect for consistency
            from PyQt6.QtWidgets import QGraphicsDropShadowEffect
            shadow_result = QGraphicsDropShadowEffect()
            shadow_result.setBlurRadius(16)
            shadow_result.setOffset(0, 4)
            shadow_result.setColor(Qt.GlobalColor.gray)
            detected_label.setGraphicsEffect(shadow_result)
            self.tumor_detected_labels.append(detected_label)
            grid.addWidget(detected_label, 3, col)

        layout.addLayout(grid)
        self.tumor_images = [None, None, None]
        self.tumor_results = [None, None, None]
        self.tumor_detection_tab.setLayout(layout)



    def setup_fractal_tab(self) -> None:
        """
        Set up the Fractal Generator tab UI.
        
        Creates all controls for fractal type, resolution, color scheme, and parameters.
        Handles widget creation, layout, and signal connections for the fractal generator.
        """
        # Initialize fractal parameters with default values
        self.fractal_type = DEFAULT_FRACTAL_TYPE
        self.resolution = DEFAULT_RESOLUTION
        self.color_scheme = DEFAULT_COLOR_SCHEME
        self.max_iter = DEFAULT_MAX_ITER
        self.power = DEFAULT_POWER
        self.c_real = DEFAULT_C_REAL
        self.c_imag = DEFAULT_C_IMAG
        self.zoom_level = DEFAULT_ZOOM
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

        layout = QGridLayout()
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(18)

        # Add a visually appealing header
        header = QLabel("<b style='font-size:22px;'>✨ Fractal Generator</b>")
        header.setStyleSheet(
            "color: #0a2342; background: #eaf3fa; border-radius: 10px; padding: 8px 0 8px 16px; font-weight: bold; letter-spacing: 0.5px;"
        )
        layout.addWidget(header, 0, 0, 1, 2, alignment=Qt.AlignmentFlag.AlignLeft)

        # Add a help/info section
        help_text = QLabel(
            "<span style='color:#3d3d3d;'>Select a fractal type, adjust parameters, and click <b>Generate Fractal</b> to visualize. Save your favorite images or take notes below. Tooltips are available for all controls.</span>"
        )
        help_text.setWordWrap(True)
        help_text.setStyleSheet(
            "font-size: 14px; padding-bottom: 8px; background: #f0f4f8; border-radius: 8px; padding: 10px 16px; color: #0a2342; border: 1.5px solid #b5c7f7;"
        )
        layout.addWidget(help_text, 1, 0, 1, 2)

        # Section background for controls
        controls_frame = QFrame()
        controls_frame.setStyleSheet(
            "background: #f7fafc; border-radius: 14px; border: 1.5px solid #b5c7f7; padding: 20px 20px 14px 20px;"
        )
        controls_layout = QGridLayout()

        # Fractal type selector
        self.fractal_menu_label = QLabel("<b>Fractal Type:</b>")
        self.fractal_menu_label.setStyleSheet("color: #0a2342; font-size: 15px;")
        self.fractal_menu_label.setToolTip("Choose the type of fractal to generate.")
        self.fractal_menu = QComboBox()
        self.fractal_menu.setEditable(False)
        self.fractal_menu.addItems(self.fractal_types)
        self.fractal_menu.setToolTip("Fractal type (e.g., Mandelbrot, Julia, etc.)")
        self.fractal_menu.setAccessibleName("Fractal Type Selector")
        self.fractal_menu.setStyleSheet(
            "QComboBox { background: #fff; border: 1.5px solid #1976d2; border-radius: 7px; padding: 7px 13px; font-size: 15px; color: #0a2342; } QComboBox QAbstractItemView { background: #f7fafc; selection-background-color: #b5c7f7; color: #0a2342; }"
        )
        from fractals.handlers import combo_frac_type_changed, combo_resolution_changed, combo_color_scheme_changed, edit_max_iter_changed, edit_power_changed, edit_c_real_changed, edit_c_imag_changed, generate_fractal_threaded, save_fractal
        self.fractal_menu.currentTextChanged.connect(lambda s: combo_frac_type_changed(self, s))
        controls_layout.addWidget(self.fractal_menu_label, 0, 0)
        controls_layout.addWidget(self.fractal_menu, 0, 1)

        # Resolution selector
        self.resolution_menu_label = QLabel("<b>Resolution:</b>")
        self.resolution_menu_label.setStyleSheet("color: #0a2342; font-size: 15px;")
        self.resolution_menu_label.setToolTip("Choose the output image resolution.")
        self.resolution_menu = QComboBox()
        self.resolution_menu.setEditable(False)
        self.resolution_menu.addItems(self.resolutions)
        self.resolution_menu.setToolTip("Image resolution for the generated fractal.")
        self.resolution_menu.setAccessibleName("Resolution Selector")
        self.resolution_menu.setStyleSheet(
            "QComboBox { background: #fff; border: 1.5px solid #1976d2; border-radius: 7px; padding: 7px 13px; font-size: 15px; color: #0a2342; } QComboBox QAbstractItemView { background: #f7fafc; selection-background-color: #b5c7f7; color: #0a2342; }"
        )
        self.resolution_menu.currentTextChanged.connect(lambda s: combo_resolution_changed(self, s))
        controls_layout.addWidget(self.resolution_menu_label, 1, 0)
        controls_layout.addWidget(self.resolution_menu, 1, 1)

        # Color scheme selector
        self.color_menu_label = QLabel("<b>Color Scheme:</b>")
        self.color_menu_label.setStyleSheet("color: #0a2342; font-size: 15px;")
        self.color_menu_label.setToolTip(
            "Choose the color scheme for the fractal visualization."
        )
        self.color_menu = QComboBox()
        self.color_menu.setEditable(False)
        self.color_menu.addItems(self.color_schemes)
        self.color_menu.setToolTip("Colormap for fractal rendering.")
        self.color_menu.setAccessibleName("Color Scheme Selector")
        self.color_menu.setStyleSheet(
            "QComboBox { background: #fff; border: 1.5px solid #1976d2; border-radius: 7px; padding: 7px 13px; font-size: 15px; color: #0a2342; } QComboBox QAbstractItemView { background: #f7fafc; selection-background-color: #b5c7f7; color: #0a2342; }"
        )
        self.color_menu.currentTextChanged.connect(lambda s: combo_color_scheme_changed(self, s))
        controls_layout.addWidget(self.color_menu_label, 2, 0)
        controls_layout.addWidget(self.color_menu, 2, 1)

        self.max_iter_label = QLabel("<b>Max Iterations:</b>")
        self.max_iter_label.setStyleSheet("color: #0a2342; font-size: 15px;")
        self.max_iter_label.setToolTip(
            "Maximum number of iterations for fractal calculation."
        )
        self.max_iter_entry = QLineEdit()
        self.max_iter_entry.setText(str(self.max_iter))
        self.max_iter_entry.setToolTip(
            "Enter an integer (e.g., 100). Higher values increase detail but slow down rendering."
        )
        self.max_iter_entry.setAccessibleName("Max Iterations Input")
        self.max_iter_entry.setStyleSheet(
            "QLineEdit { background: #fff; border: 1.5px solid #1976d2; border-radius: 7px; padding: 7px 11px; font-size: 15px; color: #0a2342; }"
        )
        self.max_iter_entry.editingFinished.connect(lambda: edit_max_iter_changed(self))
        controls_layout.addWidget(self.max_iter_label, 3, 0)
        controls_layout.addWidget(self.max_iter_entry, 3, 1)

        self.power_label = QLabel("<b>Power:</b>")
        self.power_label.setStyleSheet("color: #0a2342; font-size: 15px;")
        self.power_label.setToolTip(
            "Exponent used in Mandelbrot/Burning Ship fractals."
        )
        self.power_entry = QLineEdit()
        self.power_entry.setText(str(self.power))
        self.power_entry.setToolTip(
            "Enter a decimal (e.g., 2.0). Only used for Mandelbrot/Burning Ship."
        )
        self.power_entry.setAccessibleName("Power Input")
        self.power_entry.setStyleSheet(
            "QLineEdit { background: #fff; border: 1.5px solid #1976d2; border-radius: 7px; padding: 7px 11px; font-size: 15px; color: #0a2342; }"
        )
        self.power_entry.editingFinished.connect(lambda: edit_power_changed(self))
        controls_layout.addWidget(self.power_label, 4, 0)
        controls_layout.addWidget(self.power_entry, 4, 1)

        self.c_real_label = QLabel("<b>Constant (c) - Real Part:</b>")
        self.c_real_label.setStyleSheet("color: #0a2342; font-size: 15px;")
        self.c_real_label.setToolTip("Real part of the Julia set constant.")
        self.c_real_entry = QLineEdit()
        self.c_real_entry.setText(str(self.c_real))
        self.c_real_entry.setToolTip(
            "Enter a decimal (e.g., -0.42). Only used for Julia fractal."
        )
        self.c_real_entry.setAccessibleName("Julia Real Input")
        self.c_real_entry.setStyleSheet(
            "QLineEdit { background: #fff; border: 1.5px solid #1976d2; border-radius: 7px; padding: 7px 11px; font-size: 15px; color: #0a2342; }"
        )
        self.c_real_entry.editingFinished.connect(lambda: edit_c_real_changed(self))
        self.c_imag_label = QLabel("<b>Constant (c) - Imaginary Part:</b>")
        self.c_imag_label.setStyleSheet("color: #0a2342; font-size: 15px;")
        self.c_imag_label.setToolTip("Imaginary part of the Julia set constant.")
        self.c_imag_entry = QLineEdit()
        self.c_imag_entry.setText(str(self.c_imag))
        self.c_imag_entry.setToolTip(
            "Enter a decimal (e.g., 0.6). Only used for Julia fractal."
        )
        self.c_imag_entry.setAccessibleName("Julia Imaginary Input")
        self.c_imag_entry.setStyleSheet(
            "QLineEdit { background: #fff; border: 1.5px solid #1976d2; border-radius: 7px; padding: 7px 11px; font-size: 15px; color: #0a2342; }"
        )
        self.c_imag_entry.editingFinished.connect(lambda: edit_c_imag_changed(self))
        controls_layout.addWidget(self.c_real_label, 5, 0)
        controls_layout.addWidget(self.c_real_entry, 5, 1)
        controls_layout.addWidget(self.c_imag_label, 6, 0)
        controls_layout.addWidget(self.c_imag_entry, 6, 1)
        self.c_real_label.setVisible(False)
        self.c_real_entry.setVisible(False)
        self.c_imag_label.setVisible(False)
        self.c_imag_entry.setVisible(False)

        # Notes/Formula area
        from PyQt6.QtWidgets import QTextEdit
        self.text_area = QTextEdit()
        self.text_area.setReadOnly(True)
        self.text_area.setAcceptRichText(True)
        self.text_area.setStyleSheet(
            "QTextEdit { background: #f7fafc; border: 1.5px solid #b5c7f7; border-radius: 10px; font-size: 15px; color: #0a2342; padding: 12px; }"
        )
        self.text_area.setText(FractalInfoUtil.get_fractal_info(self.fractal_type))
        controls_layout.addWidget(self.text_area, 3, 0, 1, 2)
        for i in range(3):
            controls_layout.setRowStretch(i, 0)
        controls_layout.setRowStretch(3, 100)
        controls_layout.setColumnStretch(0, 1)
        controls_layout.setColumnStretch(1, 1)

        # Add controls frame to the left
        controls_frame.setLayout(controls_layout)
        # Set left column to minimum width, right to maximum
        layout.addWidget(
            controls_frame, 2, 0, 2, 1, alignment=Qt.AlignmentFlag.AlignTop
        )
        # Set left column to 35% and right to 65% of width
        layout.setColumnMinimumWidth(0, 200)
        layout.setColumnStretch(0, 7)

        # Create right panel widgets before adding to layout
        self.generate_button = QPushButton("Generate Fractal")
        self.generate_button.setToolTip(
            "Click to generate the selected fractal with current parameters."
        )
        self.generate_button.setAccessibleName("Generate Fractal Button")
        self.generate_button.clicked.connect(lambda: generate_fractal_threaded(self))
        self.generate_button.setStyleSheet(
            "QPushButton {padding: 10px 18px; font-size: 16px; background: #1976d2; color: #fff; border-radius: 9px; font-weight: bold;} QPushButton:hover {background: #0a2342;}"
        )

        self.save_button = QPushButton("Save Fractal")
        self.save_button.setToolTip(
            "Save the currently displayed fractal as a PNG image."
        )
        self.save_button.setAccessibleName("Save Fractal Button")
        self.save_button.clicked.connect(lambda: save_fractal(self))
        self.save_button.setStyleSheet(
            "QPushButton {padding: 10px 18px; font-size: 16px; background: #43aa8b; color: #fff; border-radius: 9px; font-weight: bold;} QPushButton:hover {background: #277c5a;}"
        )

        self.progress = QProgressBar()
        self.progress.setStyleSheet(
            "QProgressBar { border-radius: 7px; height: 18px; font-size: 14px; color: #0a2342; background: #eaf3fa; border: 1.5px solid #b5c7f7; } QProgressBar::chunk { background: #1976d2; border-radius: 7px; }"
        )

        # Right side: Fractal display and actions
        right_frame = QFrame()
        right_frame.setStyleSheet(
            "background: #f7fafc; border-radius: 14px; border: 1.5px solid #b5c7f7; padding: 0px 0px 0px 0px;"
        )
        # Remove extra padding for max area
        right_vbox = QVBoxLayout()
        right_vbox.setContentsMargins(0, 0, 0, 0)
        right_vbox.setSpacing(10)
        right_vbox.addWidget(self.generate_button)
        self.figure, self.ax = plt.subplots(figsize=(12, 10))
        self.canvas = FigureCanvasQTAgg(self.figure)
        self.canvas.setSizePolicy(
            QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding
        )
        right_vbox.addWidget(self.canvas, stretch=1)
        right_vbox.addWidget(self.save_button)
        right_vbox.addItem(
            QSpacerItem(
                20, 20, QSizePolicy.Policy.Minimum, QSizePolicy.Policy.Expanding
            )
        )
        right_vbox.addWidget(self.progress)
        right_frame.setLayout(right_vbox)
        layout.addWidget(right_frame, 2, 1, 2, 1)
        layout.setColumnStretch(1, 13)  # 7:13 ratio for 35%:65%
        layout.setRowStretch(2, 100)  # Maximize row for canvas
        self.fractal_tab.setLayout(layout)

   

    # Code for Box Counting
    def setup_box_counter_tab(self):
        """
        Set up the Box Counter tab UI for selecting images and computing fractal dimension of ROIs.
        Allows users to load an image, set ROI size, and click to measure fractal dimension.
        """
        from PyQt6.QtWidgets import QVBoxLayout, QHBoxLayout, QFrame

        layout = QVBoxLayout()

        # Header
        header = QLabel(
            "<h2 style='color:#234; margin-bottom:0;'>Fractal Box Counter</h2>"
        )
        header.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
        header.setStyleSheet(
            "background:#eaf3fa; color:#234; border-radius:10px; padding:10px 0 6px 18px; margin-bottom:8px;"
        )
        layout.addWidget(header)

        # Controls panel
        controls_panel = QFrame()
        controls_panel.setStyleSheet(
            "background:#f6fafd; border-radius:10px; padding:18px 18px 12px 18px; margin-bottom:8px;"
        )
        controls_layout = QHBoxLayout()
        controls_layout.setSpacing(18)

        # Select Image
        self.bc_select_btn = QPushButton("Select Image")
        self.bc_select_btn.setToolTip(
            "Load a grayscale image for box counting analysis."
        )
        self.bc_select_btn.setAccessibleName("Select Image Button")
        self.bc_select_btn.setStyleSheet(
            "QPushButton { font-size: 11pt; padding: 8px 18px; border-radius: 8px; background: #1976d2; color: #fff; font-weight: bold; } QPushButton:hover { background: #1565c0; }"
        )
        self.bc_select_btn.clicked.connect(self.bc_select_image)
        controls_layout.addWidget(self.bc_select_btn)

        # ROI Size
        roi_panel = QVBoxLayout()
        roi_label = QLabel("ROI Size:")
        roi_label.setToolTip("Region of Interest (ROI) size in pixels (e.g., 128).")
        roi_label.setStyleSheet("font-weight:bold; color:#234; font-size:10.5pt;")
        self.bc_roi_edit = QLineEdit()
        self.bc_roi_edit.setPlaceholderText("e.g. 128")
        self.bc_roi_edit.setToolTip(
            "Enter the ROI size in pixels. Must be a positive integer."
        )
        self.bc_roi_edit.setAccessibleName("ROI Size Input")
        self.bc_roi_edit.setStyleSheet(
            "font-size:11pt; padding:4px 8px; border-radius:6px; border:1.5px solid #7da0c4; color:#234; background:#fff;"
        )
        roi_panel.addWidget(roi_label)
        roi_panel.addWidget(self.bc_roi_edit)
        controls_layout.addLayout(roi_panel)

        # Apply ROI Size
        self.bc_start_btn = QPushButton("Apply ROI Size")
        self.bc_start_btn.setToolTip("Apply the specified ROI size for box counting.")
        self.bc_start_btn.setAccessibleName("Apply ROI Size Button")
        self.bc_start_btn.setStyleSheet(
            "QPushButton { font-size: 11pt; padding: 8px 18px; border-radius: 8px; background: #43a047; color: #fff; font-weight: bold; } QPushButton:hover { background: #388e3c; }"
        )
        self.bc_start_btn.clicked.connect(self.bc_apply_roi_size)
        controls_layout.addWidget(self.bc_start_btn)

        controls_panel.setLayout(controls_layout)
        layout.addWidget(controls_panel)

        # Status/info label
        self.bc_status = QLabel("No image loaded.")
        self.bc_status.setToolTip("Status of the loaded image and ROI selection.")
        self.bc_status.setStyleSheet(
            "font-size:11pt; color:#fff; background:#1976d2; border-radius:7px; padding:7px 16px; margin-bottom:8px; font-weight:bold;"
        )
        layout.addWidget(self.bc_status)

        # Instructions
        instructions = QLabel(
            "<b>Instructions:</b> <ul style='margin:0 0 0 18px;padding:0;font-size:10.5pt;color:#3a4a5d;'>"
            "<li>Click <b>Select Image</b> to load a grayscale or color image.</li>"
            "<li>Enter the <b>ROI Size</b> (e.g., 128) and click <b>Apply ROI Size</b>.</li>"
            "<li>Click on the image to select the top-left corner of the ROI for box counting.</li>"
            "<li>The fractal dimension will be computed and displayed for the selected region.</li>"
            "</ul>"
        )
        instructions.setWordWrap(True)
        instructions.setTextFormat(Qt.TextFormat.RichText)
        instructions.setAlignment(
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignTop
        )
        instructions.setStyleSheet(
            "font-size: 11pt; color: #234; background: #eaf3fa; border-radius: 8px; padding: 10px 18px; margin-bottom: 8px;"
        )
        layout.addWidget(instructions)

        # Image display area
        self.bc_image_label = ROIImageLabel(self)
        self.bc_image_label.setStyleSheet(
            "QLabel { background: #181c24; border: 2.5px solid #7da0c4; border-radius: 18px; }"
        )
        self.bc_image_label.setMinimumSize(120, 120)
        self.bc_image_label.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.bc_image_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.bc_image_label, stretch=1)

        self.box_counter_tab.setLayout(layout)

        # State
        self.bc_image = None  # Original grayscale numpy image
        self.bc_roi_size = None
        self.bc_point = None  # (x, y) top-left of last ROI
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
        self.bc_status.setText(
            f"ROI size set to {roi_size}. Click in image to measure."
        )
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


    def setup_image_compare_tab(self):
        from PyQt6.QtWidgets import QHBoxLayout, QVBoxLayout, QPushButton, QStyle, QSpacerItem, QSizePolicy, QTabWidget, QWidget
        from PyQt6.QtGui import QDragEnterEvent, QDropEvent, QIcon
        layout = QVBoxLayout()
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)

        # Header with help icon
        header_row = QHBoxLayout()
        header = QLabel("<b style='font-size:16px;'>🖼️ Image Compare</b>")
        # --- Modern Header ---
        header_row = QHBoxLayout()
        header_icon = QLabel()
        header_icon.setPixmap(QPixmap(32, 32))
        header_icon.setStyleSheet("background: url(':/qt-project.org/styles/commonstyle/images/dirclosed-32.png') no-repeat center center; min-width:32px; min-height:32px;")
        header_title = QLabel("<span style='font-size:22pt;font-weight:bold;color:#1976d2;'>Image Compare</span>")
        header_title.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
        header_row.addWidget(header_icon, stretch=0)
        header_row.addWidget(header_title, stretch=1)
        # Help/info icon
        help_icon = QLabel()
        help_icon.setPixmap(QPixmap(24, 24))
        help_icon.setStyleSheet("background: url(':/qt-project.org/styles/commonstyle/images/standardbutton-help-32.png') no-repeat center center; min-width:24px; min-height:24px; margin-left:8px;")
        help_icon.setToolTip("<b>How to use Image Compare:</b><br>\n- Double-click or drag-and-drop images into the boxes below.<br>- Use Reset to clear an image.<br>- Use Swap to switch images.<br>- Click Compare to analyze both images using box counting.<br>- Supported: PNG, JPG, GIF, BMP, TIFF.")
        header_row.addWidget(help_icon, stretch=0)
        layout.addLayout(header_row, stretch=0)

        # --- Instructions Card (Scrollable) ---
        from PyQt6.QtWidgets import QScrollArea
        instructions_card = QLabel(
            """
            <b>How to use Image Compare:</b><br>
            <ul style='margin:0 0 0 22px;padding:0;font-size:12pt;color:#234;'>
                <li><b>Load:</b> Double-click or drag-and-drop images into the boxes below.</li>
                <li><b>Reset:</b> Use Reset to clear an image.</li>
                <li><b>Swap:</b> Use the Swap Images button to switch the two images for quick comparison.</li>
                <li><b>Compare:</b> Click Compare to analyze both images using the box counting method. Steps will be shown below.</li>
            </ul>
            <b>Steps involved in Box Counting Comparison:</b>
            <ol style='margin:0 0 0 22px;padding:0;font-size:11.5pt;color:#234;'>
                <li>Convert both images to grayscale (if not already).</li>
                <li>Resize images to the same dimensions if needed.</li>
                <li>Apply thresholding to binarize both images.</li>
                <li>For each box size:
                    <ul>
                        <li>Overlay a grid of boxes on each image.</li>
                        <li>Count the number of boxes containing part of the fractal/object in each image.</li>
                    </ul>
                </li>
                <li>Repeat for multiple box sizes (scales).</li>
                <li>Plot log(box size) vs log(box count) for each image.</li>
                <li>Compute the slope of the line (fractal dimension) for each image.</li>
                <li>Compare the fractal dimensions and display the result.</li>
            </ol>
            """
        )
        instructions_card.setWordWrap(True)
        instructions_card.setTextFormat(Qt.TextFormat.RichText)
        instructions_card.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignTop)
        instructions_card.setStyleSheet("font-size: 12.5pt; color: #234; background: #f7fafc; border-radius: 14px; padding: 16px 24px; margin-bottom: 12px;")

        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setWidget(instructions_card)
        scroll_area.setMinimumHeight(180)
        scroll_area.setMaximumHeight(320)
        scroll_area.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        layout.addWidget(scroll_area, stretch=0)

        # Image drop/load area with drag-and-drop, visual feedback, and loading spinner
        img_layout = QHBoxLayout()
        img_layout.setSpacing(24)

        # Loading spinner (hidden by default)
        self._img_loading_spinner = QLabel()
        self._img_loading_spinner.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._img_loading_spinner.setVisible(False)
        spinner_movie = QMovie(":/qt-project.org/styles/commonstyle/images/working-32.gif")
        self._img_loading_spinner.setMovie(spinner_movie)
        self._img_loading_spinner.setFixedSize(32, 32)
        self._img_spinner_movie = spinner_movie

        def make_img_label(idx, color):
            class ScalableLabel(QLabel):
                def __init__(self, *args, **kwargs):
                    super().__init__(*args, **kwargs)
                    self._original_pixmap = None
                    self.setAcceptDrops(True)
                    self._drag_active = False
                def setPixmap(self, pixmap):
                    self._original_pixmap = pixmap
                    if pixmap is not None:
                        scaled = pixmap.scaled(self.size(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
                        super().setPixmap(scaled)
                        self.setText("")
                    else:
                        super().setPixmap(QPixmap())
                        self.setText(f"<b>Image {idx}</b><br><span style='font-size:11pt;color:#5a6a7a'>(Double-click or drop image)</span>")
                def resizeEvent(self, event):
                    if self._original_pixmap is not None:
                        scaled = self._original_pixmap.scaled(self.size(), Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
                        super().setPixmap(scaled)
                    super().resizeEvent(event)
                def dragEnterEvent(self, event: QDragEnterEvent):
                    if event.mimeData().hasUrls():
                        event.acceptProposedAction()
                        self._drag_active = True
                        self.setStyleSheet(f"border: 2.5px solid #1976d2; border-radius: 18px; background: #222; font-size: 13pt; color: {color};")
                    else:
                        event.ignore()
                def dragLeaveEvent(self, event):
                    self._drag_active = False
                    self.setStyleSheet(f"border: 2.5px dashed #7da0c4; border-radius: 18px; background: #000; font-size: 13pt; color: {color};")
                def dropEvent(self, event: QDropEvent):
                    self._drag_active = False
                    self.setStyleSheet(f"border: 2.5px dashed #7da0c4; border-radius: 18px; background: #000; font-size: 13pt; color: {color};")
                    if event.mimeData().hasUrls():
                        url = event.mimeData().urls()[0]
                        path = url.toLocalFile()
                        handler_parent = find_handler_parent(self)
                        if handler_parent:
                            handler_parent.handle_image_label_drop(idx, path)
            label = ScalableLabel(f"<div style='display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;'>"
                f"<img src=':/qt-project.org/styles/commonstyle/images/dirclosed-32.png' width='38' height='38' style='margin-bottom:8px;opacity:0.7;'/><br>"
                f"<b>Image {idx}</b><br><span style='font-size:11pt;color:#5a6a7a'>(Double-click or drop image)</span></div>")
            label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            label.setMinimumSize(220, 220)
            label.setMaximumSize(340, 340)
            label.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
            label.setStyleSheet(
                f"background: #000; border: 2.5px dashed #7da0c4; border-radius: 22px; font-size: 13pt; color: {color}; "
                "padding: 18px 8px 18px 8px; margin: 0 8px;"
            )
            label.setToolTip(f"Load image {idx} (double-click or drag and drop)")
            label.mouseDoubleClickEvent = lambda event: self.handle_image_label_double_click(idx)

            from PyQt6.QtWidgets import QGraphicsDropShadowEffect
            shadow = QGraphicsDropShadowEffect()
            shadow.setBlurRadius(16)
            shadow.setOffset(0, 4)
            shadow.setColor(Qt.GlobalColor.gray)
            label.setGraphicsEffect(shadow)

            return label

        self.img1_label = make_img_label(1, "#1976d2")
        self.img2_label = make_img_label(2, "#d32f2f")
        self.img1_label.setAccessibleName("Image 1 Drop Area")
        self.img2_label.setAccessibleName("Image 2 Drop Area")
        img_layout.addWidget(self.img1_label, stretch=1)
        img_layout.addWidget(self.img2_label, stretch=1)

        # --- Modern Toolbar for Actions ---
        btn_row = QHBoxLayout()
        btn_row.setSpacing(18)
        btn_row.setContentsMargins(0, 0, 0, 0)
        toolbar = QFrame()
        toolbar.setFrameShape(QFrame.Shape.StyledPanel)
        toolbar.setStyleSheet("background: #f3f7fd; border-radius: 14px; padding: 10px 18px; margin: 0 0 18px 0;")
        toolbar_layout = QHBoxLayout()
        toolbar_layout.setSpacing(18)
        toolbar_layout.setContentsMargins(0, 0, 0, 0)

        self.img1_reset_btn = QPushButton("Reset")
        self.img1_reset_btn.setToolTip("Remove/reset Image 1")
        self.img1_reset_btn.setAccessibleName("Reset Image 1 Button")
        self.img1_reset_btn.setStyleSheet("QPushButton { font-size: 12pt; padding: 8px 22px; border-radius: 8px; background: #e57373; color: #fff; font-weight: bold; } QPushButton:hover { background: #c62828; }")
        self.img1_reset_btn.clicked.connect(lambda: self.reset_image_compare(1))
        toolbar_layout.addWidget(self.img1_reset_btn)

        self.swap_btn = QPushButton("Swap Images")
        self.swap_btn.setToolTip("Swap Image 1 and Image 2")
        self.swap_btn.setAccessibleName("Swap Images Button")
        self.swap_btn.setStyleSheet("QPushButton { font-size: 12pt; padding: 8px 22px; border-radius: 8px; background: #1976d2; color: #fff; font-weight: bold; } QPushButton:hover { background: #1565c0; }")
        self.swap_btn.clicked.connect(self.swap_image_compare)
        toolbar_layout.addWidget(self.swap_btn)

        self.img2_reset_btn = QPushButton("Reset")
        self.img2_reset_btn.setToolTip("Remove/reset Image 2")
        self.img2_reset_btn.setAccessibleName("Reset Image 2 Button")
        self.img2_reset_btn.setStyleSheet("QPushButton { font-size: 12pt; padding: 8px 22px; border-radius: 8px; background: #e57373; color: #fff; font-weight: bold; } QPushButton:hover { background: #c62828; }")
        self.img2_reset_btn.clicked.connect(lambda: self.reset_image_compare(2))
        toolbar_layout.addWidget(self.img2_reset_btn)

        toolbar.setLayout(toolbar_layout)
        btn_row.addWidget(toolbar)

        # Add image area with maximum vertical stretch
        layout.addLayout(img_layout, stretch=10)
        layout.addWidget(self._img_loading_spinner, alignment=Qt.AlignmentFlag.AlignCenter)
        layout.addLayout(btn_row, stretch=0)

        # --- Modern Compare Button ---
        self.compare_btn = QPushButton("Compare")
        self.compare_btn.setEnabled(False)
        self.compare_btn.setToolTip("Compare the two loaded images using box counting")
        self.compare_btn.setAccessibleName("Compare Images Button")
        self.compare_btn.clicked.connect(self.process_image_compare)
        self.compare_btn.setStyleSheet(
            "QPushButton { font-size: 16pt; padding: 12px 36px; border-radius: 10px; background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 #1976d2, stop:1 #43a047); color: #fff; font-weight: bold; letter-spacing:1px; } QPushButton:disabled { background: #b0b0b0; } QPushButton:hover:enabled { background: #1565c0; }"
        )
        layout.addWidget(self.compare_btn, stretch=0)

        # --- Prominent Result Card ---
        # self.compare_result = QLabel("")
        # self.compare_result.setAlignment(Qt.AlignmentFlag.AlignCenter)
        # self.compare_result.setStyleSheet(
        #     "font-size: 18pt; color: #1976d2; background: #fff; border-radius: 18px; padding: 28px 18px; margin-top: 18px; border: 2.5px solid #b5c7f7;"
        # )
        # layout.addWidget(self.compare_result, stretch=0)

        self.image_compare_tab.setLayout(layout)

        # Internal state for loaded images
        self._img1_data = None
        self._img2_data = None

    def handle_image_label_drop(self, which: int, path: str) -> None:
        """
        Handle image drop event for image comparison.
        
        Args:
            which: Image slot number (1 or 2)
            path: File path to the dropped image
        """
        self._img_loading_spinner.setVisible(True)
        self._img_spinner_movie.start()
        
        try:
            from boxcounting.box_counter_utils import BoxCounterUtils
            
            if which == 1:
                result = BoxCounterUtils.load_image_for_compare(
                    self, 1, self.img1_label, self.img2_label, path=path
                )
                self._img1_data = result
                if isinstance(result, QPixmap):
                    self.img1_label.setPixmap(result)
            elif which == 2:
                result = BoxCounterUtils.load_image_for_compare(
                    self, 2, self.img1_label, self.img2_label, path=path
                )
                self._img2_data = result
                if isinstance(result, QPixmap):
                    self.img2_label.setPixmap(result)
            else:
                raise ValueError(f"Invalid image slot: {which}. Must be 1 or 2.")
            
            # Update compare button state
            img1_loaded = self._img1_data is not None
            img2_loaded = self._img2_data is not None
            if hasattr(self, 'compare_btn'):
                self.compare_btn.setEnabled(img1_loaded and img2_loaded)
            # self.compare_result.setText("")
            
        except Exception as e:
            QMessageBox.critical(
                self, 
                "Image Load Error", 
                f"Failed to load image from '{path}':\n{str(e)}"
            )
        finally:
            self._img_loading_spinner.setVisible(False)
            self._img_spinner_movie.stop()

    def swap_image_compare(self) -> None:
        """
        Swap the two loaded images.
        
        Exchanges both the image data and displayed pixmaps between Image 1 and Image 2 slots.
        Updates the compare button state accordingly.
        """
        # Only swap if both images are loaded (use internal state)
        if self._img1_data is not None and self._img2_data is not None:
            self._img1_data, self._img2_data = self._img2_data, self._img1_data

            # Swap _original_pixmap and QMovie (for GIFs)
            pix1 = getattr(self.img1_label, '_original_pixmap', None)
            pix2 = getattr(self.img2_label, '_original_pixmap', None)
            movie1 = self.img1_label.movie() if hasattr(self.img1_label, 'movie') else None
            movie2 = self.img2_label.movie() if hasattr(self.img2_label, 'movie') else None

            # Swap _original_pixmap
            self.img1_label._original_pixmap, self.img2_label._original_pixmap = pix2, pix1

            # Swap display: if movie, setMovie; else setPixmap
            if movie1 or movie2:
                # Swap QMovie objects for GIFs
                self.img1_label.clear()
                self.img2_label.clear()
                if movie2:
                    self.img1_label.setMovie(movie2)
                    movie2.start()
                elif pix2 is not None:
                    self.img1_label.setPixmap(pix2)
                if movie1:
                    self.img2_label.setMovie(movie1)
                    movie1.start()
                elif pix1 is not None:
                    self.img2_label.setPixmap(pix1)
            else:
                # Both are static images
                if pix2 is not None:
                    self.img1_label.setPixmap(pix2)
                if pix1 is not None:
                    self.img2_label.setPixmap(pix1)

            # Update compare button state
            img1_loaded = self._img1_data is not None
            img2_loaded = self._img2_data is not None
            if hasattr(self, 'compare_btn'):
                self.compare_btn.setEnabled(img1_loaded and img2_loaded)
            # self.compare_result.setText("")
        else:
            QMessageBox.warning(self, "Swap Images", "Both images must be loaded to swap.")

    def reset_image_compare(self, which):
        if which == 1:
            self._img1_data = None
            self.img1_label.setPixmap(None)
        elif which == 2:
            self._img2_data = None
            self.img2_label.setPixmap(None)
        # Disable compare button if either image is missing
        img1_loaded = self._img1_data is not None
        img2_loaded = self._img2_data is not None
        if hasattr(self, 'compare_btn'):
            self.compare_btn.setEnabled(img1_loaded and img2_loaded)
        # self.compare_result.setText("")

    # Patch handle_image_label_double_click to enable compare_btn if both images are loaded
    def handle_image_label_double_click(self, which):
        # Show spinner
        self._img_loading_spinner.setVisible(True)
        self._img_spinner_movie.start()
        try:
            from boxcounting.box_counter_utils import BoxCounterUtils
            from PyQt6.QtWidgets import QFileDialog
            import os
            if which == 1:
                # Open file dialog in the desired directory for Image 1
                start_dir = os.path.join(os.getcwd(), "images", "OAS1_0001_MR1", "PROCESSED", "MPRAGE", "SUBJ_111")
                file_path, _ = QFileDialog.getOpenFileName(self, "Select Image 1", start_dir, "Images (*.png *.jpg *.jpeg *.bmp *.tif *.tiff *.gif)")
                if file_path:
                    result = BoxCounterUtils.load_image_for_compare(self, 1, self.img1_label, self.img2_label, path=file_path)
                    self._img1_data = result
                    if isinstance(result, QPixmap):
                        self.img1_label.setPixmap(result)
            elif which == 2:
                # Open file dialog in the desired directory for Image 2
                start_dir = os.path.join(os.getcwd(), "images", "OAS1_0029_MR1", "PROCESSED", "MPRAGE", "SUBJ_111")
                file_path, _ = QFileDialog.getOpenFileName(self, "Select Image 2", start_dir, "Images (*.png *.jpg *.jpeg *.bmp *.tif *.tiff *.gif)")
                if file_path:
                    result = BoxCounterUtils.load_image_for_compare(self, 2, self.img1_label, self.img2_label, path=file_path)
                    self._img2_data = result
                    if isinstance(result, QPixmap):
                        self.img2_label.setPixmap(result)
            img1_loaded = self._img1_data is not None
            img2_loaded = self._img2_data is not None
            if hasattr(self, 'compare_btn'):
                self.compare_btn.setEnabled(img1_loaded and img2_loaded)
        except Exception as e:
            QMessageBox.critical(self, "Image Load Error", f"Failed to load image: {e}")
        finally:
            self._img_loading_spinner.setVisible(False)
            self._img_spinner_movie.stop()

    def process_image_compare(self):
        # Always use the stored image data to ensure correct mapping
        img1 = getattr(self, "_img1_data", None)
        img2 = getattr(self, "_img2_data", None)
        if img1 is None or img2 is None:
            QMessageBox.warning(
                self, "Image Compare", "Please load both images before processing."
            )
            return
        from boxcounting.box_counter_compare_dialog import show_boxcount_comparison_dialog
        # self.compare_result.setText("<i>Comparing images...<br><ul id='step-list'></ul></i>")
        self._compare_steps = []
        QApplication.processEvents()
        show_boxcount_comparison_dialog(self, img1, img2, np_to_pixmap)

    def add_compare_step(self, step_text):
        if not hasattr(self, '_compare_steps'):
            self._compare_steps = []
        self._compare_steps.append(step_text)
        html = "<b>Box Counting Steps:</b><ul style='text-align:left;'>" + ''.join(f"<li>{s}</li>" for s in self._compare_steps) + "</ul>"
        # self.compare_result.setText(html)
        QApplication.processEvents()

def find_handler_parent(widget):
    parent = widget.parent()
    while parent is not None:
        if hasattr(parent, 'handle_image_label_drop'):
            return parent
        parent = parent.parent()
    return None

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
