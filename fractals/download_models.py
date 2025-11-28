#!/usr/bin/env python3
"""
Download tumor detection ONNX models for Fractal Workspace.

Usage:
    fractal-download-models
    or
    python -m fractals.download_models

This script downloads the required ONNX model files into the correct output_models directory.
"""
import os
import urllib.request

MODELS = [
    {
        "filename": "tumor_detector_axial.onnx",
        "url": "https://github.com/aartisr/fractals/releases/download/v1.0.0/tumor_detector_axial.onnx"
    },
    {
        "filename": "tumor_detector_coronal.onnx",
        "url": "https://github.com/aartisr/fractals/releases/download/v1.0.0/tumor_detector_coronal.onnx"
    },
    {
        "filename": "tumor_detector_sagittal.onnx",
        "url": "https://github.com/aartisr/fractals/releases/download/v1.0.0/tumor_detector_sagittal.onnx"
    }
]

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "tumors", "output_models")
OUTPUT_DIR = os.path.abspath(OUTPUT_DIR)
os.makedirs(OUTPUT_DIR, exist_ok=True)

def download_model(model):
    dest = os.path.join(OUTPUT_DIR, model["filename"])
    if os.path.exists(dest) and os.path.getsize(dest) > 10000:
        print(f"{model['filename']} already exists, skipping.")
        return
    print(f"Downloading {model['filename']}...")
    urllib.request.urlretrieve(model["url"], dest)
    print(f"Saved to {dest}")

def main():
    for model in MODELS:
        download_model(model)
    print("All models downloaded.")

if __name__ == "__main__":
    main()
