# Fractals & Medical Imaging: Project Story

---

## Slide 1: Title & Authors

**Fractals & Medical Imaging**  
A Modern Python Toolkit for Fractal Analysis, Tumor Detection, and Image Comparison

- Authors: Aarti S. R., Contributors
- Repository: fractals.wiki
- License: MIT

---

## Slide 2: Motivation & Vision

- Medical imaging is critical for diagnosis and research.
- Fractal geometry offers unique insights into complex biological structures.
- Need for accessible, modern, and extensible tools for:
  - Fractal analysis
  - Tumor detection
  - Visual comparison
- Vision: Empower researchers and clinicians with robust, user-friendly software.

---

## Slide 3: Key Features

- **Fractal Generation**: Mandelbrot, Julia, Sierpinski, Newton, Burning Ship, Barnsley Fern
- **Box Counting**: Quantitative fractal dimension analysis
- **Tumor Detection**: Deep learning models for brain MRI
- **Image Compare**: Visual and quantitative comparison of medical images
- **Modern UI**: PyQt6-based, drag-and-drop, dark mode, accessibility

---

## Slide 4: Architecture Overview

- Modular Python codebase
- Main modules:
  - `fractals/`: Fractal algorithms
  - `boxcounting/`: Box counting, ROI tools
  - `tumors/`: Detection models, workers
  - `ui.py`: Unified PyQt6 interface
- Extensible: Easy to add new fractals, models, or analysis methods

---

## Slide 5: User Experience

- **Intuitive UI**: Tabs for Fractals, Box Counting, Tumor Detection, Image Compare
- **Drag-and-Drop**: Effortless image loading
- **Live Feedback**: Progress bars, tooltips, real-time results
- **Accessibility**: Keyboard navigation, color contrast, tooltips
- **Documentation**: In-app instructions, wiki, API docs

---

## Slide 6: Fractal Analysis in Action

- Generate and visualize classic fractals
- Adjust parameters interactively
- Analyze fractal dimension of medical images
- Stepwise box counting with visual overlays
- Compare regions of interest (ROI) in brain scans

---

## Slide 7: Tumor Detection Pipeline

- Deep learning models (PyTorch)
- Pre-trained on axial, coronal, sagittal MRI slices
- Simple workflow:
  1. Load MRI image
  2. Run detection
  3. Visualize results with overlays
- Output: Tumor masks, confidence scores, exportable results

---

## Slide 8: Image Comparison & Research Utility

- Side-by-side image comparison
- Quantitative box counting comparison
- Visual overlays and stepwise explanation
- Use cases:
  - Research studies
  - Algorithm benchmarking
  - Clinical QA

---

## Slide 9: Engineering & Collaboration

- Modern Python best practices (PEP8, type hints, modularity)
- CI/CD: GitHub Actions for testing
- Extensible: Add new fractals, models, or UI features
- Open source: Welcoming contributions, code of conduct, detailed contributing guide

---

## Slide 10: Impact & Future Directions

- Empowering medical imaging research and education
- Open platform for new algorithms and models
- Planned features:
  - 3D fractal analysis
  - More medical imaging modalities
  - Cloud-based collaboration
- Join us: Contribute, suggest features, or use in your research!

---

# Thank You!

[GitHub: fractals.wiki](https://github.com/aartisr/fractals.wiki)
