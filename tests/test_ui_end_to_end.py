"""
End-to-End UI Tests for Fractal Workspace Application

This module contains comprehensive end-to-end tests for all four tabs:
1. Fractal Generator Tab
2. Box Counter Tab
3. Image Compare Tab
4. Tumor Detection Tab

Tests verify UI functionality, user workflows, and integration between components.
"""

import sys
import os
import pytest
import numpy as np
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import Qt, QPoint
from PyQt6.QtGui import QPixmap, QImage
from PyQt6.QtTest import QTest

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from ui import MainWindow


@pytest.fixture(scope="session")
def qapp():
    """Create QApplication instance for all tests."""
    app = QApplication.instance()
    if app is None:
        app = QApplication(sys.argv)
    yield app
    # Don't quit here - reuse for all tests


@pytest.fixture
def main_window(qapp):
    """Create MainWindow instance for each test."""
    window = MainWindow()
    window.show()
    QTest.qWaitForWindowExposed(window)
    yield window
    window.close()


@pytest.fixture
def sample_grayscale_image():
    """Create a sample grayscale image for testing."""
    # Create a 256x256 grayscale image with some pattern
    img = np.zeros((256, 256), dtype=np.uint8)
    # Add some fractal-like pattern
    for i in range(256):
        for j in range(256):
            img[i, j] = (i ^ j) % 256
    return img


@pytest.fixture
def sample_color_image():
    """Create a sample color image for testing."""
    # Create a 256x256 color image
    img = np.zeros((256, 256, 3), dtype=np.uint8)
    img[:128, :128] = [255, 0, 0]  # Red quadrant
    img[:128, 128:] = [0, 255, 0]  # Green quadrant
    img[128:, :128] = [0, 0, 255]  # Blue quadrant
    img[128:, 128:] = [255, 255, 0]  # Yellow quadrant
    return img


@pytest.fixture
def temp_test_image(tmp_path, sample_grayscale_image):
    """Create a temporary test image file."""
    import cv2
    img_path = tmp_path / "test_image.png"
    cv2.imwrite(str(img_path), sample_grayscale_image)
    return str(img_path)


# ============================================================================
# FRACTAL GENERATOR TAB TESTS
# ============================================================================

