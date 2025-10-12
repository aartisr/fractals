import numpy as np
import matplotlib.pyplot as plt
import cv2
import os

# Output directory
out_dir = os.path.join(os.path.dirname(__file__), 'images')
os.makedirs(out_dir, exist_ok=True)

# 1. Create synthetic healthy and pathological images
def make_blob_image(seed, n_blobs=5, size=128, noise=0.1):
    np.random.seed(seed)
    img = np.zeros((size, size), dtype=np.float32)
    for _ in range(n_blobs):
        x, y = np.random.randint(20, size-20, 2)
        r = np.random.randint(8, 18)
        cv2.circle(img, (x, y), r, 1, -1)
    img += noise * np.random.randn(size, size)
    img = np.clip(img, 0, 1)
    return (img * 255).astype(np.uint8)

def make_pathology_image(seed, n_blobs=12, size=128, noise=0.18):
    np.random.seed(seed)
    img = np.zeros((size, size), dtype=np.float32)
    for _ in range(n_blobs):
        x, y = np.random.randint(10, size-10, 2)
        r = np.random.randint(6, 22)
        cv2.circle(img, (x, y), r, 1, -1)
    img += noise * np.random.randn(size, size)
    img = np.clip(img, 0, 1)
    return (img * 255).astype(np.uint8)

healthy = make_blob_image(seed=1)
pathology = make_pathology_image(seed=2)
cv2.imwrite(os.path.join(out_dir, 'medical_healthy.png'), healthy)
cv2.imwrite(os.path.join(out_dir, 'medical_pathology.png'), pathology)

# 2. Overlay grids for each box size
def overlay_grid(img, box_size, color=(255,0,0)):
    img_rgb = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    h, w = img.shape
    for x in range(0, w, box_size):
        cv2.line(img_rgb, (x, 0), (x, h), color, 1)
    for y in range(0, h, box_size):
        cv2.line(img_rgb, (0, y), (w, y), color, 1)
    return img_rgb

for box_size in [32, 16, 8]:
    cv2.imwrite(os.path.join(out_dir, f'healthy_grid{box_size}.png'), overlay_grid(healthy, box_size))
    cv2.imwrite(os.path.join(out_dir, f'pathology_grid{box_size}.png'), overlay_grid(pathology, box_size))

# 3. Simulate box counting data and plot log-log chart
def boxcount(img, box_sizes):
    counts = []
    for size in box_sizes:
        n = 0
        for i in range(0, img.shape[0], size):
            for j in range(0, img.shape[1], size):
                patch = img[i:i+size, j:j+size]
                if np.any(patch > 30):
                    n += 1
        counts.append(n)
    return counts

box_sizes = np.array([32, 16, 8])
N_healthy = boxcount(healthy, box_sizes)
N_pathology = boxcount(pathology, box_sizes)

plt.figure(figsize=(5,4))
plt.plot(np.log(1/box_sizes), np.log(N_healthy), 'o-b', label='Healthy')
plt.plot(np.log(1/box_sizes), np.log(N_pathology), 'o-r', label='Pathological')
plt.xlabel('log(1/ε)')
plt.ylabel('log N(ε)')
plt.title('Box Counting Log-Log Plot')
plt.legend()
plt.tight_layout()
plt.savefig(os.path.join(out_dir, 'boxcount_loglog_comparison.png'))
plt.close()

print('Demo images generated in:', out_dir)
