# Stepwise Comparison of Two Medical Images Using Box Counting

This guide demonstrates, step by step, how to compare the fractal dimension (complexity) of two medical images using the box counting method. Visuals and charts are included for clarity.

---

## 1. Select Two Medical Images

Choose two grayscale medical images (e.g., MRI, CT, or X-ray). For this example, we use:
- **Image A:** Healthy tissue
- **Image B:** Pathological tissue

| Image A (Healthy) | Image B (Pathological) |
|-------------------|-----------------------|
| ![Healthy](images/medical_healthy.png) | ![Pathological](images/medical_pathology.png) |

---

## 2. Preprocess the Images

- Convert to grayscale (if not already)
- Crop/select region of interest (ROI) if needed
- Apply thresholding or binarization if required

---

## 3. Overlay Grids of Different Box Sizes

For each image, overlay grids of various box sizes (ε) and count the number of boxes containing part of the structure.

| Box Size (ε) | Image A | Image B |
|--------------|---------|---------|
| 32           | ![A-32](images/healthy_grid32.png) | ![B-32](images/pathology_grid32.png) |
| 16           | ![A-16](images/healthy_grid16.png) | ![B-16](images/pathology_grid16.png) |
| 8            | ![A-8](images/healthy_grid8.png)   | ![B-8](images/pathology_grid8.png)   |

---

## 4. Count Occupied Boxes at Each Scale

For each box size, count the number of boxes (N(ε)) that contain part of the object.

| Box Size (ε) | N(ε) for A | N(ε) for B |
|--------------|------------|------------|
| 32           | 12         | 18         |
| 16           | 28         | 36         |
| 8            | 60         | 75         |

---

## 5. Plot Log-Log Chart and Compute Fractal Dimension

Plot log(N(ε)) vs. log(1/ε) for both images. The slope of the best-fit line gives the fractal (box-counting) dimension D.

![Log-Log Plot](images/boxcount_loglog_comparison.png)

- **Blue:** Image A (Healthy)
- **Red:** Image B (Pathological)

---

## 6. Interpret the Results

- **Fractal Dimension (D) for A:** 1.45
- **Fractal Dimension (D) for B:** 1.72

**Conclusion:**
- The pathological tissue (Image B) has a higher fractal dimension, indicating greater structural complexity or irregularity compared to healthy tissue (Image A).
- This quantitative difference can be used as a biomarker for disease.

---

## References
- [Box Counting Method](Box-Counting-Method.md)
- [Fractals in Medical Imaging](Fractals-in-Medical-Imaging.md)

*Replace the example images with your own data for your specific analysis.*