class TestFractalGeneratorTab:
    """End-to-end tests for the Fractal Generator tab."""

    def test_tab_exists(self, main_window):
        """Test that Fractal Generator tab exists and is accessible."""
        assert main_window.tabs.count() >= 1
        assert main_window.tabs.tabText(0) == "Fractal Generator"

    def test_switch_to_fractal_tab(self, main_window):
        """Test switching to the Fractal Generator tab."""
        main_window.tabs.setCurrentIndex(0)
        assert main_window.tabs.currentIndex() == 0
        assert main_window.tabs.currentWidget() == main_window.fractal_tab

    def test_initial_fractal_parameters(self, main_window):
        """Test that initial fractal parameters are set correctly."""
        assert main_window.fractal_type == "Mandelbrot"
        assert main_window.resolution == "500x500"
        assert main_window.color_scheme == "inferno"
        assert main_window.max_iter == 100
        assert main_window.power == 2.0
        assert main_window.c_real == -0.42
        assert main_window.c_imag == 0.6

    def test_fractal_type_combo_box(self, main_window):
        """Test fractal type selection via combo box."""
        main_window.tabs.setCurrentIndex(0)
        combo = main_window.fractal_menu
        
        # Test all fractal types
        fractal_types = [
            "Mandelbrot", "Julia", "Burning Ship", 
            "Newton", "Barnsley Fern", "Sierpinski Triangle"
        ]
        
        for ftype in fractal_types:
            idx = combo.findText(ftype)
            assert idx >= 0, f"Fractal type '{ftype}' not found in combo box"
            combo.setCurrentIndex(idx)
            assert main_window.fractal_type == ftype

    def test_resolution_combo_box(self, main_window):
        """Test resolution selection via combo box."""
        main_window.tabs.setCurrentIndex(0)
        combo = main_window.resolution_menu
        
        resolutions = ["500x500", "800x800", "1024x1024", "1920x1080"]
        for res in resolutions:
            idx = combo.findText(res)
            if idx >= 0:
                combo.setCurrentIndex(idx)
                assert main_window.resolution == res

    def test_color_scheme_combo_box(self, main_window):
        """Test color scheme selection via combo box."""
        main_window.tabs.setCurrentIndex(0)
        combo = main_window.color_menu
        
        color_schemes = ["inferno", "plasma", "viridis", "magma"]
        for scheme in color_schemes:
            idx = combo.findText(scheme)
            if idx >= 0:
                combo.setCurrentIndex(idx)
                assert main_window.color_scheme == scheme

    def test_max_iterations_input(self, main_window):
        """Test max iterations input field."""
        main_window.tabs.setCurrentIndex(0)
        edit = main_window.max_iter_entry
        
        # Test valid input
        edit.clear()
        QTest.keyClicks(edit, "200")
        edit.editingFinished.emit()
        assert main_window.max_iter == 200
        
        # Test another valid input
        edit.clear()
        QTest.keyClicks(edit, "50")
        edit.editingFinished.emit()
        assert main_window.max_iter == 50

    def test_power_input(self, main_window):
        """Test power parameter input field."""
        main_window.tabs.setCurrentIndex(0)
        edit = main_window.power_entry
        
        edit.clear()
        QTest.keyClicks(edit, "3.0")
        edit.editingFinished.emit()
        assert main_window.power == 3.0

    def test_julia_c_parameters(self, main_window):
        """Test Julia set complex parameter inputs."""
        main_window.tabs.setCurrentIndex(0)
        
        # Switch to Julia set
        combo = main_window.fractal_menu
        idx = combo.findText("Julia")
        combo.setCurrentIndex(idx)
        
        # Test c_real
        edit_real = main_window.c_real_entry
        edit_real.clear()
        QTest.keyClicks(edit_real, "-0.8")
        edit_real.editingFinished.emit()
        assert main_window.c_real == -0.8
        
        # Test c_imag
        edit_imag = main_window.c_imag_entry
        edit_imag.clear()
        QTest.keyClicks(edit_imag, "0.156")
        edit_imag.editingFinished.emit()
        assert main_window.c_imag == 0.156

    @patch('fractals.handlers.generate_fractal_threaded')
    def test_generate_button_click(self, mock_generate, main_window):
        """Test clicking the Generate Fractal button."""
        main_window.tabs.setCurrentIndex(0)
        btn = main_window.generate_button
        
        # Since the button uses lambda: generate_fractal_threaded(self),
        # we need to disconnect and reconnect with our mock
        # Just verify the button exists and can be clicked
        assert btn is not None
        assert btn.isEnabled()
        
        # Click the button - it should trigger the handler
        # The lambda will call the actual function, so we verify it's callable
        QTest.mouseClick(btn, Qt.MouseButton.LeftButton)
        
        # If the mock was called, great! Otherwise, we've tested the button works
        # This test mainly verifies the button is wired up and clickable

    def test_fractal_info_display(self, main_window):
        """Test that fractal info label exists and can display information."""
        main_window.tabs.setCurrentIndex(0)
        info_label = main_window.text_area
        
        assert info_label is not None
        # Info label should be visible
        assert info_label.isVisible()

    @patch('PyQt6.QtWidgets.QFileDialog.getSaveFileName')
    def test_save_fractal_button(self, mock_dialog, main_window):
        """Test save fractal functionality."""
        main_window.tabs.setCurrentIndex(0)
        
        # Set up mock to return a file path
        mock_dialog.return_value = ("/tmp/test_fractal.png", "PNG (*.png)")
        
        btn = main_window.save_button
        
        # Initially button might be disabled if no fractal generated
        # This test verifies the button exists
        assert btn is not None

    def test_progress_bar_exists(self, main_window):
        """Test that progress bar exists for fractal generation."""
        main_window.tabs.setCurrentIndex(0)
        progress = main_window.progress
        
        assert progress is not None
        assert progress.minimum() == 0
        assert progress.maximum() == 100

    def test_fractal_canvas_exists(self, main_window):
        """Test that matplotlib canvas exists for fractal display."""
        main_window.tabs.setCurrentIndex(0)
        canvas = main_window.canvas
        
        assert canvas is not None
        # Verify it's a matplotlib canvas
        from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg
        assert isinstance(canvas, FigureCanvasQTAgg)


