"""Decode browser-uploaded images into OpenCV's BGR format."""
from io import BytesIO

import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError

# These plugins register their format handlers with Pillow when installed.
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:  # Kept optional so the API can still start before an upgrade.
    pass

try:
    import pillow_avif  # noqa: F401
except ImportError:
    pass


def decode_image(raw: bytes) -> np.ndarray | None:
    """Return a BGR image, or ``None`` when the upload is not an image."""
    if not raw:
        return None

    # Fast path for JPEG, PNG, WebP, etc.
    image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is not None:
        return image

    # Pillow adds HEIC/HEIF and AVIF support through the optional plugins.
    try:
        with Image.open(BytesIO(raw)) as source:
            rgb = np.asarray(source.convert("RGB"))
            return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    except (UnidentifiedImageError, OSError, ValueError):
        pass

    # SVG is a browser image format but must be rasterized before OpenCV can use it.
    if raw.lstrip().startswith(b"<svg"):
        try:
            import cairosvg
            png = cairosvg.svg2png(bytestring=raw)
            return cv2.imdecode(np.frombuffer(png, dtype=np.uint8), cv2.IMREAD_COLOR)
        except (ImportError, OSError, ValueError):
            pass

    return None
