"""
Box Counting Comparison Dialog Module

This module provides a comprehensive dialog for comparing fractal dimensions between two images
using the box-counting method. It includes preprocessing, visualization, calculation, and export
functionality.

The main function show_boxcount_comparison_dialog() creates an interactive dialog that:
1. Preprocesses images (grayscale conversion and binarization)
2. Performs box counting at multiple scales
3. Calculates fractal dimensions via linear regression
4. Displays visualizations and interpretations
5. Provides export functionality (PDF and PNG)
"""

import io
import base64
import re
from typing import Tuple, List, Optional, Callable

import numpy as np
import cv2
import matplotlib.pyplot as plt
from matplotlib.backends.backend_agg import FigureCanvasAgg
import matplotlib.patches as patches

from PyQt6.QtWidgets import (
    QDialog,
    QLabel,
    QVBoxLayout,
    QGridLayout,
    QWidget,
    QScrollArea,
    QPushButton,
    QHBoxLayout,
    QFileDialog,
    QMessageBox,
    QTextEdit,
)
from PyQt6.QtCore import Qt, QByteArray, QBuffer, QPoint
from PyQt6.QtGui import QPixmap, QImage
from PyQt6.QtPrintSupport import QPrinter
from PyQt6.QtGui import QTextDocument

# ============================================================================
# CONSTANTS AND CONFIGURATION
# ============================================================================

# Box counting configuration
BOX_SIZES = [32, 16, 8]

# Thumbnail and display dimensions
THUMBNAIL_SIZE = 120
LOGLOG_PLOT_SIZE = (300, 240)
LOGLOG_PLOT_MAGNIFIED_SIZE = (600, 480)
MINI_PLOT_SIZE = (180, 140)
BOX_OVERLAY_PLOT_SIZE = (340, 120)
FULL_LOGLOG_PLOT_SIZE = (300, 240)

# Dialog dimensions
DIALOG_MIN_WIDTH = 900
DIALOG_DEFAULT_SIZE = (900, 700)

# Color scheme
COLOR_IMAGE1 = '#1976d2'
COLOR_IMAGE2 = '#d32f2f'
COLOR_GRID = 'lime'
COLOR_PRIMARY = '#2d4157'
COLOR_TEXT = '#223'

# Styling constants
STYLE_STEP_BOX_1 = (
    "background:#f9f6fa; border-radius:10px; padding:0px 0px 0px 0px; "
    "margin-bottom:8px; color:#223;"
)
STYLE_STEP_BOX_2 = (
    "background:#f9f6fa; border-radius:10px; padding:0px 0px 0px 0px; "
    "margin-bottom:8px; color:#223;"
)
STYLE_STEP_BOX_3 = (
    "background:#f6f9fa; border-radius:10px; padding:0px 0px 0px 0px; "
    "margin-bottom:8px; color:#223;"
)
STYLE_STEP_BOX_4 = (
    "background:#f8f8fa; border-radius:10px; padding:0px 0px 0px 0px; "
    "margin-bottom:8px; color:#223;"
)
STYLE_INTERPRETATION_BOX = (
    "background:#f3f8f6; border-radius:10px; padding:12px 8px 8px 8px; "
    "margin-bottom:12px; color:#223;"
)
STYLE_STEP_TITLE = "font-weight:bold; color:#2d4157; margin-bottom:2px;"
STYLE_WHITE_BOX = (
    "font-size:11.5pt; background:#fff; border-radius:6px; padding:8px; color:#223;"
)
STYLE_HEADER = (
    "font-size:14pt; background:#fff; border-radius:8px; padding:12px; "
    "margin-bottom:12px; color:#223; border:1px solid #ddd;"
)
STYLE_BTN_EXPORT_PDF = (
    "font-size:13pt; padding:8px 32px; border-radius:8px; background:#43aa8b; "
    "color:white; font-weight:bold; margin-top:12px; margin-right:12px;"
)
STYLE_BTN_EXPORT_IMG = (
    "font-size:13pt; padding:8px 32px; border-radius:8px; background:#f9c846; "
    "color:#222; font-weight:bold; margin-top:12px; margin-right:12px;"
)
STYLE_BTN_CLOSE = (
    "font-size:13pt; padding:8px 32px; border-radius:8px; background:#1976d2; "
    "color:white; font-weight:bold; margin-top:12px;"
)

# Grid overlay settings
GRID_LINE_WIDTH = 0.7
GRID_LINE_ALPHA = 0.7


# ============================================================================
# IMAGE PROCESSING UTILITIES
# ============================================================================

