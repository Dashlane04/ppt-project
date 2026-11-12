"""Create the fixed grayscale reference crops from the bundled originals."""

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
WIDTH, HEIGHT = 384, 224
SOURCE = "https://raw.githubusercontent.com/scikit-image/scikit-image/v0.25.2/skimage/data/"
PHOTOS = {
    "camera": ("Lav Varshney", "CC0", "Camera"),
    "astronaut": ("NASA", "Public domain per the scikit-image data documentation", "Eileen Collins"),
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


manifest = {"width": WIDTH, "height": HEIGHT, "photos": {}}
for key, (credit, rights, subject) in PHOTOS.items():
    source_path = DATA / "original" / f"{key}.png"
    with Image.open(source_path) as image:
        left = (image.width - WIDTH) // 2
        top = (image.height - HEIGHT) // 2
        crop = (left, top, left + WIDTH, top + HEIGHT)
        rgb = np.asarray(image.crop(crop).convert("RGB"), dtype=np.uint32)
        # Integer coefficients define the grayscale convention exactly.
        gray = ((299 * rgb[..., 0] + 587 * rgb[..., 1] + 114 * rgb[..., 2] + 500) // 1000).astype(np.uint8)
        original_shape = [image.width, image.height]
    output = DATA / f"{key}.gray8"
    output.write_bytes(gray.tobytes())
    Image.fromarray(gray).save(DATA / f"{key}-reference.png")
    manifest["photos"][key] = {
        "subject": subject, "credit": credit, "rights": rights,
        "source_url": f"{SOURCE}{key}.png",
        "documentation_url": f"https://scikit-image.org/docs/0.25.x/api/skimage.data.html#skimage.data.{key}",
        "original_dimensions": original_shape, "original_sha256": sha256(source_path),
        "crop_ltrb_zero_based_exclusive_end": list(crop),
        "grayscale": "floor((299*R+587*G+114*B+500)/1000)",
        "reference_gray8_sha256": sha256(output),
    }

(DATA / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("Two 384 × 224 grayscale reference crops prepared.")
