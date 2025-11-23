# UI End-to-End Testing Guide

## Overview

This document describes the comprehensive end-to-end test suite for the Fractal Workspace application. The test suite covers all four tabs and validates complete user workflows.

## Test Structure

### Test Files

- **`tests/test_ui_end_to_end.py`**: Main test suite (123 tests total)
- **`run_ui_tests.py`**: Test runner script with reporting capabilities

### Test Categories

The test suite is organized into 7 main categories:

#### 1. Fractal Generator Tab Tests (35 tests)
Tests for the fractal generation functionality including:
- Tab accessibility and navigation
- Fractal type selection (Mandelbrot, Julia, Burning Ship, Newton, Barnsley Fern, Sierpinski Triangle)
- Parameter controls (resolution, color scheme, max iterations, power, complex parameters)
- Fractal generation workflow
- Save functionality
- Progress tracking
- Canvas display

**Key Test Methods:**
```python
test_tab_exists()
test_fractal_type_combo_box()
test_resolution_combo_box()
test_color_scheme_combo_box()
test_max_iterations_input()
test_power_input()
test_julia_c_parameters()
test_generate_button_click()
test_save_fractal_button()
test_progress_bar_exists()
test_fractal_canvas_exists()
```

#### 2. Box Counter Tab Tests (20 tests)
Tests for fractal dimension analysis:
- Image loading and selection
- ROI (Region of Interest) size configuration
- Click-to-analyze functionality
- Status updates and feedback
- Fractal dimension calculation workflow

**Key Test Methods:**
```python
test_select_image_button_exists()
test_roi_size_input_field()
test_apply_roi_button_exists()
test_status_label()
test_image_label_exists()
test_select_image_workflow()
test_roi_size_validation()
test_complete_box_counting_workflow()
```

#### 3. Image Compare Tab Tests (25 tests)
Tests for comparing two images using box counting:
- Dual image loading (double-click and drag-drop)
- Image reset functionality
- Image swap functionality
- Comparison workflow
- Result display
- Drag-and-drop validation

**Key Test Methods:**
```python
test_image_labels_exist()
test_reset_buttons_exist()
test_swap_button_exists()
test_compare_button_initial_state()
test_load_image1_double_click()
test_load_both_images()
test_reset_image1()
test_swap_functionality()
test_compare_button_click()
```

#### 4. Tumor Detection Tab Tests (20 tests)
Tests for AI-powered tumor detection:
- Three model sections (Axial, Coronal, Sagittal)
- Image loading for each model
- Detection button states
- Detection workflow
- Result display
- Model-specific functionality

**Key Test Methods:**
```python
test_three_model_sections()
test_original_image_labels()
test_detected_image_labels()
test_detect_buttons_initial_state()
test_load_tumor_image_axial()
test_detect_button_click_axial()
test_model_titles()
```

#### 5. Tab Integration Tests (10 tests)
Tests for cross-tab functionality:
- Tab switching and accessibility
- State preservation across tabs
- Tab naming consistency
- Window properties
- Layout validation

**Key Test Methods:**
```python
test_all_tabs_accessible()
test_tab_names()
test_tab_switching_preserves_state()
test_window_title()
test_window_minimum_size()
```

#### 6. UI Quality & Accessibility Tests (8 tests)
Tests for usability and accessibility:
- Accessible names for widgets
- Tooltips presence
- Button enabled/disabled states
- Visual feedback elements

**Key Test Methods:**
```python
test_accessible_names_fractal_tab()
test_tooltips_fractal_tab()
test_button_enabled_states()
test_visual_feedback_progress_bars()
```

#### 7. Error Handling Tests (5 tests)
Tests for edge cases and error conditions:
- Invalid input validation
- Boundary conditions
- Negative value handling

**Key Test Methods:**
```python
test_invalid_max_iterations_input()
test_invalid_power_input()
test_invalid_roi_size_input()
```

## Running Tests

### Prerequisites

Install test dependencies:
```bash
pip install pytest pytest-qt pytest-html
```

Or using the requirements file:
```bash
pip install -r requirements.txt
```

### Run All Tests

```bash
# Basic run
python run_ui_tests.py

# Verbose output
python run_ui_tests.py --verbose

# Generate HTML report
python run_ui_tests.py --html
```

### Run Specific Test Categories

```bash
# Fractal Generator tests only
python run_ui_tests.py --tab=fractal

# Box Counter tests only
python run_ui_tests.py --tab=box

# Image Compare tests only
python run_ui_tests.py --tab=compare

# Tumor Detection tests only
python run_ui_tests.py --tab=tumor

# Integration tests only
python run_ui_tests.py --tab=integration

# Quality tests only
python run_ui_tests.py --tab=quality

# Error handling tests only
python run_ui_tests.py --tab=error
```

### Using pytest Directly

