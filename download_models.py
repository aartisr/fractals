#!/usr/bin/env python3
"""
Download tumor detection ONNX models for Fractal Workspace.

Usage:
    python download_models.py

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

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "tumors", "output_models")

os.makedirs(OUTPUT_DIR, exist_ok=True)

def download_model(model):
    dest = os.path.join(OUTPUT_DIR, model["filename"])
    if os.path.exists(dest) and os.path.getsize(dest) > 10000:
        print(f"{model['filename']} already exists, skipping.")
        return
    print(f"Downloading {model['filename']}...")

    def progress_bar(block_num, block_size, total_size):
        downloaded = block_num * block_size
        percent = min(100, downloaded * 100 // total_size) if total_size > 0 else 0
        bar_len = 40
        filled_len = int(bar_len * percent // 100)
        bar = '=' * filled_len + '-' * (bar_len - filled_len)
        print(f"\r[{bar}] {percent}%", end='')
        if downloaded >= total_size:
            print()

    urllib.request.urlretrieve(model["url"], dest, reporthook=progress_bar)
    print(f"Saved to {dest}")

def main():
    for model in MODELS:
        download_model(model)
    print("All models downloaded.")

if __name__ == "__main__":
    main()
