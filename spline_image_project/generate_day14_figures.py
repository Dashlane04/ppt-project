"""Export the day 14 figures from the recorded experiment arrays."""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib import font_manager
from matplotlib.colors import Normalize


OUT = Path(__file__).resolve().parent / "results" / "day14"
RECORD = json.loads((OUT / "KET_QUA_NGAY_14.json").read_text(encoding="utf-8"))
WIDTH, HEIGHT = RECORD["config"]["referenceDimensions"]
SAMPLES = {
    "edge": "Biên tương phản",
    "lines": "Nét mảnh",
    "texture": "Hoa văn",
    "camera": "Camera",
    "astronaut": "Astronaut",
}
METHODS = {"linear": "Song tuyến tính", "cubic": "Bicubic Keys", "spline": "Spline tự nhiên"}
INK, BLUE, TEAL, AMBER = "#142a43", "#2360a5", "#007b72", "#a45a28"
ARIAL = Path("C:/Windows/Fonts/arial.ttf")
if ARIAL.exists():
    font_manager.fontManager.addfont(ARIAL)
    font_manager.fontManager.addfont(ARIAL.with_name("arialbd.ttf"))
    plt.rcParams["font.family"] = "Arial"
plt.rcParams.update({
    "font.size": 12, "axes.spines.top": False, "axes.spines.right": False,
    "axes.labelcolor": "#243a54", "text.color": INK, "axes.edgecolor": "#93a5b9",
    "grid.color": "#dce5ed", "savefig.dpi": 160,
})


def save(fig, name):
    fig.savefig(OUT / name, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def pixels(name):
    return np.fromfile(OUT / "data" / name, dtype=np.uint8).reshape(HEIGHT, WIDTH)


def number(value, digits=4):
    return f"{value:.{digits}f}".replace(".", ",")


def image_panel(ax, data):
    ax.imshow(data, cmap="gray", vmin=0, vmax=255, interpolation="nearest")
    ax.set(xticks=[], yticks=[])
    for spine in ax.spines.values():
        spine.set_visible(False)


mae = {(row["image"], row["scale"], row["method"]): row["mae"] for row in RECORD["quality"]}
for scale in RECORD["config"]["scales"]:
    fig, axes = plt.subplots(5, 4, figsize=(13.5, 11.4), layout="constrained")
    fig.suptitle(f"Năm ảnh tham chiếu và kết quả phóng {scale}×", fontsize=20, fontweight="bold")
    for row, (sample, label) in enumerate(SAMPLES.items()):
        for col, method in enumerate(("reference", *METHODS)):
            ax = axes[row, col]
            filename = f"{sample}-reference.gray8" if method == "reference" else f"{sample}-{scale}x-{method}.gray8"
            image_panel(ax, pixels(filename))
            if row == 0:
                ax.set_title("Ảnh tham chiếu" if method == "reference" else METHODS[method], fontsize=15)
            if col == 0:
                ax.set_ylabel(label, fontsize=13)
            else:
                ax.set_xlabel("MAE " + number(mae[sample, scale, method]), fontsize=11)
    save(fig, f"bo-anh-so-sanh-{scale}x.png")

fig, axes = plt.subplots(1, 2, figsize=(11.6, 4.6), sharey=True, layout="constrained")
fig.suptitle("Sai lệch spline 1D đo được và chặn theo phần dư", fontsize=19, fontweight="bold")
for index, (ax, case) in enumerate(zip(axes, RECORD["rowResults"])):
    ax.set_title(f"{SAMPLES[case['image']]} · hàng {case['lowRow']}")
    history = case["history"]
    ax.semilogy([r["sweep"] for r in history], [r["bound"] for r in history],
                color=BLUE, linewidth=2, label=r"Chặn $\|r\|_\infty/16$")
    ax.semilogy([r["sweep"] for r in history], [r["sampledError"] for r in history],
                color=TEAL, linewidth=2, linestyle="--", label="Sai lệch trên 6.081 điểm")
    stops = case["trials"]
    ax.scatter([r["sweep"] for r in stops], [r["sampledError"] for r in stops],
               s=48, facecolor="white", edgecolor=TEAL, linewidth=1.5, zorder=3, label="Ba lần dừng")
    ax.set(xlabel="Số vòng Gauss–Seidel", xlim=(-0.5, 22.5))
    ax.grid(axis="y", which="major")
    if index == 0:
        ax.set_ylabel("Mức xám trước làm tròn")
    else:
        ax.legend(frameon=False, loc="upper right", fontsize=10)
save(fig, "kiem-chung-chan-1d.png")

fig, axes = plt.subplots(2, 3, figsize=(12.3, 5.5), layout="constrained")
fig.suptitle("Sai lệch tuyệt đối của ảnh spline Gauss–Seidel so với Thomas", fontsize=18, fontweight="bold")
max_error = max(row["rawMax"] for row in RECORD["imageResults"])
norm = Normalize(vmin=0, vmax=np.ceil(max_error * 100) / 100)
for ax, result in zip(axes.flat, RECORD["imageResults"]):
    errors = np.fromfile(OUT / result["errorFile"], dtype="<f8").reshape(HEIGHT, WIDTH)
    picture = ax.imshow(errors, cmap="magma", norm=norm, interpolation="nearest")
    ax.set_title(f"{SAMPLES[result['image']]} · δ = {str(result['delta']).replace('.', ',')}", fontsize=13)
    ax.set_xlabel("Cực đại " + number(result["rawMax"]), fontsize=11)
    ax.set(xticks=[], yticks=[])
    for spine in ax.spines.values():
        spine.set_visible(False)
bar = fig.colorbar(picture, ax=axes, shrink=.83, pad=.02)
bar.set_label("Mức xám trước làm tròn")
save(fig, "ban-do-sai-lech-2d.png")

fig, axes = plt.subplots(1, 2, figsize=(11.6, 4.5), sharey=True, layout="constrained")
fig.suptitle("Mức xám qua biên thẳng trước chặn và làm tròn", fontsize=19, fontweight="bold")
colors = {"linear": AMBER, "cubic": BLUE, "spline": TEAL}
x = np.arange(172, 210)
for i, (ax, profile) in enumerate(zip(axes, RECORD["edgeProfiles"])):
    ax.step(x, np.asarray(profile["reference"])[x], where="mid", color=INK, linewidth=1.6, label="Tham chiếu")
    for method, values in profile["methods"].items():
        ax.plot(x, np.asarray(values["pixels"])[x], color=colors[method], linewidth=1.8, label=METHODS[method])
    ax.set_title(f"Phóng {profile['scale']}× · hàng y = {profile['y']}")
    ax.set_xlabel("Tọa độ x (pixel)")
    ax.grid(axis="y")
    if i == 0:
        ax.set_ylabel("Mức xám")
        ax.legend(frameon=False, loc="center left", fontsize=10)
save(fig, "mat-cat-bien-2x-4x.png")
print("Exported five day 14 figures.")