```bash
# Run all UI tests
pytest tests/test_ui_end_to_end.py -v

# Run specific test class
pytest tests/test_ui_end_to_end.py::TestFractalGeneratorTab -v

# Run specific test method
pytest tests/test_ui_end_to_end.py::TestFractalGeneratorTab::test_fractal_type_combo_box -v

# Run with coverage
pytest tests/test_ui_end_to_end.py --cov=. --cov-report=html
```

### List Available Tests

```bash
python run_ui_tests.py --list
```

## Test Fixtures

The test suite uses several pytest fixtures:

### `qapp`
- **Scope**: Session
- **Purpose**: Provides QApplication instance for all tests
- **Usage**: Shared across all test classes

### `main_window`
- **Scope**: Function
- **Purpose**: Creates fresh MainWindow instance for each test
- **Usage**: Ensures test isolation

### `sample_grayscale_image`
- **Purpose**: Generates a 256x256 grayscale test image
- **Pattern**: XOR pattern for fractal-like appearance

### `sample_color_image`
- **Purpose**: Generates a 256x256 RGB test image
- **Pattern**: Four colored quadrants (red, green, blue, yellow)

### `temp_test_image`
- **Purpose**: Creates temporary image file on disk
- **Cleanup**: Automatic cleanup via tmp_path fixture

## Test Patterns

### UI Interaction Pattern
```python
def test_button_click(self, main_window):
    main_window.tabs.setCurrentIndex(0)  # Switch to tab
    btn = main_window.some_button
    QTest.mouseClick(btn, Qt.MouseButton.LeftButton)
    # Assert expected behavior
```

### Input Testing Pattern
```python
def test_text_input(self, main_window):
    edit = main_window.some_line_edit
    edit.clear()
    QTest.keyClicks(edit, "test_value")
    edit.editingFinished.emit()
    assert main_window.some_property == "test_value"
```

### Mock File Dialog Pattern
```python
@patch('PyQt6.QtWidgets.QFileDialog.getOpenFileName')
def test_file_selection(self, mock_dialog, main_window, temp_test_image):
    mock_dialog.return_value = (temp_test_image, "Images (*.png)")
    # Trigger file selection
    # Assert file was loaded
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: UI Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install pytest pytest-qt pytest-html
    
    - name: Run UI tests
      run: |
        xvfb-run python run_ui_tests.py --verbose --html
    
    - name: Upload test report
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: test-report
        path: test_report.html
```

## Writing New Tests

### Adding a New Test Method

```python
class TestFractalGeneratorTab:
    def test_new_feature(self, main_window):
        """Test description."""
        # Arrange
        main_window.tabs.setCurrentIndex(0)
        
        # Act
        # Perform actions
        
        # Assert
        # Verify results
        assert expected_condition
```

### Adding a New Test Class

```python
class TestNewFeature:
    """End-to-end tests for new feature."""
    
    def test_basic_functionality(self, main_window):
        """Test basic functionality."""
        pass
    
    def test_edge_cases(self, main_window):
        """Test edge cases."""
        pass
```

## Coverage Goals

| Component | Target Coverage | Current Coverage |
|-----------|----------------|------------------|
| UI tabs   | 90%            | ~85%             |
| Workflows | 100%           | ~95%             |
| Error handling | 80%       | ~75%             |
| Integration | 95%          | ~90%             |

## Known Limitations

1. **Model Loading**: Tumor detection tests mock the actual YOLOv5 model loading to speed up tests
2. **Image Processing**: Heavy image processing operations are mocked to reduce test time
3. **File I/O**: Most file operations use temporary files or mocks
4. **Threading**: Fractal generation threading is tested but may need timing adjustments on slower systems

## Troubleshooting

### Tests Hang on Display
**Issue**: Tests hang when creating windows  
**Solution**: Use `xvfb-run` on headless systems:
```bash
xvfb-run pytest tests/test_ui_end_to_end.py
```

### Import Errors
**Issue**: Module not found errors  
**Solution**: Ensure you're running from the project root and have installed all dependencies

### QApplication Already Exists
**Issue**: "QApplication instance already created" error  
**Solution**: Use session-scoped `qapp` fixture

### Timing Issues
**Issue**: Tests fail intermittently due to timing  
**Solution**: Add `QTest.qWait()` calls where needed:
```python
QTest.qWait(100)  # Wait 100ms
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Use clear, descriptive test method names
3. **Single Assertion**: Prefer one logical assertion per test
4. **Setup/Teardown**: Use fixtures for common setup
5. **Mocking**: Mock external dependencies (file dialogs, network calls)
6. **Documentation**: Add docstrings to all test methods
7. **Fast Tests**: Keep tests fast by mocking heavy operations

## Contributing Tests

When adding new features:

1. Write tests first (TDD approach)
2. Ensure tests cover happy path and edge cases
3. Run full test suite before committing
4. Update this documentation
5. Maintain >80% coverage target

## Contact

For questions about the test suite, please refer to:
- **API Documentation**: `API_DOCUMENTATION.md`
- **Main README**: `README.md`
- **Contributing Guide**: `CONTRIBUTING.md`

## License

See LICENSE file for details.
