import numpy as np
import cv2
from PyQt6.QtWidgets import (
    QDialog,
    QVBoxLayout,
    QLabel,
    QWidget,
    QTextEdit,
    QGridLayout,
    QScrollArea,
    QHBoxLayout,
    QPushButton,
    QFileDialog,
    QMessageBox,
)
from PyQt6.QtGui import QPixmap, QImage
from PyQt6.QtCore import Qt
import io
import matplotlib.pyplot as plt


def show_boxcount_comparison_dialog(parent, img1, img2, np_to_pixmap):
    from PyQt6.QtWidgets import QDialog, QLabel
    from PyQt6.QtCore import Qt, QEvent, QPoint
    def export_image():
        file_path, _ = QFileDialog.getSaveFileName(
            dialog, "Export as Image", "box_counting_analysis.png", "PNG Files (*.png)"
        )
        if file_path:
            # Render the content widget to a QPixmap
            pixmap = QPixmap(content.size())
            content.render(pixmap)
            pixmap.save(file_path, "PNG")
            QMessageBox.information(
                dialog, "Export Complete", f"Image exported to: {file_path}"
            )
    import base64
    from PyQt6.QtCore import QBuffer, QByteArray, QIODevice

    def pixmap_to_base64(pixmap):
        image = pixmap.toImage()
        ba = QByteArray()
        buffer = QBuffer(ba)
        buffer.open(QIODevice.OpenModeFlag.WriteOnly)
        image.save(buffer, "PNG")
        buffer.close()
        return base64.b64encode(ba.data()).decode("utf-8")

    """
    Show a dialog comparing two images step-by-step for box counting analysis.
    Args:
        parent: The parent QWidget (usually self from MainWindow).
        img1, img2: np.ndarray images (RGB).
        np_to_pixmap: function to convert np.ndarray to QPixmap.
    """
    dialog = QDialog(parent)
    dialog.setWindowTitle("🧮 Step-by-Step Box Counting Comparison")
    dialog.setMinimumWidth(900)
    scroll = QScrollArea(dialog)
    scroll.setWidgetResizable(True)
    content = QWidget()
    layout = QVBoxLayout(content)

    # Modern header (no instructions)
    header = QLabel(
        """
        <h1 style='color:#2d4157; margin-bottom:0;'>🧮 Box Counting Comparison</h1>
        <div style='font-size:13pt;color:#2d4157;margin-bottom:12px;'>Visual, stepwise analysis of two images</div>
        """
    )
    header.setAlignment(Qt.AlignmentFlag.AlignCenter)
    header.setStyleSheet(
        "background:#eaf3fa; border-radius:12px; padding:18px 0 8px 0; margin-bottom:8px; color:#2d4157;"
    )
    layout.addWidget(header)

    # Step 1: Preprocessing
    box_sizes = [32, 16, 8]
    img1_gray = cv2.cvtColor(img1, cv2.COLOR_RGB2GRAY)
    img2_gray = cv2.cvtColor(img2, cv2.COLOR_RGB2GRAY)
    _, img1_bin = cv2.threshold(img1_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    _, img2_bin = cv2.threshold(img2_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    step1_box = QWidget()
    step1_box.setStyleSheet(
        "background:#f6fafd; border-radius:10px; padding:0px 0px 0px 0px; margin-bottom:8px; color:#223;"
    )
    step1_layout = QVBoxLayout(step1_box)
    step1_layout.setContentsMargins(0, 0, 0, 0)
    step1_layout.setSpacing(4)
    step1_title = QLabel("<h2 style='color:#2d4157;'>Step 1: Preprocessing</h2>")
    step1_title.setAlignment(Qt.AlignmentFlag.AlignLeft)
    step1_title.setStyleSheet("font-weight:bold; color:#2d4157; margin-bottom:2px;")
    step1_layout.addWidget(step1_title)
    pre_hbox = QWidget()
    pre_layout = QGridLayout()
    pre_layout.setContentsMargins(0, 0, 0, 0)
    pre_layout.setSpacing(2)
    pre_layout.addWidget(QLabel(""), 0, 0)
    pre_layout.addWidget(QLabel("<b style='color:#1976d2;'>Image 1</b>"), 0, 1)
    pre_layout.addWidget(QLabel("<b style='color:#d32f2f;'>Image 2</b>"), 0, 2)
    pre_layout.addWidget(QLabel("Original"), 1, 0)
    pre_layout.addWidget(QLabel("Grayscale"), 2, 0)
    pre_layout.addWidget(QLabel("Binarized"), 3, 0)
    img1_orig_label = QLabel()
    img1_gray_label = QLabel()
    img1_bin_label = QLabel()
    img1_gray_rgb = cv2.cvtColor(np.copy(img1_gray), cv2.COLOR_GRAY2RGB)
    img1_bin_rgb = cv2.cvtColor(np.copy(img1_bin), cv2.COLOR_GRAY2RGB)
    img1_orig_label.setPixmap(
        np_to_pixmap(np.copy(img1)).scaled(
            120,
            120,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
    )
    img1_gray_label.setPixmap(
        np_to_pixmap(np.copy(img1_gray_rgb)).scaled(
            120,
            120,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
    )
    img1_bin_label.setPixmap(
        np_to_pixmap(np.copy(img1_bin_rgb)).scaled(
            120,
            120,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
    )
    img1_orig_label.setToolTip("Original Image 1")
    img1_gray_label.setToolTip("Grayscale Image 1")
    img1_bin_label.setToolTip("Binarized Image 1")
    pre_layout.addWidget(img1_orig_label, 1, 1)
    pre_layout.addWidget(img1_gray_label, 2, 1)
    pre_layout.addWidget(img1_bin_label, 3, 1)
    img2_orig_label = QLabel()
    img2_gray_label = QLabel()
    img2_bin_label = QLabel()
    img2_gray_rgb = cv2.cvtColor(np.copy(img2_gray), cv2.COLOR_GRAY2RGB)
    img2_bin_rgb = cv2.cvtColor(np.copy(img2_bin), cv2.COLOR_GRAY2RGB)
    img2_orig_label.setPixmap(
        np_to_pixmap(np.copy(img2)).scaled(
            120,
            120,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
    )
    img2_gray_label.setPixmap(
        np_to_pixmap(np.copy(img2_gray_rgb)).scaled(
            120,
            120,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
    )
    img2_bin_label.setPixmap(
        np_to_pixmap(np.copy(img2_bin_rgb)).scaled(
            120,
            120,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
    )
    img2_orig_label.setToolTip("Original Image 2")
    img2_gray_label.setToolTip("Grayscale Image 2")
    img2_bin_label.setToolTip("Binarized Image 2")
    pre_layout.addWidget(img2_orig_label, 1, 2)
    pre_layout.addWidget(img2_gray_label, 2, 2)
    pre_layout.addWidget(img2_bin_label, 3, 2)
    pre_hbox.setLayout(pre_layout)
    step1_layout.addWidget(pre_hbox)
    step1_layout.addStretch(1)
    layout.addWidget(step1_box, stretch=1)

    # Step 2: Box Counting (with visualization)
    step2_box = QWidget()
    step2_box.setStyleSheet(
        "background:#f9f6fa; border-radius:10px; padding:0px 0px 0px 0px; margin-bottom:8px; color:#223;"
    )
    step2_layout = QVBoxLayout(step2_box)
    step2_layout.setContentsMargins(0, 0, 0, 0)
    step2_layout.setSpacing(4)
    step2_title = QLabel("<h2 style='color:#2d4157;'>Step 2: Box Counting</h2>")
    step2_title.setAlignment(Qt.AlignmentFlag.AlignLeft)
    step2_title.setStyleSheet("font-weight:bold; color:#2d4157; margin-bottom:2px;")
    step2_layout.addWidget(step2_title)
    counts1 = []
    counts2 = []
    # Visualization: overlay grid on binarized images for each box size
    from matplotlib.backends.backend_agg import FigureCanvasAgg
    import matplotlib.patches as patches
    vis_hbox = QWidget()
    vis_layout = QGridLayout()
    vis_layout.setContentsMargins(0, 0, 0, 0)
    vis_layout.setSpacing(4)
    box_img_pixmap1 = None
    box_img_pixmap2 = None
    for idx, (img_bin, color, label) in enumerate(
        [
            (img1_bin, '#1976d2', 'Image 1'),
            (img2_bin, '#d32f2f', 'Image 2'),
        ]
    ):
        fig, axs = plt.subplots(1, len(box_sizes), figsize=(2.5 * len(box_sizes), 2.5))
        if len(box_sizes) == 1:
            axs = [axs]
        for j, size in enumerate(box_sizes):
            axs[j].imshow(img_bin, cmap='gray')
            axs[j].set_title(f'Box size: {size}')
            axs[j].axis('off')
            # Draw grid
            for x in range(0, img_bin.shape[0], size):
                axs[j].axhline(x - 0.5, color='lime', lw=0.7, alpha=0.7)
            for y in range(0, img_bin.shape[1], size):
                axs[j].axvline(y - 0.5, color='lime', lw=0.7, alpha=0.7)
        plt.tight_layout()
        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        qimg = QImage()
        qimg.loadFromData(buf.getvalue(), "PNG")
        pixmap = QPixmap.fromImage(qimg)
        img_label = QLabel()
        img_label.setPixmap(pixmap.scaled(340, 120, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))
        img_label.setToolTip(f"{label} with box overlays")
        vis_layout.addWidget(QLabel(f"<b style='color:{color};'>{label}</b>"), idx, 0)
        vis_layout.addWidget(img_label, idx, 1)
        if idx == 0:
            box_img_pixmap1 = pixmap
        elif idx == 1:
            box_img_pixmap2 = pixmap
    vis_hbox.setLayout(vis_layout)
    step2_layout.addWidget(vis_hbox)
    # Calculate box counts
    for size in box_sizes:
        c1 = sum(
            np.any(img1_bin[x: x + size, y: y + size])
            for x in range(0, img1_bin.shape[0], size)
            for y in range(0, img1_bin.shape[1], size)
        )
        c2 = sum(
            np.any(img2_bin[x: x + size, y: y + size])
            for x in range(0, img2_bin.shape[0], size)
            for y in range(0, img2_bin.shape[1], size)
        )
        counts1.append(c1)
        counts2.append(c2)
    # Show counts in a compact, user-friendly way
    box_text = QLabel(
        f"<b>Box sizes:</b> {box_sizes} &nbsp; | &nbsp; <b>Image 1:</b> <span style='color:#1976d2'>{counts1}</span> &nbsp; <b>Image 2:</b> <span style='color:#d32f2f'>{counts2}</span>"
    )
    box_text.setStyleSheet("font-size:11.5pt; background:#fff; border-radius:6px; padding:8px; color:#223;")
    box_text.setToolTip("Box sizes and counts for each image")
    step2_layout.addWidget(box_text)
    layout.addWidget(step2_box, stretch=1)

    # Step 3: Fractal Dimension Calculation (with mini log-log plot)
    step3_box = QWidget()
    step3_box.setStyleSheet(
        "background:#f6f9fa; border-radius:10px; padding:0px 0px 0px 0px; margin-bottom:8px; color:#223;"
    )
    step3_layout = QVBoxLayout(step3_box)
    step3_layout.setContentsMargins(0, 0, 0, 0)
    step3_layout.setSpacing(4)
    step3_title = QLabel(
        "<h2 style='color:#2d4157;'>Step 3: Fractal Dimension Calculation</h2>"
    )
    step3_title.setAlignment(Qt.AlignmentFlag.AlignLeft)
    step3_title.setStyleSheet("font-weight:bold; color:#2d4157; margin-bottom:2px;")
    step3_layout.addWidget(step3_title)
    log_sizes = np.log(1 / np.array(box_sizes))
    log_counts1 = np.log(counts1)
    log_counts2 = np.log(counts2)
    fd1, _ = np.polyfit(log_sizes, log_counts1, 1)
    fd2, _ = np.polyfit(log_sizes, log_counts2, 1)
    # Mini log-log plot visualization
    fig, ax = plt.subplots(figsize=(2.5, 2.1))
    ax.plot(log_sizes, log_counts1, "o-b", label="Image 1")
    ax.plot(log_sizes, log_counts2, "o-r", label="Image 2")
    ax.set_xlabel("log(1/ε)")
    ax.set_ylabel("log N(ε)")
    ax.set_title("Log-Log Plot")
    ax.legend(fontsize=8)
    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    qimg = QImage()
    qimg.loadFromData(buf.getvalue(), "PNG")
    pixmap = QPixmap.fromImage(qimg)
    plot_label = QLabel()
    plot_label.setPixmap(pixmap.scaled(180, 140, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))
    plot_label.setToolTip("Log-log plot of box size vs box count for both images")
    # Show FDs and plot side by side
    fd_hbox = QWidget()
    fd_layout = QHBoxLayout()
    fd_layout.setContentsMargins(0, 0, 0, 0)
    fd_layout.setSpacing(8)
    fd_text = QLabel(
        f"<b>Image 1 FD:</b> <span style='color:#1976d2;font-size:13pt;font-weight:bold'>{fd1:.4f}</span><br>"
        f"<b>Image 2 FD:</b> <span style='color:#d32f2f;font-size:13pt;font-weight:bold'>{fd2:.4f}</span>"
    )
    fd_text.setStyleSheet("font-size:12pt; background:#fff; border-radius:6px; padding:8px; color:#223;")
    fd_text.setToolTip("Estimated fractal dimension for each image")
    fd_layout.addWidget(fd_text)
    fd_layout.addWidget(plot_label)
    fd_hbox.setLayout(fd_layout)
    step3_layout.addWidget(fd_hbox)
    layout.addWidget(step3_box, stretch=1)

    # Step 4: Results and Comparison
    step4_box = QWidget()
    step4_box.setStyleSheet(
        "background:#f8f8fa; border-radius:10px; padding:0px 0px 0px 0px; margin-bottom:8px; color:#223;"
    )
    step4_layout = QVBoxLayout(step4_box)
    step4_layout.setContentsMargins(0, 0, 0, 0)
    step4_layout.setSpacing(4)
    step4_title = QLabel(
        "<h2 style='color:#2d4157;'>Step 4: Results and Comparison</h2>"
    )
    step4_title.setAlignment(Qt.AlignmentFlag.AlignLeft)
    step4_title.setStyleSheet("font-weight:bold; color:#2d4157; margin-bottom:2px;")
    step4_layout.addWidget(step4_title)
    plot_label = QLabel("Log-Log Plot (Box Size vs Box Count):")
    plot_label.setStyleSheet(
        "font-size:12pt;font-weight:bold;margin-bottom:4px;color:#2d4157;"
    )
    step4_layout.addWidget(plot_label)
    fig, ax = plt.subplots(figsize=(4, 3))
    ax.plot(log_sizes, log_counts1, "o-b", label="Image 1")
    ax.plot(log_sizes, log_counts2, "o-r", label="Image 2")
    ax.set_xlabel("log(1/ε)")
    ax.set_ylabel("log N(ε)")
    ax.set_title("Box Counting Log-Log Plot")
    ax.legend()
    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    plt.close(fig)
    buf.seek(0)
    loglog_img = QImage()
    loglog_img.loadFromData(buf.getvalue(), "PNG")
    loglog_pixmap = QPixmap.fromImage(loglog_img)
    loglog_label = QLabel()
    loglog_label.setPixmap(
        loglog_pixmap.scaled(
            300,
            240,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
    )
    loglog_label.setToolTip("Log-log plot of box size vs box count for both images")

    # --- Magnify on hover (fixed for PyQt6) ---
    class MagnifyPopup(QDialog):
        def __init__(self, pixmap, parent=None):
            super().__init__(parent)
            self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.Tool)
            self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
            self.label = QLabel(self)
            self.label.setPixmap(pixmap)
            self.label.setScaledContents(True)
            self.setStyleSheet("background: transparent;")
            self.resize(pixmap.width(), pixmap.height())
        def show_at(self, pos):
            self.move(pos)
            self.show()

    magnified_pixmap = loglog_pixmap.scaled(
        600, 480, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation
    )
    # Subclass QLabel for hover events
    class MagnifyLabel(QLabel):
        def __init__(self, normal_pixmap, magnified_pixmap, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.setPixmap(normal_pixmap)
            self.setMouseTracking(True)
            self.magnify_popup = MagnifyPopup(magnified_pixmap, parent=dialog)
            self._mouse_inside = False
        def enterEvent(self, event):
            self._mouse_inside = True
            event.accept()
        def leaveEvent(self, event):
            self._mouse_inside = False
            self.magnify_popup.hide()
            event.accept()
        def mouseMoveEvent(self, event):
            # Only show popup if mouse is over the actual chart area (pixmap, not just label)
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

    loglog_label = MagnifyLabel(
        loglog_pixmap.scaled(
            300,
            240,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        ),
        magnified_pixmap,
    )
    loglog_label.setToolTip("Log-log plot of box size vs box count for both images")
    step4_layout.addWidget(loglog_label)
    step4_layout.addStretch(1)
    layout.addWidget(step4_box, stretch=1)

    # --- Interpretation Section ---

    interp_box = QWidget()
    interp_box.setStyleSheet(
        "background:#f3f8f6; border-radius:10px; padding:12px 8px 8px 8px; margin-bottom:12px; color:#223;"
    )
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
The <b>fractal dimension</b> (FD) quantifies the complexity or roughness of a pattern. Higher FD values indicate more complex, space-filling, or irregular structures.<br><br>
<b>Image 1 FD:</b> <span style='color:#1976d2;font-size:13pt;font-weight:bold'>{fd1:.4f}</span><br>
<b>Image 2 FD:</b> <span style='color:#d32f2f;font-size:13pt;font-weight:bold'>{fd2:.4f}</span><br><br>
<ul>
    <li>If <b>Image 1 FD &gt; Image 2 FD</b>: Image 1 is more complex or has more fine structure than Image 2.</li>
    <li>If <b>Image 1 FD &lt; Image 2 FD</b>: Image 2 is more complex or has more fine structure than Image 1.</li>
    <li>If the FDs are similar: Both images have similar levels of complexity or texture.</li>
</ul>
<br>
<b>Note:</b> The box-counting method is sensitive to image quality, binarization, and scale. Use similar preprocessing for fair comparison.
    """
    )
    interp_text.setMinimumHeight(120)
    interp_text.setStyleSheet(
        "font-size:11.5pt; background:#fff; border-radius:6px; padding:8px; color:#223;"
    )
    interp_text.setToolTip("How to interpret the fractal dimension results")
    interp_layout.addWidget(interp_text)
    layout.addWidget(interp_box)

    # --- Close Button ---

    from PyQt6.QtPrintSupport import QPrinter
    from PyQt6.QtGui import QTextDocument

    def export_pdf():
        file_path, _ = QFileDialog.getSaveFileName(
            dialog, "Export as PDF", "box_counting_analysis.pdf", "PDF Files (*.pdf)"
        )
        if file_path:
            printer = QPrinter(QPrinter.PrinterMode.HighResolution)
            printer.setOutputFormat(QPrinter.OutputFormat.PdfFormat)
            printer.setOutputFileName(file_path)
            doc = QTextDocument()
            html = "<h1>Box Counting Comparison Analysis</h1>"
            html += header.text()
            # Step 1: Preprocessing (with images)
            html += "<h2>Step 1: Preprocessing</h2>"
            html += "<table border='1' cellpadding='4' cellspacing='0'><tr><th></th><th>Image 1</th><th>Image 2</th></tr>"
            # Original
            img1_orig_b64 = pixmap_to_base64(img1_orig_label.pixmap())
            img2_orig_b64 = pixmap_to_base64(img2_orig_label.pixmap())
            html += f"<tr><td>Original</td><td><img src='data:image/png;base64,{img1_orig_b64}' width='80'></td><td><img src='data:image/png;base64,{img2_orig_b64}' width='80'></td></tr>"
            # Grayscale
            img1_gray_b64 = pixmap_to_base64(img1_gray_label.pixmap())
            img2_gray_b64 = pixmap_to_base64(img2_gray_label.pixmap())
            html += f"<tr><td>Grayscale</td><td><img src='data:image/png;base64,{img1_gray_b64}' width='80'></td><td><img src='data:image/png;base64,{img2_gray_b64}' width='80'></td></tr>"
            # Binarized
            img1_bin_b64 = pixmap_to_base64(img1_bin_label.pixmap())
            img2_bin_b64 = pixmap_to_base64(img2_bin_label.pixmap())
            html += f"<tr><td>Binarized</td><td><img src='data:image/png;base64,{img1_bin_b64}' width='80'></td><td><img src='data:image/png;base64,{img2_bin_b64}' width='80'></td></tr>"
            html += "</table>"
            # Step 2: Box Counting
            html += "<h2>Step 2: Box Counting</h2>"
        # Only export styled box count summary, not raw numpy arrays
        import re
        box_html = box_text.text()
        # Remove any raw numpy array reprs (e.g., np.int64(...))
        box_html = re.sub(r"np\.int64\([^)]*\)", "", box_html)
        # Remove 'Image 1:' and 'Image 2:' labels
        box_html = re.sub(r"<b>Image 1:</b>.*?</span>", "", box_html)
        box_html = re.sub(r"<b>Image 2:</b>.*?</span>", "", box_html)
        # Remove any stray brackets or extra whitespace
        box_html = re.sub(r"\[|\]", "", box_html)
        box_html = re.sub(r"\s+", " ", box_html)
        html += box_html.strip()
        # Step 2: Box Counting Images (Image 1 and Image 2)
        if box_img_pixmap1 is not None:
            box_img_b64_1 = pixmap_to_base64(box_img_pixmap1)
            html += f"<div><b>Box Counting Image (Image 1):</b><br><img src='data:image/png;base64,{box_img_b64_1}' width='160'></div>"
        if box_img_pixmap2 is not None:
            box_img_b64_2 = pixmap_to_base64(box_img_pixmap2)
            html += f"<div><b>Box Counting Image (Image 2):</b><br><img src='data:image/png;base64,{box_img_b64_2}' width='160'></div>"
        # Step 3: Fractal Dimension Results
        html += "<h2>Step 3: Fractal Dimension Results</h2>"
        html += fd_text.text()
        # Step 4: Results and Comparison (include log-log plot)
        html += "<h2>Step 4: Results and Comparison</h2>"
        loglog_b64 = pixmap_to_base64(loglog_label.pixmap())
        html += f"<div><b>Log-Log Plot:</b><br><img src='data:image/png;base64,{loglog_b64}' width='240'></div>"
        # Interpretation
        html += interp_label.text()
        html += interp_text.toHtml()
        doc.setHtml(html)
        doc.print(printer)
        QMessageBox.information(
            dialog, "Export Complete", f"PDF exported to: {file_path}"
        )


    export_pdf_btn = QPushButton("Export as PDF")
    export_pdf_btn.setStyleSheet(
        "font-size:13pt; padding:8px 32px; border-radius:8px; background:#43aa8b; color:white; font-weight:bold; margin-top:12px; margin-right:12px;"
    )
    export_pdf_btn.clicked.connect(export_pdf)

    export_img_btn = QPushButton("Export as Image")
    export_img_btn.setStyleSheet(
        "font-size:13pt; padding:8px 32px; border-radius:8px; background:#f9c846; color:#222; font-weight:bold; margin-top:12px; margin-right:12px;"
    )
    export_img_btn.clicked.connect(export_image)

    close_btn = QPushButton("Close")
    close_btn.setStyleSheet(
        "font-size:13pt; padding:8px 32px; border-radius:8px; background:#1976d2; color:white; font-weight:bold; margin-top:12px;"
    )
    close_btn.clicked.connect(dialog.accept)

    # Add export and close buttons side by side
    btn_hbox = QHBoxLayout()
    btn_hbox.addWidget(export_pdf_btn)
    btn_hbox.addWidget(export_img_btn)
    btn_hbox.addWidget(close_btn)
    layout.addLayout(btn_hbox)

    scroll.setWidget(content)
    dlg_layout = QVBoxLayout(dialog)
    dlg_layout.addWidget(scroll)
    dialog.setLayout(dlg_layout)
    dialog.resize(900, 700)
    dialog.exec()
