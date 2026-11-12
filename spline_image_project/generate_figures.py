"""Render the recorded data and verify Thomas against a dense direct solve."""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib import font_manager


ROOT = Path(__file__).resolve().parent
RESULTS = ROOT / "results"
DATA = json.loads((RESULTS / "results.json").read_text(encoding="utf-8"))
WIDTH, HEIGHT = DATA["config"]["referenceDimensions"]
if Path("C:/Windows/Fonts/arial.ttf").exists():
    font_manager.fontManager.addfont("C:/Windows/Fonts/arial.ttf")
    plt.rcParams["font.family"] = "Arial"

plt.rcParams.update({
    "font.size": 11,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.labelcolor": "#243a54",
    "text.color": "#142a43",
    "axes.edgecolor": "#93a5b9",
    "grid.color": "#dce5ed",
    "savefig.dpi": 165,
})
COLORS = {"linear": "#a45a28", "cubic": "#2360a5", "spline": "#007b72"}
LABELS = {"linear": "Song tuyến tính", "cubic": "Bicubic Keys", "spline": "Spline tự nhiên"}


def save(fig, filename):
    fig.savefig(RESULTS / filename, bbox_inches="tight", facecolor="white")
    plt.close(fig)


validation = []
for case in DATA["solver"]:
    b = np.array(case["rhs"], dtype=np.float64)
    a = np.diag(np.full(len(b), 4.0))
    a += np.diag(np.ones(len(b) - 1), 1) + np.diag(np.ones(len(b) - 1), -1)
    reference = np.linalg.solve(a, b)
    thomas_gap = float(np.max(np.abs(reference - case["direct"])))
    final_gap = float(np.max(np.abs(reference - case["iterative"])))
    assert thomas_gap < 1e-12, (case["name"], thomas_gap)
    assert case["residual"] <= DATA["config"]["toleranceAbsoluteInfinity"]
    assert final_gap <= case["residual"] / 2 + 1e-12
    validation.append({
        "case": case["name"], "denseReference": "numpy.linalg.solve",
        "thomasMaxAbsDifference": thomas_gap, "gaussSeidelMaxAbsDifference": final_gap,
    })
(RESULTS / "doi-chieu-doc-lap.json").write_text(
    json.dumps(validation, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
)

fig, ax = plt.subplots(figsize=(8.8, 4.4), layout="constrained")
for case, label, color, marker in [
    (DATA["solver"][0], "Biên thẳng", "#2360a5", "o"),
    (DATA["solver"][1], "Hoa văn", "#007b72", "s"),
]:
    label += f" · {case['sweeps']} vòng"
    ax.semilogy([step["sweep"] for step in case["history"]],
                [step["residual"] for step in case["history"]],
                color=color, linewidth=2, marker=marker, markersize=4, markevery=3, label=label)
ax.axhline(DATA["config"]["toleranceAbsoluteInfinity"], color="#a45a28",
           linestyle="--", linewidth=1.5, label=r"Ngưỡng tuyệt đối $10^{-8}$")
ax.set(title="Phần dư Gauss–Seidel theo số vòng",
       xlabel="Số vòng quét từ trái sang phải", ylabel="Chuẩn vô cùng của phần dư")
ax.grid(axis="y", which="major")
ax.legend(frameon=False, loc="upper right")
save(fig, "hoi-tu-gauss-seidel.png")

fig, ax = plt.subplots(figsize=(8.8, 4.4), layout="constrained")
edge = DATA["sampleProfiles"]["edge"]
x = np.arange(172, 210)
ax.step(x, np.asarray(edge["reference"])[x], where="mid", label="Tham chiếu", color="#162c43", linewidth=1.7)
for method, values in edge["methods"].items():
    ax.plot(x, np.asarray(values)[x], label=LABELS[method], color=COLORS[method], linewidth=1.9)
ax.set(title=f"Mặt cắt qua biên ở hàng y = {edge['y']} khi phóng 4×",
       xlabel="Tọa độ x trên lưới đầu ra (px)", ylabel="Mức xám trước chặn và làm tròn")
ax.grid(axis="y")
ax.legend(frameon=False, loc="center left")
save(fig, "mat-cat-bien.png")

fig, axes = plt.subplots(2, 4, figsize=(12.2, 5.7), layout="constrained")
fig.suptitle("Vùng ảnh đối chiếu ở mức phóng 4×", fontsize=17, fontweight="bold")
for i, (kind, crop, row_name) in enumerate([
    ("edge", (slice(45, 150), slice(146, 251)), "Biên tương phản"),
    ("texture", (slice(56, 161), slice(136, 241)), "Hoa văn"),
]):
    for j, method in enumerate(("original", "linear", "cubic", "spline")):
        suffix = "original" if method == "original" else f"{method}-4x"
        pixels = np.fromfile(RESULTS / "profiles" / f"{kind}-{suffix}.gray8", dtype=np.uint8)
        ax = axes[i, j]
        ax.imshow(pixels.reshape(HEIGHT, WIDTH)[crop], cmap="gray", vmin=0, vmax=255, interpolation="nearest")
        ax.set_title("Tham chiếu" if method == "original" else LABELS[method])
        ax.set(xticks=[], yticks=[])
        for spine in ax.spines.values():
            spine.set_visible(False)
        if j == 0:
            ax.set_ylabel(row_name)
save(fig, "so-sanh-anh-4x.png")
print(json.dumps({"verified": validation, "figures": 3}, ensure_ascii=True))
