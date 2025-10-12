from PyQt6.QtWidgets import QLabel, QMessageBox


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
        if not (
            self.offset_x <= x_click < self.offset_x + self.disp_w
            and self.offset_y <= y_click < self.offset_y + self.disp_h
        ):
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
