import time
import numpy as np
import cv2
from skimage.morphology import skeletonize

class BoxCounterUtils:
    """
    Utility class for box counting and fractal dimension estimation.
    """
    @staticmethod
    def box_counting(image):
        sizes = 2 ** np.arange(1, int(np.log2(min(image.shape))) + 1)
        counts = [
            sum(
                np.any(image[x * size:(x + 1) * size, y * size:(y + 1) * size])
                for x in range((image.shape[0] + size - 1) // size)
                for y in range((image.shape[1] + size - 1) // size)
            )
            for size in sizes
        ]
        log_sizes, log_counts = np.log(sizes), np.log(counts)
        return -np.polyfit(log_sizes, log_counts, 1)[0]

    @staticmethod
    def fractal_dim(image):
        start = time.time()
        ksize = max(51, max(image.shape) | 1)
        blur = cv2.GaussianBlur(image, (ksize, ksize), 35, borderType=cv2.BORDER_REPLICATE)
        math_result = np.clip(image.astype(int) - blur + 128, 0, 255).astype(np.uint8)
        binarized = cv2.threshold(math_result, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        processed = cv2.morphologyEx(binarized, cv2.MORPH_CLOSE, kernel)
        skeletonized = (skeletonize(processed // 255) * 255).astype(np.uint8)
        fd = BoxCounterUtils.box_counting(skeletonized)
        return round(fd, 4), round(time.time() - start, 4)
