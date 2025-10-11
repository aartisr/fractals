# Fractal Workspace: Interactive Fractal Generator & Analyzer

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)

---

## 🚀 Demo / Screenshots

| Fractal Generator | Box Counter | Example Fractal |
|-------------------|-------------|-----------------|
| ![Fractal Generator](design/UI_Fractal.png) | ![Box Counter](design/UI_RadioImage.png) | ![Example Fractal](design/UI_Fractal.png) |

---

## Architecture Diagram

![Architecture Diagram](design/design.png)

## Application Flow Diagram

![Flow Diagram](design/flow.png)

---

This project is a Python application for generating, visualizing, and analyzing fractals. It features a modern, interactive GUI and advanced tools for fractal dimension analysis using box counting.

## Features

- **Interactive GUI**: Generate, visualize, and analyze fractals in a user-friendly interface.
- **Multiple Fractal Types**: Mandelbrot, Julia, Burning Ship, Newton, Barnsley Fern, Sierpinski Triangle.
- **Customizable Parameters**: Resolution, color scheme, iterations, and fractal-specific parameters.
- **Box Counting Tool**: Select a region of interest (ROI) in any image and compute its fractal dimension using the box counting method.
- **ROI Selection**: Click on the image to select the top-left corner of the ROI for analysis.
- **Save Fractals**: Export generated fractals as PNG images.
- **Notes & Formulas**: Built-in notes area and reference for fractal dimension formulas.
- **Modular Codebase**: All box counting logic and ROI image handling are modularized in the `boxcounting/` package for maintainability and reuse.

---

## 🌟 Why Use This?

- **All-in-one fractal exploration**: Generate, visualize, and analyze a wide variety of fractals in one app.
- **Educational**: Great for students, teachers, and researchers in mathematics, physics, and neuroscience.
- **Research-Ready**: Includes tools for fractal dimension analysis, useful in medical imaging and scientific research.
- **Modern UX**: Clean, accessible, and responsive PyQt6 interface with tooltips and error dialogs.
- **Open Source**: MIT licensed, well-documented, and easy to contribute to.

---

## Quick Start

```bash
git clone <replace-with-your-repository-url>
cd fractal-box-counter
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python ui.py
```

---

## Prerequisites & Dependencies

- Python 3.8 or higher
- pip (Python package manager)
- PyQt6
- numpy
- matplotlib
- opencv-python
- scikit-image
- markdown (for wiki tab rendering)

All dependencies are listed in [requirements.txt](requirements.txt).

---

## Usage

To run the application, execute:

```bash
python ui.py
```

### Main Tabs

- **Fractal Generator**: Select fractal type, adjust parameters, and generate fractals.
- **Fractal Box Counting**: Take notes and view fractal dimension formulas.
- **Box Counter**: Load an image, set ROI size, click to select ROI, and compute fractal dimension.

### Box Counting Workflow

1. Go to the **Box Counter** tab.
2. Click **Select Image** and choose a grayscale image.
3. Enter the ROI size (e.g., 128) and click **Apply ROI Size**.
4. Click on the image to select the top-left corner of the ROI.
5. The fractal dimension and computation time will be displayed.

---

## 📖 Advanced Topics & Wiki

- [Fractals in Medical Imaging](wiki/Fractals-in-Medical-Imaging.md)
- [Box Counting Method](wiki/Box-Counting-Method.md)
- [Fractal Types and Equations](wiki/Fractal-Types-and-Equations.md)

---

## Project Structure

```text
fractal-box-counter/
├── boxcounting/
│   ├── __init__.py
│   ├── box_counter_helpers.py
│   ├── box_counter_utils.py
│   └── roi_image_label.py
├── fractals/
│   ├── __init__.py
│   ├── barnsley_fern.py
│   ├── burning_ship.py
│   ├── julia.py
│   ├── mandelbrot.py
│   ├── newton.py
│   └── sierpinski_triangle.py
├── images/
├── ui.py
├── requirements.txt
├── design.puml
└── README.md
```

---

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting issues or pull requests.

### How to Contribute

1. Fork the repository.
2. Create a new branch for your feature or bug fix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Commit your changes:

   ```bash
   git commit -m "Add your commit message here"
   ```

4. Push to your branch:

   ```bash
   git push origin feature/your-feature-name
   ```

5. Open a pull request.

---

## Troubleshooting

- **PyQt6 install issues**: Ensure you are using Python 3.8+ and a clean virtual environment. Try `pip install --upgrade pip` before installing requirements.
- **MathJax formulas not rendering**: The wiki tab uses MathJax via CDN. Ensure you have an internet connection for formulas to display.
- **UI scaling issues**: On high-DPI displays, set the `QT_SCALE_FACTOR=1` environment variable if needed.

---

## ❓ FAQ

**Q: Can I use this for research or teaching?**  
A: Yes! The app is designed for both educational and research use, with modular code and clear documentation.

**Q: How do I add a new fractal type?**  
A: Add a new Python file in the `fractals/` directory and update the UI dropdown in `ui.py`.

**Q: Does it work on Windows, Mac, and Linux?**  
A: Yes, it is cross-platform. Just ensure you have Python 3.8+ and the required dependencies.

**Q: Where can I learn more about fractals and box counting?**  
A: See the [Advanced Topics & Wiki](#advanced-topics--wiki) section or the in-app wiki tab.

---

## Acknowledgments

This project is inspired by the [Python Fractal Generator](https://github.com/lahkopo/Python-Fractal-Generator) by [lahkopo](https://github.com/lahkopo). Special thanks to the original author and all contributors.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Contact / Maintainer

For questions, suggestions, or feedback, please open an issue or contact [Aarti Sri Ravikumar](https://github.com/aartisr).