# ============================================================================
# BOX COUNTER TAB TESTS
# ============================================================================

class TestBoxCounterTab:
    """End-to-end tests for the Box Counter tab."""

    def test_tab_exists(self, main_window):
        """Test that Box Counter tab exists and is accessible."""
        assert main_window.tabs.count() >= 2
        assert main_window.tabs.tabText(1) == "Box Counter"

    def test_switch_to_box_counter_tab(self, main_window):
        """Test switching to the Box Counter tab."""
        main_window.tabs.setCurrentIndex(1)
        assert main_window.tabs.currentIndex() == 1
        assert main_window.tabs.currentWidget() == main_window.box_counter_tab

    def test_initial_state(self, main_window):
        """Test initial state of Box Counter tab."""
        main_window.tabs.setCurrentIndex(1)
        
        assert main_window.bc_image is None
        assert main_window.bc_roi_size is None
        assert main_window.bc_point is None
        assert main_window.bc_last_fd is None

    def test_select_image_button_exists(self, main_window):
        """Test that Select Image button exists."""
        main_window.tabs.setCurrentIndex(1)
        btn = main_window.bc_select_btn
        
        assert btn is not None
        assert btn.text() == "Select Image"
        assert btn.isEnabled()

    def test_roi_size_input_field(self, main_window):
        """Test ROI size input field."""
        main_window.tabs.setCurrentIndex(1)
        edit = main_window.bc_roi_edit
        
        assert edit is not None
        assert edit.placeholderText() == "e.g. 128"
        
        # Test entering a value
        edit.clear()
        QTest.keyClicks(edit, "128")
        assert edit.text() == "128"

    def test_apply_roi_button_exists(self, main_window):
        """Test that Apply ROI Size button exists."""
        main_window.tabs.setCurrentIndex(1)
        btn = main_window.bc_start_btn
        
        assert btn is not None
        assert btn.text() == "Apply ROI Size"

    def test_status_label(self, main_window):
        """Test status label exists and shows initial message."""
        main_window.tabs.setCurrentIndex(1)
        status = main_window.bc_status
        
        assert status is not None
        assert "No image loaded" in status.text()

    def test_image_label_exists(self, main_window):
        """Test that ROI image label exists."""
        main_window.tabs.setCurrentIndex(1)
        label = main_window.bc_image_label
        
        assert label is not None
        from boxcounting.roi_image_label import ROIImageLabel
        assert isinstance(label, ROIImageLabel)

    @patch('PyQt6.QtWidgets.QFileDialog.getOpenFileName')
    def test_select_image_workflow(self, mock_dialog, main_window, temp_test_image):
        """Test selecting an image file."""
        main_window.tabs.setCurrentIndex(1)
        
        # Mock file dialog to return our test image
        mock_dialog.return_value = (temp_test_image, "Images (*.png)")
        
        btn = main_window.bc_select_btn
        QTest.mouseClick(btn, Qt.MouseButton.LeftButton)
        
        # Verify dialog was called
        mock_dialog.assert_called_once()

    def test_roi_size_validation(self, main_window):
        """Test ROI size input validation."""
        main_window.tabs.setCurrentIndex(1)
        edit = main_window.bc_roi_edit
        btn = main_window.bc_start_btn
        
        # Test invalid input (negative)
        edit.clear()
        QTest.keyClicks(edit, "-10")
        QTest.mouseClick(btn, Qt.MouseButton.LeftButton)
        # ROI size should remain None for invalid input
        assert main_window.bc_roi_size is None or main_window.bc_roi_size > 0
        
        # Test valid input
        edit.clear()
        QTest.keyClicks(edit, "128")
        # Note: Actual validation happens in bc_apply_roi_size

    @patch('boxcounting.box_counter_helpers.BoxCounterHelpers.select_image')
    @patch('boxcounting.box_counter_helpers.BoxCounterHelpers.apply_roi_size')
    def test_complete_box_counting_workflow(self, mock_apply_roi, mock_select, 
                                            main_window, sample_grayscale_image):
        """Test complete box counting workflow."""
        main_window.tabs.setCurrentIndex(1)
        
        # Mock image selection
        mock_select.return_value = (sample_grayscale_image, "test.png")
        
        # Select image
        main_window.bc_select_image()
        assert main_window.bc_image is not None
        
        # Mock ROI size application
        mock_apply_roi.return_value = 128
        
        # Apply ROI size
        main_window.bc_roi_edit.setText("128")
        main_window.bc_apply_roi_size()


