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

matplotlib.use("QtAgg")

class MainWindow(QMainWindow):

    def __init__(self):
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
        layout = QGridLayout()

        # Add a QTextEdit for notes
        self.text_area = QTextEdit()
        self.text_area.setPlaceholderText("Enter your notes here...")
        layout.addWidget(self.text_area, 0, 0)

        self.notes_tab.setLayout(layout)
        
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

# Code for Box Counting
    def setup_box_counter_tab(self):
        """Embed box counting (fractal dimension of ROI) inside a QWidget (no external cv2 window)."""
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
        fname, _ = QFileDialog.getOpenFileName(
            self,
            "Select Image",
            "",
            "Images (*.png *.jpg *.jpeg *.bmp *.tif *.tiff)"
        )
        if not fname:
            return
        img = cv2.imread(fname, cv2.IMREAD_GRAYSCALE)
        if img is None:
            QMessageBox.warning(self, "Box Counter", "Failed to load image.")
            return
        self.bc_image = img
        self.bc_point = None
        self.bc_last_fd = None
        self.bc_last_time = None
        self.bc_status.setText(f"Loaded: {fname}")
        self.bc_update_display()
        
    def bc_apply_roi_size(self):
        try:
            roi_size = int(self.bc_roi_edit.text())
            if roi_size <= 0:
                raise ValueError
        except ValueError:
            QMessageBox.warning(self, "Box Counter", "ROI size must be a positive integer.")
            return
        self.bc_roi_size = roi_size
        self.bc_status.setText(f"ROI size set to {roi_size}. Click in image to measure.")
        # Redraw (just in case)
        self.bc_update_display()

    def bc_update_display(self):
        """Draw current image + optional ROI + results into the QLabel (scaled)."""
        if self.bc_image is None:
            self.bc_image_label.setText("No image")
            return

        disp = cv2.cvtColor(self.bc_image, cv2.COLOR_GRAY2BGR)

        # Draw ROI + text on original-sized image before scaling
        if self.bc_point and self.bc_roi_size:
            x, y = self.bc_point
            cv2.rectangle(
                disp,
                (x, y),
                (x + self.bc_roi_size, y + self.bc_roi_size),
                (255, 255, 255),
                2
            )
            if self.bc_last_fd is not None:
                cv2.putText(disp, f"D={self.bc_last_fd}",
                            (x + self.bc_roi_size + 5, y + 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.putText(disp, f"{self.bc_roi_size}x{self.bc_roi_size} t={self.bc_last_time}s",
                            (x + self.bc_roi_size + 5, y + 45),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        h, w = disp.shape[:2]
        qimg = QImage(disp.data, w, h, 3 * w, QImage.Format.Format_BGR888)
        pix = QPixmap.fromImage(qimg)

        target_size = self.bc_image_label.size()
        scaled = pix.scaled(
            target_size,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation
        )
        self.bc_image_label.setPixmap(scaled)

        # Store geometry for click→original mapping
        self.bc_image_label.orig_w = w
        self.bc_image_label.orig_h = h
        self.bc_image_label.disp_w = scaled.width()
        self.bc_image_label.disp_h = scaled.height()
        self.bc_image_label.offset_x = (target_size.width() - scaled.width()) // 2
        self.bc_image_label.offset_y = (target_size.height() - scaled.height()) // 2
        
                
    def bc_compute_roi(self, x, y):
        """Compute fractal dimension for ROI at (x, y)."""
        if self.bc_image is None or not self.bc_roi_size:
            return
        roi = self.bc_image[y:y + self.bc_roi_size, x:x + self.bc_roi_size]
        if roi.shape[0] != self.bc_roi_size or roi.shape[1] != self.bc_roi_size:
            self.bc_status.setText("ROI out of bounds.")
            return
        try:
            fd, tsec = self.bc_fractal_dim(roi)
            self.bc_last_fd = fd
            self.bc_last_time = tsec
            self.bc_status.setText(f"ROI ({x},{y}) D={fd} t={tsec}s")
        except Exception as e:
            self.bc_status.setText(f"Error: {e}")
            self.bc_last_fd = None
            self.bc_last_time = None
        self.bc_point = (x, y)
        self.bc_update_display()

    def bc_mouse_event(self, event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            # Start drag (store anchor)
            self.bc_drawing = True
            self.bc_point = (x, y)
        elif event == cv2.EVENT_MOUSEMOVE and self.bc_drawing:
            # Update current point while dragging for dynamic rectangle
            self.bc_point = (x, y)
        elif event == cv2.EVENT_LBUTTONUP:
            # Finalize selection
            self.bc_drawing = False

    def _bc_update_status(self, text):
        # Safe UI update from worker thread using Qt event loop
        def setter():
            self.bc_status.setText(text)
        QApplication.postEvent(self.bc_status, type(self.bc_status).update)

        # Simpler direct (acceptable if same thread schedules):
        self.bc_status.setText(text)

    # ---- Fractal dimension helpers (box counter) ----
    def bc_box_counting(self, image):
        sizes = 2 ** np.arange(1, int(np.log2(min(image.shape))) + 1)
        counts = [
            sum(
                np.any(image[x * size:(x + 1) * size, y * size:(y + 1) * size])
                for x in range((image.shape[0] + size - 1) // size)
                for y in range((image.shape[1] + size - 1) // size)
            )
            for size in sizes
        ]
        log_sizes, log_counts = np.log(sizes), np.log(counts)
        return -np.polyfit(log_sizes, log_counts, 1)[0]

    def bc_fractal_dim(self, image):
        start = time.time()
        ksize = max(51, max(image.shape) | 1)
        blur = cv2.GaussianBlur(image, (ksize, ksize), 35, borderType=cv2.BORDER_REPLICATE)
        math_result = np.clip(image.astype(int) - blur + 128, 0, 255).astype(np.uint8)
        binarized = cv2.threshold(math_result, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        processed = cv2.morphologyEx(binarized, cv2.MORPH_CLOSE, kernel)
        skeletonized = (skeletonize(processed // 255) * 255).astype(np.uint8)
        fd = self.bc_box_counting(skeletonized)
        return round(fd, 4), round(time.time() - start, 4)

class ROIImageLabel(QLabel):
    """Clickable image label used for selecting ROI top-left corner with scaling support."""
    def __init__(self, parent):
        super().__init__(parent)
        self.parent_ref = parent
        # Geometry placeholders
        self.orig_w = 0
        self.orig_h = 0
        self.disp_w = 0
        self.disp_h = 0
        self.offset_x = 0
        self.offset_y = 0
        self.setMouseTracking(True)

    def mousePressEvent(self, event):
        parent = self.parent_ref
        if parent.bc_image is None:
            return
        if not parent.bc_roi_size:
            QMessageBox.information(self, "Box Counter", "Set ROI size first.")
            return
        if self.disp_w == 0 or self.disp_h == 0:
            return  # Nothing displayed yet

        x_click = int(event.position().x())
        y_click = int(event.position().y())

        # Inside drawn pixmap?
        if not (self.offset_x <= x_click < self.offset_x + self.disp_w and
                self.offset_y <= y_click < self.offset_y + self.disp_h):
            return

        # Map to original coordinates
        rel_x = (x_click - self.offset_x) * self.orig_w / self.disp_w
        rel_y = (y_click - self.offset_y) * self.orig_h / self.disp_h
        ox = int(rel_x)
        oy = int(rel_y)

        h, w = parent.bc_image.shape[:2]
        if 0 <= ox < w and 0 <= oy < h:
            parent.bc_compute_roi(ox, oy)

    def resizeEvent(self, event):
        # Re-render scaled image on resize
        if hasattr(self.parent_ref, "bc_update_display"):
            self.parent_ref.bc_update_display()
        super().resizeEvent(event)

# ====== Box Counting code end

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    app.exec()