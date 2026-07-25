"""
Automatic image enhancement for live-stream face crops.

Instead of rejecting a low-quality frame, we try to recover as much signal
as possible before embedding:

  1. CLAHE         -- adaptive histogram equalisation to fix under/over-exposure
  2. Bilateral     -- edge-preserving smoothing to reduce webcam sensor noise
                      (much faster than NL-Means; ~2ms vs ~300ms on CPU)
  3. Unsharp mask  -- sharpens soft-focus blur without amplifying noise

All three steps together typically run in 3-8ms on CPU, which is fast enough
to process every WebSocket frame without introducing lag.

Note: enhancement is applied to the *aligned 112x112 face crop* returned by
FaceDetector.detect(), NOT to the raw full-resolution frame.
"""
import cv2
import numpy as np


# ── CLAHE parameters ──────────────────────────────────────────────────────────
_CLAHE_CLIP  = 2.0
_CLAHE_TILE  = (8, 8)

# ── Bilateral filter parameters ───────────────────────────────────────────────
_BILAT_D     = 5     # diameter of pixel neighbourhood (5 is fast and effective)
_BILAT_SIGMA = 40    # both sigmaColor and sigmaSpace

# ── Unsharp mask parameters ───────────────────────────────────────────────────
_SHARP_SIGMA  = 1.0
_SHARP_AMOUNT = 1.2   # conservative -- too high overshoots on already-sharp crops


def _clahe_equalise(bgr: np.ndarray) -> np.ndarray:
    """Apply CLAHE on the L channel of LAB to normalise brightness/contrast."""
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=_CLAHE_CLIP, tileGridSize=_CLAHE_TILE)
    l = clahe.apply(l)
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)


def _bilateral(bgr: np.ndarray) -> np.ndarray:
    """
    Edge-preserving noise reduction via bilateral filtering.
    Much faster than NL-Means (~2ms vs ~300ms on CPU) and sufficient
    for webcam sensor noise at this crop size.
    """
    return cv2.bilateralFilter(bgr, _BILAT_D, _BILAT_SIGMA, _BILAT_SIGMA)


def _unsharp_mask(bgr: np.ndarray) -> np.ndarray:
    """Increase perceptual sharpness without amplifying noise excessively."""
    blurred = cv2.GaussianBlur(bgr, (0, 0), _SHARP_SIGMA)
    return cv2.addWeighted(bgr, 1 + _SHARP_AMOUNT, blurred, -_SHARP_AMOUNT, 0)


def enhance_face_crop(
    aligned_crop: np.ndarray,
    *,
    denoise: bool = True,
    sharpen: bool = True,
    equalise: bool = True,
) -> np.ndarray:
    """
    Apply automatic enhancements to an aligned 112x112 BGR face crop.

    Parameters
    ----------
    aligned_crop : np.ndarray
        112x112x3 BGR image straight out of FaceDetector.detect().
    denoise : bool
        Run bilateral filtering to reduce sensor noise.
    sharpen : bool
        Run unsharp masking to recover soft-focus blur.
    equalise : bool
        Run CLAHE histogram equalisation to fix exposure problems.

    Returns
    -------
    np.ndarray
        Enhanced 112x112x3 BGR image, same dtype as input.
    """
    img = aligned_crop.copy()

    if equalise:
        img = _clahe_equalise(img)

    if denoise:
        img = _bilateral(img)

    if sharpen:
        img = _unsharp_mask(img)

    return img


def blur_variance(crop: np.ndarray) -> float:
    """Laplacian variance of a face crop — higher is sharper."""
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())
