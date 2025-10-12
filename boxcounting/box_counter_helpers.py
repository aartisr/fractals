import cv2
from PyQt6.QtWidgets import QFileDialog, QMessageBox
from PyQt6.QtGui import QImage, QPixmap
import numpy as np
from boxcounting.box_counter_utils import BoxCounterUtils


class BoxCounterHelpers:
    """
    Utility class for box counter tab logic and helpers.
    """

    @staticmethod
    def select_image(parent):
        from PIL import Image

        fname, _ = QFileDialog.getOpenFileName(
            parent,
            "Select Image",
            "",
            "Images (*.png *.jpg *.jpeg *.bmp *.tif *.tiff *.gif)",
        )
        if not fname:
            return None
        img = cv2.imread(fname, cv2.IMREAD_GRAYSCALE)
        if img is None:
            # Try loading GIF with PIL
            try:
                pil_img = Image.open(fname)
                pil_img = pil_img.convert("L")  # Convert to grayscale
                img = np.array(pil_img)
            except Exception as e:
                QMessageBox.warning(
                    parent, "Box Counter", f"Failed to load image.\n{e}"
                )
                return None
        return img, fname

    @staticmethod
    def apply_roi_size(parent, roi_text):
        try:
            roi_size = int(roi_text)
            if roi_size <= 0:
                raise ValueError
        except ValueError:
            QMessageBox.warning(
                parent, "Box Counter", "ROI size must be a positive integer."
            )
            return None
        return roi_size

    @staticmethod
    def update_display(parent):
        if parent.bc_image is None:
            parent.bc_image_label.setText("No image")
            return
        disp = cv2.cvtColor(parent.bc_image, cv2.COLOR_GRAY2BGR)
        if parent.bc_point and parent.bc_roi_size:
            x, y = parent.bc_point
            cv2.rectangle(
                disp,
                (x, y),
                (x + parent.bc_roi_size, y + parent.bc_roi_size),
                (255, 255, 255),
                2,
            )
            if parent.bc_last_fd is not None:
                cv2.putText(
                    disp,
                    f"D={parent.bc_last_fd}",
                    (x + parent.bc_roi_size + 5, y + 20),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (255, 255, 255),
                    2,
                )
                cv2.putText(
                    disp,
                    f"{parent.bc_roi_size}x{parent.bc_roi_size} t={parent.bc_last_time}s",
                    (x + parent.bc_roi_size + 5, y + 45),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 255, 255),
                    1,
                )
        h, w = disp.shape[:2]
        qimg = QImage(disp.data, w, h, 3 * w, QImage.Format.Format_BGR888)
        pix = QPixmap.fromImage(qimg)
        target_size = parent.bc_image_label.size()
        from PyQt6.QtCore import Qt

        scaled = pix.scaled(
            target_size,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
        parent.bc_image_label.setPixmap(scaled)
        parent.bc_image_label.orig_w = w
        parent.bc_image_label.orig_h = h
        parent.bc_image_label.disp_w = scaled.width()
        parent.bc_image_label.disp_h = scaled.height()
        parent.bc_image_label.offset_x = (target_size.width() - scaled.width()) // 2
        parent.bc_image_label.offset_y = (target_size.height() - scaled.height()) // 2

    @staticmethod
    def compute_roi(parent, x, y):
        if parent.bc_image is None or not parent.bc_roi_size:
            return
        roi = parent.bc_image[y: y + parent.bc_roi_size, x: x + parent.bc_roi_size]
        if roi.shape[0] != parent.bc_roi_size or roi.shape[1] != parent.bc_roi_size:
            parent.bc_status.setText("ROI out of bounds.")
            return
        try:
            fd, tsec = BoxCounterUtils.fractal_dim(roi)
            parent.bc_last_fd = fd
            parent.bc_last_time = tsec
            parent.bc_status.setText(f"ROI ({x},{y}) D={fd} t={tsec}s")
        except Exception as e:
            parent.bc_status.setText(f"Error: {e}")
            parent.bc_last_fd = None
            parent.bc_last_time = None
        parent.bc_point = (x, y)
        BoxCounterHelpers.update_display(parent)