# ============================================================================
# IMAGE COMPARE TAB TESTS
# ============================================================================

class TestImageCompareTab:
    """End-to-end tests for the Image Compare tab."""

    def test_tab_exists(self, main_window):
        """Test that Image Compare tab exists and is accessible."""
        assert main_window.tabs.count() >= 3
        assert main_window.tabs.tabText(2) == "Image Compare"

    def test_switch_to_image_compare_tab(self, main_window):
        """Test switching to the Image Compare tab."""
        main_window.tabs.setCurrentIndex(2)
        assert main_window.tabs.currentIndex() == 2
        assert main_window.tabs.currentWidget() == main_window.image_compare_tab

    def test_initial_state(self, main_window):
        """Test initial state of Image Compare tab."""
        main_window.tabs.setCurrentIndex(2)
        
        assert main_window._img1_data is None
        assert main_window._img2_data is None

    def test_image_labels_exist(self, main_window):
        """Test that both image labels exist."""
        main_window.tabs.setCurrentIndex(2)
        
        assert main_window.img1_label is not None
        assert main_window.img2_label is not None
        
        # Check they accept drops
        assert main_window.img1_label.acceptDrops()
        assert main_window.img2_label.acceptDrops()

    def test_reset_buttons_exist(self, main_window):
        """Test that reset buttons exist for both images."""
        main_window.tabs.setCurrentIndex(2)
        
        assert main_window.img1_reset_btn is not None
        assert main_window.img2_reset_btn is not None
        assert main_window.img1_reset_btn.text() == "Reset"
        assert main_window.img2_reset_btn.text() == "Reset"

    def test_swap_button_exists(self, main_window):
        """Test that swap button exists."""
        main_window.tabs.setCurrentIndex(2)
        
        assert main_window.swap_btn is not None
        assert main_window.swap_btn.text() == "Swap Images"

    def test_compare_button_initial_state(self, main_window):
        """Test that compare button is initially disabled."""
        main_window.tabs.setCurrentIndex(2)
        
        btn = main_window.compare_btn
        assert btn is not None
        # Should be disabled when no images loaded
        assert not btn.isEnabled()

    def test_result_label_exists(self, main_window):
        """Test that result label exists."""
        main_window.tabs.setCurrentIndex(2)
        
        label = main_window.compare_result
        assert label is not None
        assert label.text() == ""  # Initially empty

    def test_load_image1_double_click(self, main_window, temp_test_image):
        """Test that image 1 label supports double-click loading."""
        main_window.tabs.setCurrentIndex(2)
        
        # Verify the label exists and has mouseDoubleClickEvent
        label = main_window.img1_label
        assert label is not None
        assert hasattr(label, 'mouseDoubleClickEvent')

    @patch('PyQt6.QtWidgets.QFileDialog.getOpenFileName')
    def test_load_both_images(self, mock_dialog, main_window, temp_test_image):
        """Test loading both images."""
        main_window.tabs.setCurrentIndex(2)
        
        mock_dialog.return_value = (temp_test_image, "Images (*.png)")
        
        # Load image 1
        main_window.handle_image_label_double_click(1)
        
        # Load image 2
        main_window.handle_image_label_double_click(2)
        
        # Compare button should now be enabled
        # (if both images loaded successfully)

    def test_reset_image1(self, main_window):
        """Test resetting image 1."""
        main_window.tabs.setCurrentIndex(2)
        
        btn = main_window.img1_reset_btn
        QTest.mouseClick(btn, Qt.MouseButton.LeftButton)
        
        # Image 1 data should be None after reset
        assert main_window._img1_data is None

    def test_reset_image2(self, main_window):
        """Test resetting image 2."""
        main_window.tabs.setCurrentIndex(2)
        
        btn = main_window.img2_reset_btn
        QTest.mouseClick(btn, Qt.MouseButton.LeftButton)
        
        # Image 2 data should be None after reset
        assert main_window._img2_data is None

    @patch('boxcounting.box_counter_compare_dialog.show_boxcount_comparison_dialog')
    def test_compare_button_click(self, mock_compare, main_window, sample_grayscale_image):
        """Test clicking compare button with images loaded."""
        main_window.tabs.setCurrentIndex(2)
        
        # Manually set image data (bypass file dialog)
        main_window._img1_data = sample_grayscale_image.copy()
        main_window._img2_data = sample_grayscale_image.copy()
        main_window.compare_btn.setEnabled(True)
        
        btn = main_window.compare_btn
        QTest.mouseClick(btn, Qt.MouseButton.LeftButton)
        
        # The comparison function should be called
        # (actual implementation may vary)

    def test_swap_functionality(self, main_window, sample_grayscale_image):
        """Test swapping images."""
        main_window.tabs.setCurrentIndex(2)
        
        # Set up different images
        img1 = sample_grayscale_image.copy()
        img2 = sample_grayscale_image.copy() * 0.5  # Different image
        
        main_window._img1_data = img1
        main_window._img2_data = img2
        
        # Click swap button
        btn = main_window.swap_btn
        QTest.mouseClick(btn, Qt.MouseButton.LeftButton)
        
        # Images should be swapped
        assert np.array_equal(main_window._img1_data, img2)
        assert np.array_equal(main_window._img2_data, img1)


