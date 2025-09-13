# Study of Fractals

This project is a Python application that generates various fractals using different algorithms. It provides an interactive graphical user interface (GUI) for users to select fractal types, adjust parameters, and visualize the generated fractals.

## Project Structure

```
Python-Fractal-Generator
├── fractals
│   ├── __init__.py
│   ├── barnsley_fern.py
│   ├── burning_ship.py
│   ├── julia.py
│   ├── mandelbrot.py
│   ├── newton.py
│   └── sierpinski_triangle.py
├── ui.py
├── app.py
├── requirements.txt
└── README.md
```

## Fractal Implementations

The application supports the following fractal types:
- **Barnsley Fern**: Generates the Barnsley Fern fractal using an iterative algorithm.
- **Burning Ship**: Implements the Burning Ship fractal generation logic.
- **Julia Set**: Generates Julia sets based on user-defined parameters.
- **Mandelbrot Set**: Implements the Mandelbrot set fractal generation logic.
- **Newton Fractal**: Generates fractals based on Newton's method for finding roots.
- **Sierpinski Triangle**: Implements the Sierpinski Triangle fractal generation logic.

## Features

- **Interactive GUI**: Easily generate and visualize fractals.
- **Multiple Fractal Types**: Choose from six fractal types.
- **Customizable Parameters**:
  - Resolution (e.g., 500x500, 1920x1080)
  - Color schemes (e.g., inferno, plasma, viridis)
  - Iterations and other fractal-specific parameters.
- **Save Fractals**: Save generated fractals as PNG images.
- **Real-Time Updates**: Adjust parameters and regenerate fractals dynamically.

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## Setup Instructions

1. **Clone the Repository**:
   ```bash
   git clone <replace-with-your-repository-url>
   ```

2. **Navigate to the Project Directory**:
   ```bash
   cd fractals
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

To run the application, execute the following command:
```bash
python ui.py
```

### Steps:
1. Select the type of fractal you want to generate.
2. Adjust the parameters (e.g., resolution, color scheme, iterations).
3. Click the **"Generate Fractal"** button to visualize the result.
4. Save the generated fractal as a PNG image using the **"Save Fractal"** button.

## Example Output

Below is an example of a generated fractal:

![Example Fractal](example_fractal.png)

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, please open an issue or submit a pull request.

### How to Contribute:
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

## Acknowledgments

This project is inspired by and based on the work from the [Python Fractal Generator](https://github.com/lahkopo/Python-Fractal-Generator) repository by [lahkopo](https://github.com/lahkopo). Special thanks to the original author for providing the foundation for this project.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.