def preprocess_image(img: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Preprocess an image for box counting analysis.
    
    Converts image to grayscale and then binarizes it using Otsu's method.
    Also creates RGB versions for display purposes.
    
    Args:
        img: Input image as numpy array (BGR or RGB format)
        
    Returns:
        Tuple containing:
        - img_gray: Grayscale image
        - img_bin: Binarized image (binary mask)
        - img_gray_rgb: Grayscale image in RGB format for display
        - img_bin_rgb: Binarized image in RGB format for display
    """
    img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, img_bin = cv2.threshold(img_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    img_gray_rgb = cv2.cvtColor(img_gray, cv2.COLOR_GRAY2RGB)
    img_bin_rgb = cv2.cvtColor(img_bin, cv2.COLOR_GRAY2RGB)
    return img_gray, img_bin, img_gray_rgb, img_bin_rgb


def calculate_box_counts(img_bin: np.ndarray, box_sizes: List[int]) -> List[int]:
    """
    Calculate box counts for different box sizes.
    
    For each box size, counts how many boxes contain at least one white pixel
    (foreground) in the binarized image.
    
    Args:
        img_bin: Binarized image (binary mask)
        box_sizes: List of box sizes to use for counting
        
    Returns:
        List of box counts corresponding to each box size
    """
    counts = []
    for size in box_sizes:
        count = sum(
            np.any(img_bin[x: x + size, y: y + size])
            for x in range(0, img_bin.shape[0], size)
            for y in range(0, img_bin.shape[1], size)
        )
        counts.append(count)
    return counts


def calculate_fractal_dimension(
    box_sizes: List[int], 
    counts: List[int]
) -> Tuple[float, np.ndarray, np.ndarray]:
    """
    Calculate fractal dimension using box counting method.
    
    Uses linear regression on the log-log plot of box size vs count.
    The slope of the regression line is the fractal dimension.
    
    Args:
        box_sizes: List of box sizes used for counting
        counts: List of box counts corresponding to each box size
        
    Returns:
        Tuple containing:
        - fractal_dimension: Estimated fractal dimension (slope)
        - log_sizes: Log of inverse box sizes (1/epsilon)
        - log_counts: Log of box counts
    """
    log_sizes = np.log(1 / np.array(box_sizes))
    log_counts = np.log(counts)
    fractal_dimension, _ = np.polyfit(log_sizes, log_counts, 1)
    return fractal_dimension, log_sizes, log_counts


# ============================================================================
# VISUALIZATION UTILITIES
# ============================================================================

def create_box_overlay_visualization(
    img_bin: np.ndarray,
    box_sizes: List[int],
    label: str,
    color: str
) -> QPixmap:
    """
    Create visualization showing box grid overlays on binarized image.
    
    Creates a matplotlib figure with subplots showing the binarized image
    with grid overlays for each box size.
    
    Args:
        img_bin: Binarized image
        box_sizes: List of box sizes to visualize
        label: Label for this visualization (e.g., "Image 1")
        color: Color code for the label
        
    Returns:
        QPixmap containing the rendered visualization
    """
    fig, axs = plt.subplots(1, len(box_sizes), figsize=(2.5 * len(box_sizes), 2.5))
    if len(box_sizes) == 1:
        axs = [axs]
    
    for j, size in enumerate(box_sizes):
        axs[j].imshow(img_bin, cmap='gray')
        axs[j].set_title(f'Box size: {size}')
        axs[j].axis('off')
        # Draw grid
        for x in range(0, img_bin.shape[0], size):
            axs[j].axhline(x - 0.5, color=COLOR_GRID, lw=GRID_LINE_WIDTH, alpha=GRID_LINE_ALPHA)
        for y in range(0, img_bin.shape[1], size):
            axs[j].axvline(y - 0.5, color=COLOR_GRID, lw=GRID_LINE_WIDTH, alpha=GRID_LINE_ALPHA)
    
    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    
    qimg = QImage()
    qimg.loadFromData(buf.getvalue(), "PNG")
    return QPixmap.fromImage(qimg)


def create_loglog_plot(
    log_sizes1: np.ndarray,
    log_counts1: np.ndarray,
    log_sizes2: np.ndarray,
    log_counts2: np.ndarray,
    figsize: Tuple[float, float] = (2.5, 2.1),
    title: str = "Log-Log Plot"
) -> QPixmap:
    """
    Create log-log plot comparing two images.
    
    Args:
        log_sizes1: Log of inverse box sizes for image 1
        log_counts1: Log of box counts for image 1
        log_sizes2: Log of inverse box sizes for image 2
        log_counts2: Log of box counts for image 2
        figsize: Figure size (width, height) in inches
        title: Plot title
        
    Returns:
        QPixmap containing the rendered plot
    """
    fig, ax = plt.subplots(figsize=figsize)
    ax.plot(log_sizes1, log_counts1, "o-b", label="Image 1")
    ax.plot(log_sizes2, log_counts2, "o-r", label="Image 2")
    ax.set_xlabel("log(1/ε)")
    ax.set_ylabel("log N(ε)")
    ax.set_title(title)
    ax.legend(fontsize=8 if figsize[0] < 3 else 10)
    plt.tight_layout()
    
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    
    qimg = QImage()
    qimg.loadFromData(buf.getvalue(), "PNG")
    return QPixmap.fromImage(qimg)


def pixmap_to_base64(pixmap: QPixmap) -> str:
    """
    Convert QPixmap to base64 encoded string.
    
    Used for embedding images in HTML/PDF exports.
    
    Args:
        pixmap: QPixmap to convert
        
    Returns:
        Base64 encoded string representation of the pixmap
    """
    byte_array = QByteArray()
    buffer = QBuffer(byte_array)
    buffer.open(QBuffer.OpenModeFlag.WriteOnly)
    pixmap.save(buffer, "PNG")
    buffer.close()
    return base64.b64encode(byte_array.data()).decode()


# ============================================================================
# UI COMPONENT BUILDERS
# ============================================================================

def create_step_box(title: str, style: str) -> Tuple[QWidget, QVBoxLayout]:
    """
    Create a styled step box container with title.
    
    Args:
        title: HTML formatted title text
        style: CSS style string for the box
        
    Returns:
        Tuple of (widget, layout) for the step box
    """
    box = QWidget()
    box.setStyleSheet(style)
    layout = QVBoxLayout(box)
    layout.setContentsMargins(0, 0, 0, 0)
    layout.setSpacing(4)
    
    title_label = QLabel(title)
    title_label.setAlignment(Qt.AlignmentFlag.AlignLeft)
    title_label.setStyleSheet(STYLE_STEP_TITLE)
    layout.addWidget(title_label)
    
    return box, layout


def create_image_label(
    pixmap: QPixmap,
    np_to_pixmap: Callable,
    img_array: np.ndarray,
    tooltip: str,
    size: int = THUMBNAIL_SIZE
) -> QLabel:
    """
    Create a QLabel with a scaled image and tooltip.
    
    Args:
        pixmap: Original QPixmap (not used directly, for compatibility)
        np_to_pixmap: Function to convert numpy array to QPixmap
        img_array: Numpy array of the image
        tooltip: Tooltip text
        size: Display size (width and height)
        
    Returns:
        Configured QLabel with image
    """
    label = QLabel()
    label.setPixmap(
        np_to_pixmap(np.copy(img_array)).scaled(
            size,
            size,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
    )
    label.setToolTip(tooltip)
    return label


def create_preprocessing_grid(
    img1: np.ndarray,
    img1_gray_rgb: np.ndarray,
    img1_bin_rgb: np.ndarray,
    img2: np.ndarray,
    img2_gray_rgb: np.ndarray,
    img2_bin_rgb: np.ndarray,
    np_to_pixmap: Callable
) -> Tuple[QWidget, dict]:
    """
    Create preprocessing visualization grid showing transformation steps.
    
    Args:
        img1: Original image 1
        img1_gray_rgb: Grayscale version of image 1 (RGB format)
        img1_bin_rgb: Binarized version of image 1 (RGB format)
        img2: Original image 2
        img2_gray_rgb: Grayscale version of image 2 (RGB format)
        img2_bin_rgb: Binarized version of image 2 (RGB format)
        np_to_pixmap: Function to convert numpy array to QPixmap
        
    Returns:
        Tuple of (widget containing grid, dict of labels for export)
    """
    pre_hbox = QWidget()
    pre_layout = QGridLayout()
    pre_layout.setContentsMargins(0, 0, 0, 0)
    pre_layout.setSpacing(8)
    
    # Headers
    headers = [
        (0, 0, "<b>Step</b>"),
        (0, 1, "<b style='color:#1976d2;'>Image 1</b>"),
        (0, 2, "<b style='color:#d32f2f;'>Image 2</b>"),
    ]
    for row, col, text in headers:
        header = QLabel(text)
        header.setAlignment(Qt.AlignmentFlag.AlignCenter)
        pre_layout.addWidget(header, row, col)
    
    # Step labels
    step_labels = [
        (1, 0, "Original"),
        (2, 0, "Grayscale"),
        (3, 0, "Binarized"),
    ]
    for row, col, text in step_labels:
        label = QLabel(f"<b>{text}</b>")
        label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        pre_layout.addWidget(label, row, col)
    
    # Image 1 labels
    img1_orig_label = create_image_label(None, np_to_pixmap, img1, "Original Image 1")
    img1_gray_label = create_image_label(None, np_to_pixmap, img1_gray_rgb, "Grayscale Image 1")
    img1_bin_label = create_image_label(None, np_to_pixmap, img1_bin_rgb, "Binarized Image 1")
    
    pre_layout.addWidget(img1_orig_label, 1, 1)
    pre_layout.addWidget(img1_gray_label, 2, 1)
    pre_layout.addWidget(img1_bin_label, 3, 1)
    
    # Image 2 labels
    img2_orig_label = create_image_label(None, np_to_pixmap, img2, "Original Image 2")
    img2_gray_label = create_image_label(None, np_to_pixmap, img2_gray_rgb, "Grayscale Image 2")
    img2_bin_label = create_image_label(None, np_to_pixmap, img2_bin_rgb, "Binarized Image 2")
    
    pre_layout.addWidget(img2_orig_label, 1, 2)
    pre_layout.addWidget(img2_gray_label, 2, 2)
    pre_layout.addWidget(img2_bin_label, 3, 2)
    
    pre_hbox.setLayout(pre_layout)
    
    # Return labels for export
    labels = {
        'img1_orig': img1_orig_label,
        'img1_gray': img1_gray_label,
        'img1_bin': img1_bin_label,
        'img2_orig': img2_orig_label,
        'img2_gray': img2_gray_label,
        'img2_bin': img2_bin_label,
    }
    
    return pre_hbox, labels


# ============================================================================
# MAGNIFICATION POPUP (for hover effect)
# ============================================================================

class MagnifyPopup(QDialog):
    """Frameless popup dialog for displaying magnified images on hover."""
    
    def __init__(self, pixmap: QPixmap, parent: Optional[QWidget] = None):
        """
        Initialize magnification popup.
        
        Args:
            pixmap: Pixmap to display
            parent: Parent widget
        """
        super().__init__(parent)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.Tool)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.label = QLabel(self)
        self.label.setPixmap(pixmap)
        self.label.setScaledContents(True)
        self.setStyleSheet("background: transparent;")
        self.resize(pixmap.width(), pixmap.height())
    
    def show_at(self, pos: QPoint):
        """
        Show popup at specific position.
        
        Args:
            pos: Position to show the popup
        """
        self.move(pos)
        self.show()


class MagnifyLabel(QLabel):
    """QLabel subclass that shows a magnified popup on hover."""
    
    def __init__(
        self,
        normal_pixmap: QPixmap,
        magnified_pixmap: QPixmap,
        parent_dialog: QDialog,
        *args,
        **kwargs
    ):
        """
        Initialize magnifying label.
        
        Args:
            normal_pixmap: Pixmap to display normally
            magnified_pixmap: Pixmap to show in popup
            parent_dialog: Parent dialog for popup
        """
        super().__init__(*args, **kwargs)
        self.setPixmap(normal_pixmap)
        self.setMouseTracking(True)
        self.magnify_popup = MagnifyPopup(magnified_pixmap, parent=parent_dialog)
        self._mouse_inside = False
    
    def enterEvent(self, event):
        """Handle mouse enter event."""
        self._mouse_inside = True
        event.accept()
    
    def leaveEvent(self, event):
        """Handle mouse leave event."""
        self._mouse_inside = False
        self.magnify_popup.hide()
        event.accept()
    
    def mouseMoveEvent(self, event):
        """Handle mouse move event to show/hide popup."""
        if self.pixmap() is not None:
            pixmap_rect = self.contentsRect().adjusted(0, 0, 0, 0)
            if pixmap_rect.contains(event.pos()):
                if not self.magnify_popup.isVisible():
                    cursor_pos = self.mapToGlobal(event.pos())
                    popup_x = cursor_pos.x() + 20
                    popup_y = cursor_pos.y() - self.magnify_popup.height() // 2
                    self.magnify_popup.show_at(QPoint(popup_x, popup_y))
            else:
                self.magnify_popup.hide()
        event.accept()


# ============================================================================
# EXPORT FUNCTIONALITY
# ============================================================================

def export_as_image(dialog: QDialog, content_widget: QWidget):
    """
    Export dialog content as PNG image.
    
    Args:
        dialog: Parent dialog for file dialog
        content_widget: Widget to render as image
    """
    file_path, _ = QFileDialog.getSaveFileName(
        dialog, "Export as Image", "box_counting_analysis.png", "PNG Images (*.png)"
    )
    if file_path:
        pixmap = content_widget.grab()
        pixmap.save(file_path, "PNG")
        QMessageBox.information(
            dialog, "Export Complete", f"Image exported to: {file_path}"
        )


def clean_box_count_html(html: str) -> str:
    """
    Clean box count HTML for PDF export.
    
    Removes numpy array representations and extra formatting.
    
    Args:
        html: Raw HTML string
        
    Returns:
        Cleaned HTML string
    """
    # Remove numpy array representations
    html = re.sub(r"np\.int64\([^)]*\)", "", html)
    # Remove image labels
    html = re.sub(r"<b>Image 1:</b>.*?</span>", "", html)
    html = re.sub(r"<b>Image 2:</b>.*?</span>", "", html)
    # Remove brackets and extra whitespace
    html = re.sub(r"\[|\]", "", html)
    html = re.sub(r"\s+", " ", html)
    return html.strip()


def build_pdf_html(
    header: QLabel,
    preprocessing_labels: dict,
    box_text: QLabel,
    box_img_pixmap1: Optional[QPixmap],
    box_img_pixmap2: Optional[QPixmap],
    fd_text: QLabel,
    loglog_label: QLabel,
    interp_label: QLabel,
    interp_text: QTextEdit
) -> str:
    """
    Build HTML content for PDF export.
    
    Args:
        header: Header label
        preprocessing_labels: Dictionary of preprocessing step labels
        box_text: Box count summary label
        box_img_pixmap1: Box overlay visualization for image 1
        box_img_pixmap2: Box overlay visualization for image 2
        fd_text: Fractal dimension results label
        loglog_label: Log-log plot label
        interp_label: Interpretation section label
        interp_text: Interpretation text content
        
    Returns:
        Complete HTML string for PDF
    """
    html = "<h1>Box Counting Comparison Analysis</h1>"
    html += header.text()
    
    # Step 1: Preprocessing (with images)
    html += "<h2>Step 1: Preprocessing</h2>"
    html += "<table border='1' cellpadding='4' cellspacing='0'>"
    html += "<tr><th></th><th>Image 1</th><th>Image 2</th></tr>"
    
    # Add preprocessing steps
    steps = [
        ('Original', 'img1_orig', 'img2_orig'),
        ('Grayscale', 'img1_gray', 'img2_gray'),
        ('Binarized', 'img1_bin', 'img2_bin'),
    ]
    
    for step_name, img1_key, img2_key in steps:
        img1_b64 = pixmap_to_base64(preprocessing_labels[img1_key].pixmap())
        img2_b64 = pixmap_to_base64(preprocessing_labels[img2_key].pixmap())
        html += f"<tr><td>{step_name}</td>"
        html += f"<td><img src='data:image/png;base64,{img1_b64}' width='80'></td>"
        html += f"<td><img src='data:image/png;base64,{img2_b64}' width='80'></td></tr>"
    
    html += "</table>"
    
    # Step 2: Box Counting
    html += "<h2>Step 2: Box Counting</h2>"
    html += clean_box_count_html(box_text.text())
    
    # Box counting visualizations
    if box_img_pixmap1 is not None:
        box_img_b64_1 = pixmap_to_base64(box_img_pixmap1)
        html += f"<div><b>Box Counting Image (Image 1):</b><br>"
        html += f"<img src='data:image/png;base64,{box_img_b64_1}' width='160'></div>"
    
    if box_img_pixmap2 is not None:
        box_img_b64_2 = pixmap_to_base64(box_img_pixmap2)
        html += f"<div><b>Box Counting Image (Image 2):</b><br>"
        html += f"<img src='data:image/png;base64,{box_img_b64_2}' width='160'></div>"
    
    # Step 3: Fractal Dimension Results
    html += "<h2>Step 3: Fractal Dimension Results</h2>"
    html += fd_text.text()
    
    # Step 4: Results and Comparison
    html += "<h2>Step 4: Results and Comparison</h2>"
    loglog_b64 = pixmap_to_base64(loglog_label.pixmap())
    html += f"<div><b>Log-Log Plot:</b><br>"
    html += f"<img src='data:image/png;base64,{loglog_b64}' width='240'></div>"
    
    # Interpretation
    html += interp_label.text()
    html += interp_text.toHtml()
    
    return html


def export_as_pdf(
    dialog: QDialog,
    header: QLabel,
    preprocessing_labels: dict,
    box_text: QLabel,
    box_img_pixmap1: Optional[QPixmap],
    box_img_pixmap2: Optional[QPixmap],
    fd_text: QLabel,
    loglog_label: QLabel,
    interp_label: QLabel,
    interp_text: QTextEdit
):
    """
    Export dialog content as PDF.
    
    Args:
        dialog: Parent dialog for file dialog
        header: Header label
        preprocessing_labels: Dictionary of preprocessing step labels
        box_text: Box count summary label
        box_img_pixmap1: Box overlay visualization for image 1
        box_img_pixmap2: Box overlay visualization for image 2
        fd_text: Fractal dimension results label
        loglog_label: Log-log plot label
        interp_label: Interpretation section label
        interp_text: Interpretation text content
    """
    file_path, _ = QFileDialog.getSaveFileName(
        dialog, "Export as PDF", "box_counting_analysis.pdf", "PDF Files (*.pdf)"
    )
    if file_path:
        printer = QPrinter(QPrinter.PrinterMode.HighResolution)
        printer.setOutputFormat(QPrinter.OutputFormat.PdfFormat)
        printer.setOutputFileName(file_path)
        
        doc = QTextDocument()
        html = build_pdf_html(
            header,
            preprocessing_labels,
            box_text,
            box_img_pixmap1,
            box_img_pixmap2,
            fd_text,
            loglog_label,
            interp_label,
            interp_text
        )
        doc.setHtml(html)
        doc.print(printer)
        
        QMessageBox.information(
            dialog, "Export Complete", f"PDF exported to: {file_path}"
        )


# ============================================================================
# MAIN DIALOG FUNCTION
# ============================================================================

def show_boxcount_comparison_dialog(
    parent: Optional[QWidget],
    img1: np.ndarray,
    img2: np.ndarray,
    np_to_pixmap: Callable
):
    """
    Display box counting comparison dialog for two images.
    
    Creates an interactive dialog that shows:
    1. Image preprocessing steps (grayscale, binarization)
    2. Box counting visualization with grid overlays
    3. Fractal dimension calculation and log-log plots
    4. Results interpretation
    5. Export functionality (PNG and PDF)
    
    Args:
        parent: Parent widget for the dialog
        img1: First image as numpy array
        img2: Second image as numpy array
        np_to_pixmap: Function to convert numpy array to QPixmap
    """
    # Create dialog
    dialog = QDialog(parent)
    dialog.setWindowTitle("Box Counting Comparison")
    dialog.setMinimumWidth(DIALOG_MIN_WIDTH)
    
    # Create scroll area
    scroll = QScrollArea()
    scroll.setWidgetResizable(True)
    content = QWidget()
    layout = QVBoxLayout(content)
    layout.setSpacing(8)
    layout.setContentsMargins(12, 12, 12, 12)
    
    # Header
    header = QLabel(
        "<h1 style='color:#2d4157;'>Box Counting Fractal Dimension Comparison</h1>"
        "<p>This tool compares the fractal dimension of two images using the "
        "box-counting method. The fractal dimension quantifies complexity and "
        "self-similarity in patterns.</p>"
    )
    header.setWordWrap(True)
    header.setStyleSheet(STYLE_HEADER)
    layout.addWidget(header)
    
    # ========================================================================
    # Step 1: Preprocessing
    # ========================================================================
    
    step1_box, step1_layout = create_step_box(
        "<h2 style='color:#2d4157;'>Step 1: Preprocessing</h2>",
        STYLE_STEP_BOX_1
    )
    
    # Preprocess images
    img1_gray, img1_bin, img1_gray_rgb, img1_bin_rgb = preprocess_image(img1)
    img2_gray, img2_bin, img2_gray_rgb, img2_bin_rgb = preprocess_image(img2)
    
    # Create preprocessing grid
    pre_hbox, preprocessing_labels = create_preprocessing_grid(
        img1, img1_gray_rgb, img1_bin_rgb,
        img2, img2_gray_rgb, img2_bin_rgb,
        np_to_pixmap
    )
    
    step1_layout.addWidget(pre_hbox)
    step1_layout.addStretch(1)
    layout.addWidget(step1_box, stretch=1)
    
    # ========================================================================
    # Step 2: Box Counting (with visualization)
    # ========================================================================
    
    step2_box, step2_layout = create_step_box(
        "<h2 style='color:#2d4157;'>Step 2: Box Counting</h2>",
        STYLE_STEP_BOX_2
    )
    
    # Calculate box counts
    counts1 = calculate_box_counts(img1_bin, BOX_SIZES)
    counts2 = calculate_box_counts(img2_bin, BOX_SIZES)
    
    # Create box overlay visualizations
    vis_hbox = QWidget()
    vis_layout = QGridLayout()
    vis_layout.setContentsMargins(0, 0, 0, 0)
    vis_layout.setSpacing(4)
    
    box_img_pixmap1 = create_box_overlay_visualization(
        img1_bin, BOX_SIZES, 'Image 1', COLOR_IMAGE1
    )
    box_img_pixmap2 = create_box_overlay_visualization(
        img2_bin, BOX_SIZES, 'Image 2', COLOR_IMAGE2
    )
    
    # Add visualizations to layout
    for idx, (pixmap, color, label) in enumerate([
        (box_img_pixmap1, COLOR_IMAGE1, 'Image 1'),
        (box_img_pixmap2, COLOR_IMAGE2, 'Image 2'),
    ]):
        img_label = QLabel()
        img_label.setPixmap(
            pixmap.scaled(
                BOX_OVERLAY_PLOT_SIZE[0],
                BOX_OVERLAY_PLOT_SIZE[1],
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation
            )
        )
        img_label.setToolTip(f"{label} with box overlays")
        vis_layout.addWidget(QLabel(f"<b style='color:{color};'>{label}</b>"), idx, 0)
        vis_layout.addWidget(img_label, idx, 1)
    
    vis_hbox.setLayout(vis_layout)
    step2_layout.addWidget(vis_hbox)
    
    # Show counts summary
    box_text = QLabel(
        f"<b>Box sizes:</b> {BOX_SIZES} &nbsp; | &nbsp; "
        f"<b>Image 1:</b> <span style='color:{COLOR_IMAGE1}'>{counts1}</span> &nbsp; "
        f"<b>Image 2:</b> <span style='color:{COLOR_IMAGE2}'>{counts2}</span>"
    )
    box_text.setStyleSheet(STYLE_WHITE_BOX)
    box_text.setToolTip("Box sizes and counts for each image")
    step2_layout.addWidget(box_text)
    layout.addWidget(step2_box, stretch=1)
    
    # ========================================================================
    # Step 3: Fractal Dimension Calculation
    # ========================================================================
    
    step3_box, step3_layout = create_step_box(
        "<h2 style='color:#2d4157;'>Step 3: Fractal Dimension Calculation</h2>",
        STYLE_STEP_BOX_3
    )
    
    # Calculate fractal dimensions
    fd1, log_sizes1, log_counts1 = calculate_fractal_dimension(BOX_SIZES, counts1)
    fd2, log_sizes2, log_counts2 = calculate_fractal_dimension(BOX_SIZES, counts2)
    
    # Mini log-log plot
    mini_plot_pixmap = create_loglog_plot(
        log_sizes1, log_counts1, log_sizes2, log_counts2,
        figsize=(2.5, 2.1),
        title="Log-Log Plot"
    )
    
    plot_label = QLabel()
    plot_label.setPixmap(
        mini_plot_pixmap.scaled(
            MINI_PLOT_SIZE[0],
            MINI_PLOT_SIZE[1],
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation
        )
    )
    plot_label.setToolTip("Log-log plot of box size vs box count for both images")
    
    # Show FDs and plot side by side
    fd_hbox = QWidget()
    fd_layout = QHBoxLayout()
    fd_layout.setContentsMargins(0, 0, 0, 0)
    fd_layout.setSpacing(8)
    
    fd_text = QLabel(
        f"<b>Image 1 FD:</b> <span style='color:{COLOR_IMAGE1};font-size:13pt;"
        f"font-weight:bold'>{fd1:.4f}</span><br>"
        f"<b>Image 2 FD:</b> <span style='color:{COLOR_IMAGE2};font-size:13pt;"
        f"font-weight:bold'>{fd2:.4f}</span>"
    )
    fd_text.setStyleSheet(
        "font-size:12pt; background:#fff; border-radius:6px; padding:8px; color:#223;"
    )
    fd_text.setToolTip("Estimated fractal dimension for each image")
    
    fd_layout.addWidget(fd_text)
    fd_layout.addWidget(plot_label)
    fd_hbox.setLayout(fd_layout)
    step3_layout.addWidget(fd_hbox)
    layout.addWidget(step3_box, stretch=1)
    
    # ========================================================================
    # Step 4: Results and Comparison
    # ========================================================================
    
    step4_box, step4_layout = create_step_box(
        "<h2 style='color:#2d4157;'>Step 4: Results and Comparison</h2>",
        STYLE_STEP_BOX_4
    )
    
    plot_title_label = QLabel("Log-Log Plot (Box Size vs Box Count):")
    plot_title_label.setStyleSheet(
        "font-size:12pt;font-weight:bold;margin-bottom:4px;color:#2d4157;"
    )
    step4_layout.addWidget(plot_title_label)
    
    # Full log-log plot with magnification
    full_loglog_pixmap = create_loglog_plot(
        log_sizes1, log_counts1, log_sizes2, log_counts2,
        figsize=(4, 3),
        title="Box Counting Log-Log Plot"
    )
    
    magnified_pixmap = full_loglog_pixmap.scaled(
        LOGLOG_PLOT_MAGNIFIED_SIZE[0],
        LOGLOG_PLOT_MAGNIFIED_SIZE[1],
        Qt.AspectRatioMode.KeepAspectRatio,
        Qt.TransformationMode.SmoothTransformation
    )
    
    normal_pixmap = full_loglog_pixmap.scaled(
        FULL_LOGLOG_PLOT_SIZE[0],
        FULL_LOGLOG_PLOT_SIZE[1],
        Qt.AspectRatioMode.KeepAspectRatio,
        Qt.TransformationMode.SmoothTransformation
    )
    
    loglog_label = MagnifyLabel(normal_pixmap, magnified_pixmap, dialog)
    loglog_label.setToolTip("Log-log plot of box size vs box count for both images")
    step4_layout.addWidget(loglog_label)
    step4_layout.addStretch(1)
    layout.addWidget(step4_box, stretch=1)
    
    # ========================================================================
    # Interpretation Section
    # ========================================================================
    
    interp_box = QWidget()
    interp_box.setStyleSheet(STYLE_INTERPRETATION_BOX)
    interp_layout = QVBoxLayout(interp_box)
    
    interp_label = QLabel("<h2 style='color:#2d4157;'>Interpretation of Results</h2>")
    interp_label.setWordWrap(True)
    interp_label.setStyleSheet("font-weight:bold; color:#2d4157;")
    interp_layout.addWidget(interp_label)
    
    interp_text = QTextEdit()
    interp_text.setReadOnly(True)
    interp_text.setHtml(
        f"""
<b>How to interpret the results:</b><br><br>
The <b>fractal dimension</b> (FD) quantifies the complexity or roughness of a pattern. 
Higher FD values indicate more complex, space-filling, or irregular structures.<br><br>
<b>Image 1 FD:</b> <span style='color:{COLOR_IMAGE1};font-size:13pt;font-weight:bold'>{fd1:.4f}</span><br>
<b>Image 2 FD:</b> <span style='color:{COLOR_IMAGE2};font-size:13pt;font-weight:bold'>{fd2:.4f}</span><br><br>
<ul>
    <li>If <b>Image 1 FD &gt; Image 2 FD</b>: Image 1 is more complex or has more fine structure than Image 2.</li>
    <li>If <b>Image 1 FD &lt; Image 2 FD</b>: Image 2 is more complex or has more fine structure than Image 1.</li>
    <li>If the FDs are similar: Both images have similar levels of complexity or texture.</li>
</ul>
<br>
<b>Note:</b> The box-counting method is sensitive to image quality, binarization, and scale. 
Use similar preprocessing for fair comparison.
        """
    )
    interp_text.setMinimumHeight(120)
    interp_text.setStyleSheet(STYLE_WHITE_BOX)
    interp_text.setToolTip("How to interpret the fractal dimension results")
    interp_layout.addWidget(interp_text)
    layout.addWidget(interp_box)
    
    # ========================================================================
    # Action Buttons
    # ========================================================================
    
    export_pdf_btn = QPushButton("Export as PDF")
    export_pdf_btn.setStyleSheet(STYLE_BTN_EXPORT_PDF)
    export_pdf_btn.clicked.connect(
        lambda: export_as_pdf(
            dialog,
            header,
            preprocessing_labels,
            box_text,
            box_img_pixmap1,
            box_img_pixmap2,
            fd_text,
            loglog_label,
            interp_label,
            interp_text
        )
    )
    
    export_img_btn = QPushButton("Export as Image")
    export_img_btn.setStyleSheet(STYLE_BTN_EXPORT_IMG)
    export_img_btn.clicked.connect(lambda: export_as_image(dialog, content))
    
    close_btn = QPushButton("Close")
    close_btn.setStyleSheet(STYLE_BTN_CLOSE)
    close_btn.clicked.connect(dialog.accept)
    
    # Add buttons
    btn_hbox = QHBoxLayout()
    btn_hbox.addWidget(export_pdf_btn)
    btn_hbox.addWidget(export_img_btn)
    btn_hbox.addWidget(close_btn)
    layout.addLayout(btn_hbox)
    
    # Finalize dialog
    scroll.setWidget(content)
    dlg_layout = QVBoxLayout(dialog)
    dlg_layout.addWidget(scroll)
    dialog.setLayout(dlg_layout)
    dialog.resize(*DIALOG_DEFAULT_SIZE)
    dialog.exec()