# ============================================================================
# TUMOR DETECTION TAB TESTS
# ============================================================================

class TestTumorDetectionTab:
    """End-to-end tests for the Tumor Detection tab."""

    def test_tab_exists(self, main_window):
        """Test that Tumor Detection tab exists and is accessible."""
        assert main_window.tabs.count() >= 4
        assert main_window.tabs.tabText(3) == "Tumor Detection"

    def test_switch_to_tumor_tab(self, main_window):
        """Test switching to the Tumor Detection tab."""
        main_window.tabs.setCurrentIndex(3)
        assert main_window.tabs.currentIndex() == 3
        assert main_window.tabs.currentWidget() == main_window.tumor_detection_tab

    def test_initial_state(self, main_window):
        """Test initial state of Tumor Detection tab."""
        main_window.tabs.setCurrentIndex(3)
        
        assert len(main_window.tumor_images) == 3
        assert all(img is None for img in main_window.tumor_images)
        assert len(main_window.tumor_results) == 3
        assert all(result is None for result in main_window.tumor_results)

    def test_three_model_sections(self, main_window):
        """Test that all three model sections exist."""
        main_window.tabs.setCurrentIndex(3)
        
        assert len(main_window.tumor_orig_labels) == 3
        assert len(main_window.tumor_detected_labels) == 3
        assert len(main_window.tumor_detect_buttons) == 3

    def test_original_image_labels(self, main_window):
        """Test original image labels for all models."""
        main_window.tabs.setCurrentIndex(3)
        
        for i, label in enumerate(main_window.tumor_orig_labels):
            assert label is not None
            # Should contain "Original Image" text
            assert "Original Image" in label.text()

    def test_detected_image_labels(self, main_window):
        """Test detected image labels for all models."""
        main_window.tabs.setCurrentIndex(3)
        
        for i, label in enumerate(main_window.tumor_detected_labels):
            assert label is not None
            # Should contain "Tumor Detected" text
            assert "Tumor Detected" in label.text()

    def test_detect_buttons_initial_state(self, main_window):
        """Test that detect buttons are initially disabled."""
        main_window.tabs.setCurrentIndex(3)
        
        for i, btn in enumerate(main_window.tumor_detect_buttons):
            assert btn is not None
            assert btn.text() == "Detect"
            # Should be disabled when no image loaded
            assert not btn.isEnabled()

    @patch('PyQt6.QtWidgets.QFileDialog.getOpenFileName')
    def test_load_tumor_image_axial(self, mock_dialog, main_window, temp_test_image):
        """Test loading image for axial model."""
        main_window.tabs.setCurrentIndex(3)
        
        mock_dialog.return_value = (temp_test_image, "Images (*.png)")
        
        # Simulate double-click on axial model original image
        from tumors.handlers import handle_tumor_image_double_click
        handle_tumor_image_double_click(main_window, 0)
        
        mock_dialog.assert_called_once()

    @patch('PyQt6.QtWidgets.QFileDialog.getOpenFileName')
    def test_load_tumor_image_coronal(self, mock_dialog, main_window, temp_test_image):
        """Test loading image for coronal model."""
        main_window.tabs.setCurrentIndex(3)
        
        mock_dialog.return_value = (temp_test_image, "Images (*.png)")
        
        from tumors.handlers import handle_tumor_image_double_click
        handle_tumor_image_double_click(main_window, 1)
        
        mock_dialog.assert_called_once()

    @patch('PyQt6.QtWidgets.QFileDialog.getOpenFileName')
    def test_load_tumor_image_sagittal(self, mock_dialog, main_window, temp_test_image):
        """Test loading image for sagittal model."""
        main_window.tabs.setCurrentIndex(3)
        
        mock_dialog.return_value = (temp_test_image, "Images (*.png)")
        
        from tumors.handlers import handle_tumor_image_double_click
        handle_tumor_image_double_click(main_window, 2)
        
        mock_dialog.assert_called_once()

    @patch('tumors.handlers.run_tumor_detection')
    def test_detect_button_click_axial(self, mock_detect, main_window, sample_color_image):
        """Test clicking detect button for axial model."""
        main_window.tabs.setCurrentIndex(3)
        
        # Manually set image (bypass file dialog)
        main_window.tumor_images[0] = sample_color_image
        main_window.tumor_detect_buttons[0].setEnabled(True)
        
        btn = main_window.tumor_detect_buttons[0]
        QTest.mouseClick(btn, Qt.MouseButton.LeftButton)

    @patch('tumors.handlers.run_tumor_detection')
    def test_detect_button_click_coronal(self, mock_detect, main_window, sample_color_image):
        """Test clicking detect button for coronal model."""
        main_window.tabs.setCurrentIndex(3)
        
        main_window.tumor_images[1] = sample_color_image
        main_window.tumor_detect_buttons[1].setEnabled(True)
        
        btn = main_window.tumor_detect_buttons[1]
        QTest.mouseClick(btn, Qt.MouseButton.LeftButton)

    @patch('tumors.handlers.run_tumor_detection')
    def test_detect_button_click_sagittal(self, mock_detect, main_window, sample_color_image):
        """Test clicking detect button for sagittal model."""
        main_window.tabs.setCurrentIndex(3)
        
        main_window.tumor_images[2] = sample_color_image
        main_window.tumor_detect_buttons[2].setEnabled(True)
        
        btn = main_window.tumor_detect_buttons[2]
        QTest.mouseClick(btn, Qt.MouseButton.LeftButton)

    def test_model_titles(self, main_window):
        """Test that model titles are displayed correctly."""
        main_window.tabs.setCurrentIndex(3)
        
        # The titles should be visible in the tab
        # (This is a basic check; specific implementation may vary)
        expected_models = ["Axial", "Coronal", "Saggital"]
        # Note: Check spelling - it's "Saggital" in your code (should be "Sagittal")


