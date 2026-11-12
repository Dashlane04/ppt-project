import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

OUTPUT = Path(__file__).resolve().parent / "results" / "advanced"
data = json.loads((OUTPUT / "DU_LIEU_HINH.json").read_text(encoding="utf-8"))
plt.rcParams.update({"font.size": 11, "axes.labelcolor": "#243D55", "text.color": "#13273C"})

methods = {
    "reference": ("Tham chiếu", "#5E6871", "--"),
    "linear": ("Tuyến tính", "#56829D", ":"),
    "cubic": ("Bicubic Keys", "#8B5A9C", "-."),
    "spline": ("Spline tự nhiên", "#C26038", "-"),
    "pchip": ("PCHIP", "#006D61", "-"),
}

figure, axes = plt.subplots(1, 2, figsize=(9.3, 3.1), layout="constrained", sharey=True)
for axis, profile in zip(axes, data["profiles2d"]):
    x = np.arange(profile["xStart"], profile["xStart"] + len(profile["reference"]))
    for key, (name, color, style) in methods.items():
        axis.plot(x, profile[key], style, lw=1.7, color=color, label=name)
    axis.set(title=f"Phóng {profile['scale']}×", xlabel="Vị trí ngang (pixel)", ylim=(8, 247))
    axis.grid(axis="y", color="#DCE5EC")
axes[0].set_ylabel("Mức xám trước làm tròn")
axes[1].legend(loc="lower right", fontsize=8, frameon=False)
figure.savefig(OUTPUT / "mat-cat-pchip.png", dpi=170, facecolor="white")
plt.close(figure)

phantom = data["views"]["phantom"]


def show(axis, view, method, xlabel, ylabel):
    values = np.asarray(view[method]).reshape(view["height"], view["width"])
    image = axis.imshow(values, cmap="gray", vmin=-35, vmax=275, origin="lower", interpolation="nearest",
                        extent=(-0.5, view["width"] - 0.5, -0.5, view["height"] - 0.5))
    axis.set(xlabel=xlabel, ylabel=ylabel, xticks=[0, 16, 32], yticks=[0, 12, 24])
    return image


figure, axes = plt.subplots(1, 4, figsize=(10.8, 2.92), layout="constrained")
for i, (axis, method) in enumerate(zip(axes, ("reference", "linear", "spline", "pchip"))):
    image = show(axis, phantom["axial"], method, "x (mm)", "y (mm)" if i == 0 else "")
    axis.set_title(methods[method][0], fontweight="semibold")
    if i:
        axis.tick_params(labelleft=False)
figure.colorbar(image, ax=axes.tolist(), ticks=[0, 125, 250], shrink=0.78)
figure.savefig(OUTPUT / "lat-axial-phantom.png", dpi=170, facecolor="white")
plt.close(figure)

planes = {
    "axial": ("Axial · z = 11 mm", "x (mm)", "y (mm)"),
    "coronal": ("Coronal · y = 15 mm", "x (mm)", "z (mm)"),
    "sagittal": ("Sagittal · x = 17 mm", "y (mm)", "z (mm)"),
}
figure, axes = plt.subplots(2, 3, figsize=(9.2, 5.5), layout="constrained")
for row, method in enumerate(("reference", "pchip")):
    for column, (plane, (title, xlabel, ylabel)) in enumerate(planes.items()):
        axis = axes[row, column]
        image = show(axis, phantom[plane], method, xlabel, ylabel)
        axis.set_title(f"{title}\n{methods[method][0]}")
figure.colorbar(image, ax=axes.ravel().tolist(), label="Cường độ quy ước", shrink=0.82)
figure.savefig(OUTPUT / "mpr-phantom.png", dpi=170, facecolor="white")
plt.close(figure)
