# Quick Start: Running UI Tests

## Installation

1. **Install dependencies** (if not already installed):
   ```bash
   pip install -r requirements.txt
   ```

2. **Verify installation**:
   ```bash
   python3 -c "import pytest; import PyQt6; print('✅ All test dependencies installed')"
   ```

## Running Tests

### Option 1: Using the Test Runner (Recommended)

```bash
# Run all tests with summary
python3 run_ui_tests.py

# Run specific tab tests
python3 run_ui_tests.py --tab=fractal
python3 run_ui_tests.py --tab=box
python3 run_ui_tests.py --tab=compare
python3 run_ui_tests.py --tab=tumor

# Verbose output
python3 run_ui_tests.py --verbose

# Generate HTML report
python3 run_ui_tests.py --html

# List available test categories
python3 run_ui_tests.py --list
```

### Option 2: Using pytest Directly

```bash
# Run all UI tests
pytest tests/test_ui_end_to_end.py -v

# Run specific test class
pytest tests/test_ui_end_to_end.py::TestFractalGeneratorTab -v

# Run with coverage report
pytest tests/test_ui_end_to_end.py --cov=. --cov-report=html

# Run existing unit tests (all)
pytest tests/ -v
```

## Test Categories

| Category | Command | Test Count |
|----------|---------|------------|
| **Fractal Generator** | `--tab=fractal` | 11 tests |
| **Box Counter** | `--tab=box` | 10 tests |
| **Image Compare** | `--tab=compare` | 15 tests |
| **Tumor Detection** | `--tab=tumor` | 13 tests |
| **Integration** | `--tab=integration` | 6 tests |
| **UI Quality** | `--tab=quality` | 4 tests |
| **Error Handling** | `--tab=error` | 3 tests |
| **ALL TESTS** | (no --tab flag) | 62+ tests |

## Expected Output

✅ **Success** looks like:
```
======================================================================
Running Fractal Workspace UI End-to-End Tests
======================================================================

tests/test_ui_end_to_end.py::TestFractalGeneratorTab::test_tab_exists PASSED
tests/test_ui_end_to_end.py::TestFractalGeneratorTab::test_switch_to_fractal_tab PASSED
...
======================================================================
✅ All tests passed successfully!
======================================================================

62 passed in 15.23s
```

❌ **Failure** looks like:
```
tests/test_ui_end_to_end.py::TestFractalGeneratorTab::test_some_feature FAILED
...
FAILED tests/test_ui_end_to_end.py::TestFractalGeneratorTab::test_some_feature
```

## Headless Testing (Linux/CI)

On systems without a display:
```bash
xvfb-run python3 run_ui_tests.py
```

## Troubleshooting

### "QApplication instance already created"
- This is normal - tests reuse the QApplication instance
- Tests are designed to handle this

### "Module not found: pytest"
```bash
pip install pytest pytest-qt pytest-html
```

### Tests run slowly
- UI tests take longer than unit tests (15-30 seconds is normal)
- Use `--tab` flag to run specific categories

### Import errors
- Make sure you're in the project root directory
- Verify all dependencies are installed

## What's Being Tested?

### ✅ Fractal Generator Tab
- Fractal type selection (6 types)
- Parameter controls (resolution, colors, iterations)
- Generation workflow
- Save functionality

### ✅ Box Counter Tab
- Image loading
- ROI size configuration
- Click-to-analyze workflow
- Fractal dimension calculation

### ✅ Image Compare Tab
- Dual image loading (drag-drop + double-click)
- Image swap and reset
- Comparison workflow
- Result display

### ✅ Tumor Detection Tab
- Three model sections (Axial, Coronal, Sagittal)
- Image loading per model
- Detection workflow
- Result visualization

### ✅ Integration Tests
- Tab switching
- State preservation
- Cross-tab functionality

### ✅ Quality Tests
- Accessibility
- Tooltips
- Button states
- Visual feedback

## Next Steps

After running tests:

1. **Review the report** - Check which tests passed/failed
2. **Fix failures** - Address any failing tests
3. **Check coverage** - Run with `--cov` to see code coverage
4. **Add more tests** - See `TESTING.md` for guidelines

## Full Documentation

For complete testing documentation, see:
- **TESTING.md** - Comprehensive testing guide
- **API_DOCUMENTATION.md** - API reference
- **README.md** - Project overview

Happy Testing! 🧪✨