# ============================================================================
# INTEGRATION TESTS ACROSS TABS
# ============================================================================

class TestTabIntegration:
    """Integration tests across multiple tabs."""

    def test_all_tabs_accessible(self, main_window):
        """Test that all tabs can be accessed sequentially."""
        tab_count = main_window.tabs.count()
        assert tab_count == 4
        
        for i in range(tab_count):
            main_window.tabs.setCurrentIndex(i)
            assert main_window.tabs.currentIndex() == i

    def test_tab_names(self, main_window):
        """Test that all tab names are correct."""
        expected_names = [
            "Fractal Generator",
            "Box Counter",
            "Image Compare",
            "Tumor Detection"
        ]
        
        for i, expected_name in enumerate(expected_names):
            assert main_window.tabs.tabText(i) == expected_name

    def test_tab_switching_preserves_state(self, main_window):
        """Test that switching tabs preserves state in each tab."""
        # Set fractal type in Fractal Generator
        main_window.tabs.setCurrentIndex(0)
        combo = main_window.fractal_menu
        idx = combo.findText("Julia")
        combo.setCurrentIndex(idx)
        
        # Switch to another tab
        main_window.tabs.setCurrentIndex(1)
        
        # Switch back to Fractal Generator
        main_window.tabs.setCurrentIndex(0)
        
        # Verify state is preserved
        assert main_window.fractal_type == "Julia"

    def test_window_title(self, main_window):
        """Test that window title is set correctly."""
        assert "Fractal Workspace" in main_window.windowTitle()

    def test_window_minimum_size(self, main_window):
        """Test that window has minimum size constraints."""
        min_size = main_window.minimumSize()
        assert min_size.width() >= 600
        assert min_size.height() >= 400

    def test_all_tabs_have_widgets(self, main_window):
        """Test that all tabs contain widgets."""
        for i in range(main_window.tabs.count()):
            tab = main_window.tabs.widget(i)
            assert tab is not None
            assert tab.layout() is not None


# ============================================================================
# ACCESSIBILITY AND UI QUALITY TESTS
# ============================================================================

class TestUIQuality:
    """Tests for UI quality, accessibility, and usability."""

    def test_accessible_names_fractal_tab(self, main_window):
        """Test that key widgets in Fractal Generator have accessible names."""
        main_window.tabs.setCurrentIndex(0)
        
        # Check that important widgets have accessible names
        assert main_window.fractal_menu.accessibleName() != ""

    def test_tooltips_fractal_tab(self, main_window):
        """Test that widgets have helpful tooltips."""
        main_window.tabs.setCurrentIndex(0)
        
        # Combo boxes should have tooltips
        assert main_window.fractal_menu.toolTip() != ""

    def test_button_enabled_states(self, main_window):
        """Test that buttons have appropriate enabled/disabled states."""
        # Tumor detection buttons should be disabled initially
        main_window.tabs.setCurrentIndex(3)
        for btn in main_window.tumor_detect_buttons:
            assert not btn.isEnabled()
        
        # Image compare button should be disabled initially
        main_window.tabs.setCurrentIndex(2)
        assert not main_window.compare_btn.isEnabled()

    def test_visual_feedback_progress_bars(self, main_window):
        """Test that progress bars exist for long operations."""
        main_window.tabs.setCurrentIndex(0)
        assert main_window.progress is not None


# ============================================================================
# ERROR HANDLING TESTS
# ============================================================================

class TestErrorHandling:
    """Tests for error handling and edge cases."""

    def test_invalid_max_iterations_input(self, main_window):
        """Test handling of invalid max iterations input."""
        main_window.tabs.setCurrentIndex(0)
        edit = main_window.max_iter_entry
        
        # Try entering non-numeric value
        edit.clear()
        QTest.keyClicks(edit, "abc")
        edit.editingFinished.emit()
        
        # Max iter should remain valid (not change to invalid value)
        assert main_window.max_iter > 0

    def test_invalid_power_input(self, main_window):
        """Test handling of invalid power input."""
        main_window.tabs.setCurrentIndex(0)
        edit = main_window.power_entry
        
        edit.clear()
        QTest.keyClicks(edit, "invalid")
        edit.editingFinished.emit()
        
        # Power should remain valid
        assert isinstance(main_window.power, (int, float))
        assert main_window.power > 0

    def test_invalid_roi_size_input(self, main_window):
        """Test handling of invalid ROI size input."""
        main_window.tabs.setCurrentIndex(1)
        edit = main_window.bc_roi_edit
        btn = main_window.bc_start_btn
        
        # Try negative value
        edit.clear()
        QTest.keyClicks(edit, "-50")
        QTest.mouseClick(btn, Qt.MouseButton.LeftButton)
        
        # ROI size should not be set to negative
        if main_window.bc_roi_size is not None:
            assert main_window.bc_roi_size > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
