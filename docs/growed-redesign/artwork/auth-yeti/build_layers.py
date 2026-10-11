"""Splits the supplied flattened yeti artwork into aligned animation layers.

    python build_layers.py [--out DIR] [--write] [--preview]

Needs Pillow, NumPy and SciPy. Reads the original PNG (never modified),
writes lossless PNG layers plus yeti-layers.json to --out (default: a temp
dir), and with --write also the WebP derivatives and metadata used by the
app (apps/web/src/shared/assets/auth-scene/yeti). --preview renders the
layers at rest and at the extreme poses the app can reach.

The original head, face, left arm, torso and feet are preserved. The derived
resting-arm source supplies only the relaxed right arm/shoulder, composited
into a single connected standing body. Eye whites, iris edges, eyelid skin
and fur under the moving head are reconstructed for tracking and blinking.
"""

import argparse
import hashlib
import json
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from scipy import sparse
from scipy.sparse.linalg import spsolve

ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / "apps/web/src/shared/assets/auth-scene/original/Cute Waving Yeti Mascot.png"
SOURCE_SHA256 = "a37255d6298053935a5725c786e7f10a6723ae3f7ca7c070087d0015c7b67169"
ASSETS = ROOT / "apps/web/src/shared/assets/auth-scene/yeti"

# --- Rig geometry (source pixels) --------------------------------------------
# Head cut: under the face through the chest fur, from the neck notch on the
# left silhouette to the top of the raised arm's crease.
CUT = [(240, 600), (300, 652), (380, 700), (470, 724), (560, 728), (650, 708),
       (730, 672), (800, 632), (870, 592), (944, 548)]
CUT_BAND = 16  # half-width of the head's feathered lower edge
# Torso fur rebuilt behind the head reaches this far above the cut, more
# than the head's lower edge can travel at its extreme pose.
HEAD_FILL = 70
# Crease where the raised arm meets the torso, top to bottom.
CREASE = [(946, 440), (940, 500), (936, 560), (940, 620), (950, 700),
          (962, 760), (978, 806), (990, 822)]
ARM_FILL = 48  # torso rebuilt this far behind the arm's crease
PIVOTS = {
    "neck": (560, 726),
    "feet": (600, 1210),
}
# Pose limits the app uses (mirrored in mascotMotion.js); the stage frame
# is sized so every part stays inside it at these extremes.
LIMITS = {"head_rotate": 5.0, "head_shift_x": 14, "head_shift_y": 9,
          "lean": 1.7}


def load():
    data = SOURCE.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    if sha != SOURCE_SHA256:
        raise SystemExit(f"source artwork changed ({sha})")
    im = np.asarray(Image.open(SOURCE).convert("RGBA")).astype(np.float64) / 255
    return im[..., :3].copy(), im[..., 3].copy()


def polyline_y(points):
    """y(x) along a polyline given left to right."""
    xs, ys = zip(*points)
    return lambda x: np.interp(x, xs, ys)


def polyline_x(points):
    """x(y) along a polyline given top to bottom."""
    xs, ys = zip(*points)
    return lambda y: np.interp(y, ys, xs)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def luminance(rgb):
    return rgb @ np.array([0.2126, 0.7152, 0.0722])


def saturation(rgb):
    mx, mn = rgb.max(-1), rgb.min(-1)
    return (mx - mn) / np.maximum(mx, 1e-6)


def harmonic_fill(rgb, region, known):
    """Solves Laplace's equation for rgb inside `region` with `known`
    pixels as boundary values (Neumann where neither)."""
    h, w = region.shape
    idx = -np.ones((h, w), int)
    ys, xs = np.nonzero(region)
    idx[ys, xs] = np.arange(len(ys))
    rows, cols, vals = [], [], []
    rhs = np.zeros((len(ys), rgb.shape[-1]))
    for k, (y, x) in enumerate(zip(ys, xs)):
        n = 0
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            yy, xx = y + dy, x + dx
            if not (0 <= yy < h and 0 <= xx < w):
                continue
            if region[yy, xx]:
                rows.append(k)
                cols.append(idx[yy, xx])
                vals.append(-1.0)
                n += 1
            elif known[yy, xx]:
                rhs[k] += rgb[yy, xx]
                n += 1
        rows.append(k)
        cols.append(k)
        vals.append(max(n, 1))
    m = sparse.csr_matrix((vals, (rows, cols)), shape=(len(ys), len(ys)))
    out = rgb.copy()
    sol = spsolve(m.tocsc(), rhs)
    out[ys, xs] = sol.reshape(len(ys), -1)
    return out


# --- Eyes ----------------------------------------------------------------------
def fit_ellipse(points):
    """Least-squares conic fit -> (cx, cy, a, b, theta degrees)."""
    x, y = points[:, 0].astype(float), points[:, 1].astype(float)
    mx, my = x.mean(), y.mean()
    x, y = x - mx, y - my
    d = np.stack([x * x, x * y, y * y, x, y, np.ones_like(x)], 1)
    _, _, vt = np.linalg.svd(d, full_matrices=False)
    a, b, c, dd, e, f = vt[-1]
    m = np.array([[a, b / 2], [b / 2, c]])
    centre = np.linalg.solve(2 * m, [-dd, -e])
    f0 = f + 0.5 * (dd * centre[0] + e * centre[1])
    vals, vecs = np.linalg.eigh(m)
    axes = np.sqrt(-f0 / vals)
    theta = np.degrees(np.arctan2(vecs[1, 0], vecs[0, 0]))
    return dict(cx=centre[0] + mx, cy=centre[1] + my, a=axes[0], b=axes[1], theta=theta)


def ellipse_coords(shape, e):
    """Normalised ellipse coordinates (u, v) of every pixel centre."""
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    t = np.radians(e["theta"])
    dx, dy = xx - e["cx"], yy - e["cy"]
    u = (dx * np.cos(t) + dy * np.sin(t)) / e["a"]
    v = (-dx * np.sin(t) + dy * np.cos(t)) / e["b"]
    return u, v


def ellipse_cover(shape, e, grow=0.0):
    """Antialiased coverage of an ellipse grown by `grow` pixels."""
    u, v = ellipse_coords(shape, e)
    r = np.hypot(u, v)
    scale = (e["a"] + e["b"]) / 2
    return np.clip(0.5 - (r - 1) * scale + grow, 0, 1)


def extract_eye(rgb, alpha, seed, name):
    h, w = alpha.shape
    lum = luminance(rgb)
    sat = saturation(rgb)
    # Face skin (and the eye's darker blue outline): saturated blue.
    skin = (sat > 0.33) & (rgb[..., 0] > 0.24) & (lum > 0.38)
    lab, _ = ndi.label(~skin & (alpha > 0.5))
    opening = ndi.binary_fill_holes(lab == lab[seed[1], seed[0]])
    ys, xs = np.nonzero(opening)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)

    dark = (lum < 0.33) | ((rgb[..., 2] - rgb[..., 0] > 0.22) & (rgb[..., 0] < 0.25))
    lab2, _ = ndi.label(dark & opening)
    iris = ndi.binary_fill_holes(lab2 == lab2[seed[1], seed[0]])
    sclera = opening & ~iris & (lum > 0.55)
    # Iris outline: its boundary against visible white (not the lids).
    inner = ndi.binary_erosion(opening, iterations=3)
    edge = iris & ndi.binary_dilation(sclera, iterations=1) & inner
    pts = np.argwhere(edge)[:, ::-1]
    ell = fit_ellipse(pts)
    print(f"{name}: opening {box}, iris ellipse "
          + ", ".join(f"{k}={v:.1f}" for k, v in ell.items()))
    return dict(opening=opening, iris=iris, sclera=sclera, ellipse=ell, box=box)


def sclera_model(rgb, eye):
    """Fits the white's shading (a lit sphere darkening toward the lids)
    on its visible pixels and evaluates it everywhere in the opening."""
    opening, iris, sclera = eye["opening"], eye["iris"], eye["sclera"]
    ys, xs = np.nonzero(opening)
    cx, cy = xs.mean(), ys.mean()
    rx = (xs.max() - xs.min() + 1) / 2
    ry = (ys.max() - ys.min() + 1) / 2
    h, w = opening.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    u = (xx - cx) / (rx * 1.08)
    v = (yy - cy) / (ry * 1.08)
    nz = np.sqrt(np.clip(1 - u * u - v * v, 0, 1))
    dist = ndi.distance_transform_edt(opening)
    ao = np.exp(-dist / 3.0)
    ao2 = np.exp(-dist / 9.0)
    feats = np.stack([np.ones_like(u), u, v, nz, u * v, ao, ao2], -1)
    near_iris = ndi.binary_dilation(eye["iris"], iterations=3)
    fit = sclera & ~near_iris & (luminance(rgb) < 0.985)
    a = feats[fit]
    coef, *_ = np.linalg.lstsq(a, rgb[fit], rcond=None)
    model = np.clip(feats @ coef, 0, 1)
    resid = rgb[fit] - a @ coef
    print(f"  sclera fit on {fit.sum()} px, rms {np.sqrt((resid ** 2).mean()) * 255:.1f}")
    return model


def build_eye(rgb, alpha, seed, name, tilt):
    eye = extract_eye(rgb, alpha, seed, name)
    h, w = alpha.shape
    ell = eye["ellipse"]
    opening = eye["opening"]
    model = sclera_model(rgb, eye)

    # Mask of the opening (clips the iris): antialiased, a pixel inside the
    # lid line, and a few pixels further in where the iris met the lid, so
    # the lid shading baked into those iris pixels stays in the face layer
    # as part of the lid line instead of travelling with the iris.
    sd = ndi.distance_transform_edt(opening) - ndi.distance_transform_edt(~opening)
    sd = ndi.gaussian_filter(sd, 1.0)
    touch = ndi.binary_dilation(eye["iris"], iterations=2) & (sd < 5)
    inset = 1.0 + 2.5 * np.clip(ndi.gaussian_filter(touch.astype(float), 2.0) * 2.5, 0, 1)
    mask = np.clip(sd - inset + 0.5, 0, 1)

    # Eye white without the iris: the shading model under the iris and its
    # antialiased rim, fading into the original toward the lid line.
    iris_zone = ndi.binary_dilation(eye["iris"], iterations=2).astype(float)
    blend = np.clip(ndi.gaussian_filter(iris_zone, 0.8) * 2, 0, 1) * mask
    white = rgb * (1 - blend[..., None]) + model * blend[..., None]

    # Movable iris: the source where it is cleanly visible; where the lids
    # hid it (or shaded it), continued radially from just inside.
    cover = np.maximum(ellipse_cover((h, w), ell, grow=0.5), eye["iris"])
    visible = eye["iris"] & (mask > 0.999)
    core = ndi.binary_erosion(visible, iterations=3)
    solid = ndi.binary_erosion(eye["iris"], iterations=1) & (mask > 0.999)
    u, v = ellipse_coords((h, w), ell)
    pupil = np.zeros((h, w, 4))
    ys, xs = np.nonzero(cover > 0)
    t = np.radians(ell["theta"])
    for y, x in zip(ys, xs):
        src = (y, x)
        if not solid[y, x]:
            # Walk toward the centre until inside the visible iris core.
            for k in range(1, 80):
                f = 1 - k / 80
                uu, vv = u[y, x] * f, v[y, x] * f
                sx = ell["cx"] + uu * ell["a"] * np.cos(t) - vv * ell["b"] * np.sin(t)
                sy = ell["cy"] + uu * ell["a"] * np.sin(t) + vv * ell["b"] * np.cos(t)
                iy, ix = int(round(sy)), int(round(sx))
                if core[iy, ix]:
                    src = (iy, ix)
                    break
        pupil[y, x, :3] = rgb[src]
        pupil[y, x, 3] = cover[y, x]
    # Wherever the iris shows at rest but isn't plain source (its antialiased
    # rim against the white, the mask's soft edge), the colour that with its
    # coverage reproduces the source exactly over the rebuilt white.
    edge_cover = np.clip(ndi.gaussian_filter(eye["iris"].astype(float), 0.8) * 1.2, 0, 1)
    rim = (iris_zone > 0) & ~solid & (mask > 0)
    ys, xs = np.nonzero(rim)
    a = edge_cover[ys, xs] * mask[ys, xs]
    sol = (rgb[ys, xs] - white[ys, xs] * (1 - a[:, None])) / np.maximum(a, 1e-3)[:, None]
    ok = a > 0.2
    p = np.where(ok[:, None], np.clip(sol, 0, 1), pupil[ys, xs, :3])
    # Where clipping changed the colour, the alpha that best fits it.
    d = (p - white[ys, xs]) * mask[ys, xs, None]
    fit = ((rgb[ys, xs] - white[ys, xs]) * d).sum(-1) / np.maximum((d * d).sum(-1), 1e-4)
    pupil[ys, xs, :3] = p
    pupil[ys, xs, 3] = np.clip(np.where(ok, fit, np.where(mask[ys, xs] < 0.2, cover[ys, xs], 0)), 0, 1)

    # Closed eye: face skin over the opening, its outline and socket shade,
    # filled from the surrounding skin with a soft rounded bulge, its edge
    # feathered wide so it melts into the face.
    patch = ndi.binary_dilation(opening, iterations=12)
    ring = ndi.binary_dilation(patch, iterations=3) & ~patch
    skin = harmonic_fill(rgb, patch, ring)
    ys, xs = np.nonzero(opening)
    ecx, ecy = xs.mean(), ys.mean()
    erx = (xs.max() - xs.min()) / 2 + 10
    ery = (ys.max() - ys.min()) / 2 + 10
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    uu, vv = (xx - ecx) / erx, (yy - ecy) / ery
    bulge = np.clip(1 - uu * uu - vv * vv, 0, 1)
    light = 1 + bulge * (0.015 + 0.04 * (-0.55 * uu - 0.85 * vv))
    skin = np.clip(skin * light[..., None], 0, 1)
    lid_alpha = np.clip(ndi.gaussian_filter(patch.astype(float), 3.5) * 1.35, 0, 1) * patch
    lid_alpha = np.maximum(lid_alpha, ndi.binary_dilation(opening, iterations=5))
    lid = np.concatenate([skin, lid_alpha[..., None]], -1)

    # Lid ellipse: axes along the face's tilt, just containing the opening;
    # the lids sweep inside it, along the face's own vertical.
    ys, xs = np.nonzero(opening)
    cx, cy = xs.mean() + 0.5, ys.mean() + 0.5
    angle = tilt
    t = np.radians(angle)
    lx = (xs + 0.5 - cx) * np.cos(t) + (ys + 0.5 - cy) * np.sin(t)
    ly = -(xs + 0.5 - cx) * np.sin(t) + (ys + 0.5 - cy) * np.cos(t)
    rx, ry = np.abs(lx).max(), np.abs(ly).max()
    scale = np.sqrt(((lx / rx) ** 2 + (ly / ry) ** 2).max())
    rx, ry = rx * scale + 1.5, ry * scale + 1.5
    width, height = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    geometry = dict(
        cx=round(float(cx), 2), cy=round(float(cy), 2),
        rx=round(float(rx), 2), ry=round(float(ry), 2), angle=round(float(angle), 2),
        # Pupil travel: about 15% of the eye's width, a little less upright.
        travel={"x": round(float(width * 0.18), 2), "y": round(float(height * 0.13), 2)},
    )
    return dict(white=white, pupil=pupil, lid=lid, mask=mask, opening=opening,
                ellipse=ell, geometry=geometry, patch=patch)


# --- Layers --------------------------------------------------------------------
def region_masks(alpha, rgb):
    h, w = alpha.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    cut_y = polyline_y(CUT)(xx)
    crease_x = polyline_x(CREASE)(yy)
    above_cut = yy < cut_y
    right_of_crease = (xx > crease_x) & (yy >= CREASE[0][1] - 40) & (yy <= CREASE[-1][1])
    # The ear and hair right of the crease's top belong to the head.
    arm = right_of_crease & ~((yy < 452) & (xx < 946))
    head = above_cut & ~arm & (xx < 960)
    sat = saturation(rgb)
    blue = (sat > 0.28) & (rgb[..., 2] > rgb[..., 0] + 0.16) & (alpha > 0.5)
    # Ears: the blue components left and right of the face.
    lab, _ = ndi.label(blue & ~arm)
    ears = np.zeros_like(alpha, bool)
    for seed in ((250, 520), (890, 390)):
        ears |= lab == lab[seed[1], seed[0]]
    ears = ndi.binary_fill_holes(ears)
    ears = np.clip(ndi.gaussian_filter(ndi.binary_dilation(ears, iterations=10).astype(float), 3) * 1.4, 0, 1)
    return dict(head=head, arm=arm, ears=ears, cut_y=cut_y, crease_x=crease_x, yy=yy, xx=xx)


def build(out, write, preview):
    rgb, alpha = load()
    h, w = alpha.shape
    m = region_masks(alpha, rgb)
    yy, xx, cut_y, crease_x = m["yy"], m["xx"], m["cut_y"], m["crease_x"]

    # The face's tilt: the line through the two eye openings.
    seeds = [(420, 500), (628, 445)]
    centres = [np.argwhere(extract_eye(rgb, alpha, sd, f"eye-{k}")["opening"]).mean(0)[::-1] for k, sd in enumerate(seeds)]
    tilt = float(np.degrees(np.arctan2(*(centres[1] - centres[0])[::-1])))
    print(f"face tilt {tilt:.1f} deg")
    eyes = [build_eye(rgb, alpha, sd, f"eye-{k}", tilt) for k, sd in enumerate(seeds)]
    face = rgb.copy()
    for eye in eyes:
        face = np.where(eye["opening"][..., None], eye["white"], face)

    # Head: everything above the cut, fading out across a band that widens
    # toward the shoulders, where a tilt moves the head's lower edge most;
    # the body keeps its own fur under the whole band.
    band = CUT_BAND + 30 * smoothstep(80, 320, np.abs(xx - PIVOTS["neck"][0]))
    top = cut_y - band
    head_cols = ~m["arm"] & (xx < 960)
    head_soft = np.where(head_cols, 1 - smoothstep(top, cut_y + 10, yy), 0)
    head_a = alpha * head_soft
    # Opaque interior (where layering can't change the rest alpha).
    solid = smoothstep(0.9, 0.98, alpha)

    # Exclude the original raised arm from the standing torso extraction.
    arm_soft = smoothstep(crease_x - 8, crease_x + 12, xx) * m["arm"]
    hand_zone = m["arm"] & (xx > crease_x + 12)

    # Body: the source under the head's band and the arm's feather (opaque
    # interior at full strength, the outline exactly as needed to keep the
    # rest pose), plus torso fur rebuilt where the head and arm can move
    # away from it. The rebuilt fur stays inside the opaque interior, so it
    # never adds an outline, and never reaches up into the ears.
    exact = alpha * (1 - head_soft) / np.maximum(1 - alpha * head_soft, 1e-3)
    exact *= 1 - arm_soft
    exact = exact / np.maximum(1 - alpha * arm_soft * (1 - exact / np.maximum(alpha, 1e-3)), 1e-3)
    keep = np.where(head_cols, smoothstep(top - 14, top, yy), 1) * (1 - smoothstep(crease_x + 6, crease_x + 20, xx) * m["arm"])
    body_a = np.maximum(np.clip(exact, 0, 1) * (1 - arm_soft * (xx > crease_x + 12)), alpha * keep * solid)
    body_rgb = rgb.copy()
    # Behind the head: fur mirrored up from the band below.
    hidden_head = head_cols & (yy < top) & (yy > top - HEAD_FILL)
    src_y = np.where(hidden_head, (2 * top - yy).clip(0, h - 1), yy).astype(int)
    # Behind the arm: torso fur copied (not mirrored, which would double the
    # crease shadow) from further left.
    hidden_arm = m["arm"] & (xx > crease_x + 6) & (xx < crease_x + ARM_FILL) & (yy > 470)
    src_x = np.where(hidden_arm, (xx - ARM_FILL - 30).clip(0, w - 1), xx).astype(int)
    fill = hidden_head | hidden_arm
    body_rgb[fill] = rgb[src_y[fill], src_x[fill]]
    inside = ndi.gaussian_filter(ndi.binary_erosion(alpha > 0.95, iterations=5).astype(float), 1.5)
    inside = np.minimum(inside, alpha)
    fade_top = smoothstep(top - HEAD_FILL, top - HEAD_FILL + 22, yy)
    fade_side = 1 - smoothstep(crease_x + ARM_FILL - 18, crease_x + ARM_FILL, xx)
    fill_a = np.where(hidden_head, inside * fade_top, 0)
    fill_a = np.maximum(fill_a, np.where(hidden_arm, inside * fade_side, 0))
    body_a = np.where(fill, np.maximum(fill_a, body_a * ~hidden_head), body_a)
    # The ears only ever move with the head: nothing of them, or behind
    # them, stays in the body.
    body_a *= np.where(head_cols, 1 - m["ears"], 1)
    # Remove the original raised hand; runtime uses only the relaxed body.
    body_a = np.where(hand_zone, 0, body_a)
    head_a = np.where(hand_zone, 0, head_a)

    # Resting arm derived from the supplied character using image editing.
    # Only the arm at viewer right is consumed. Original head/eyes/feet and
    # torso remain the supplied artwork; the shoulder overlap is hidden by
    # the original torso/mane. Source PNG remains intact alongside original.
    rest_path = SOURCE.parent / "yeti-rest-arm-source.png"
    rest = np.asarray(Image.open(rest_path).convert("RGBA").resize((w, h), Image.Resampling.LANCZOS)).astype(float) / 255
    rest_edge = polyline_x([(906, 600), (921, 710), (903, 840), (882, 980), (909, 1100)])(yy)
    rest_a = rest[..., 3] * smoothstep(rest_edge - 24, rest_edge + 20, xx) * smoothstep(572, 638, yy) * (1 - smoothstep(1080, 1110, yy))
    # Rebuild the exposed shoulder/torso contour from the matching resting
    # art. Remove ALL remnants of the raised thumb/ear, including the narrow
    # strip at the old crease. This contour has no straight rectangular end.
    edge = polyline_x([(940, 450), (949, 545), (973, 650), (983, 745),
                       (974, 835), (946, 925), (933, 1010)])(yy)
    right = smoothstep(crease_x - 70, crease_x - 35, xx) * (1 - smoothstep(980, 1040, yy))
    shoulder_a = rest[..., 3] * (1 - smoothstep(edge - 7, edge + 7, xx))
    shoulder_a *= smoothstep(530, 600, yy)
    body_a = body_a * (1 - right) + shoulder_a * right
    body_rgb = body_rgb * (1 - right[..., None]) + rest[..., :3] * right[..., None]

    for part in (body_a, head_a):
        labels, count = ndi.label(part > 1 / 255)
        sizes = np.bincount(labels.ravel())
        part[(labels != 0) & (sizes[labels] < 700)] = 0

    # Composite the relaxed arm beneath the torso ONCE, offline. Runtime
    # receives one connected body, so no arm swap or shoulder gap is possible.
    standing_a = body_a + rest_a * (1 - body_a)
    standing_rgb = (body_rgb * body_a[..., None] + rest[..., :3] * rest_a[..., None] * (1 - body_a[..., None])) / np.maximum(standing_a[..., None], 1e-6)
    layers = {
        "body": (standing_rgb, standing_a),
        "head": (face, head_a),
    }
    for k, eye in enumerate(eyes):
        layers[f"pupil-{k}"] = (eye["pupil"][..., :3], eye["pupil"][..., 3])
        layers[f"lid-{k}"] = (eye["lid"][..., :3], eye["lid"][..., 3])
        layers[f"opening-{k}"] = (np.ones_like(rgb), eye["mask"])

    out.mkdir(parents=True, exist_ok=True)
    boxes = {}
    for name, (c, a) in layers.items():
        boxes[name] = save_layer(out / f"{name}.png", c, a)

    # Preserve the existing stage framing/layout after removing the arm rig.
    # This includes all head and body tracking extremes with ample padding.
    frame = {"x": 82, "y": -12, "width": 1288, "height": 1239}
    meta = {
        "source": SOURCE.name,
        "sha256": SOURCE_SHA256,
        "canvas": {"width": w, "height": h},
        "frame": frame,
        "pivots": {k: {"x": v[0], "y": v[1]} for k, v in PIVOTS.items()},
        "limits": LIMITS,
        "layers": boxes,
        "eyes": [
            {
                **eye["geometry"],
                "iris": {k: round(float(v), 2) for k, v in eye["ellipse"].items()},
                "pupil": boxes[f"pupil-{k}"],
                "opening": boxes[f"opening-{k}"],
                "lid": boxes[f"lid-{k}"],
            }
            for k, eye in enumerate(eyes)
        ],
    }
    (out / "yeti-layers.json").write_text(json.dumps(meta, indent=2) + "\n")
    print("frame", frame)
    if preview:
        render_previews(out, layers, eyes, rgb, alpha)
    if write:
        encode(out, meta)


def save_layer(path, c, a):
    a = np.clip(a, 0, 1)
    ys, xs = np.nonzero(a > 1 / 255)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    px = np.concatenate([np.clip(c, 0, 1), a[..., None]], -1)[y0:y1, x0:x1]
    Image.fromarray(np.round(px * 255).astype(np.uint8), "RGBA").save(path)
    return {"x": int(x0), "y": int(y0), "width": int(x1 - x0), "height": int(y1 - y0)}


# --- Pose preview ---------------------------------------------------------------
def affine(px, matrix, shape):
    """Warps a premultiplied RGBA float image by a 3x3 matrix (dst<-src)."""
    inv = np.linalg.inv(matrix)
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    sx = inv[0, 0] * xx + inv[0, 1] * yy + inv[0, 2]
    sy = inv[1, 0] * xx + inv[1, 1] * yy + inv[1, 2]
    return np.stack([ndi.map_coordinates(px[..., c], [sy, sx], order=1, mode="constant")
                     for c in range(4)], -1)


def rot(deg, p):
    t = np.radians(deg)
    c, s = np.cos(t), np.sin(t)
    x, y = p
    return np.array([[c, -s, x - c * x + s * y], [s, c, y - s * x - c * y], [0, 0, 1]])


def tr(dx, dy):
    return np.array([[1, 0, dx], [0, 1, dy], [0, 0, 1.0]])


def pose_matrices(pose):
    lean = np.radians(pose.get("lean", 0))
    fx, fy = PIVOTS["feet"]
    k = np.tan(lean)
    body = np.array([[1, -k, k * fy], [0, 1, 0], [0, 0, 1.0]])
    carried = lambda p: k * (fy - p[1])  # noqa: E731
    head = tr(carried(PIVOTS["neck"]) + pose.get("hx", 0), pose.get("hy", 0)) @ rot(pose.get("head", 0), PIVOTS["neck"])
    return {"body": body, "head": head}



def composite(layers, eyes, pose, shape=None):
    h, w = layers["body"][1].shape
    mats = pose_matrices(pose)
    out = np.zeros((h, w, 4))

    def over(px):
        nonlocal out
        out = px + out * (1 - px[..., 3:4])

    def pm(c, a):
        return np.concatenate([c * a[..., None], a[..., None]], -1)

    for name in ("body", "head"):
        c, a = layers[name]
        px = pm(c, a)
        if pose:
            px = affine(px, mats[name], (h, w))
        if name == "head":
            for k, eye in enumerate(eyes):
                pc, pa = layers[f"pupil-{k}"]
                pupil = pm(pc, pa * layers[f"opening-{k}"][1])
                if pose:
                    pupil = affine(pupil, mats["head"], (h, w))
                px = pupil + px * (1 - pupil[..., 3:4])
        over(px)
    return out


def render_previews(out, layers, eyes, rgb, alpha):
    sky = np.array([0.67, 0.79, 0.91])
    lim = LIMITS
    poses = {"rest": {}}
    for sx in (-1, 1):
        for sy in (-1, 1):
            poses[f"gaze-{sx}-{sy}"] = dict(lean=sx * lim["lean"], head=sx * lim["head_rotate"], hx=sx * lim["head_shift_x"], hy=sy * lim["head_shift_y"])
    for name, pose in poses.items():
        comp = composite(layers, eyes, pose)
        img = comp[..., :3] + sky * (1 - comp[..., 3:4])
        Image.fromarray(np.round(np.clip(img, 0, 1) * 255).astype(np.uint8)).save(out / f"pose-{name}.png")
    src = rgb * alpha[..., None] + sky * (1 - alpha[..., None])
    Image.fromarray(np.round(src * 255).astype(np.uint8)).save(out / "pose-source.png")


def encode(out, meta):
    ASSETS.mkdir(parents=True, exist_ok=True)
    for old in ASSETS.glob("*.webp"):
        old.unlink()
    for name in meta["layers"]:
        im = Image.open(out / f"{name}.png")
        small = name.startswith(("pupil", "lid", "opening"))
        im.save(ASSETS / f"{name}.webp", "WEBP", quality=96 if small else 90, method=6, alpha_quality=100)
        print(f"{name}.webp", (ASSETS / f"{name}.webp").stat().st_size)
    (ASSETS / "yeti-layers.json").write_text((out / "yeti-layers.json").read_text())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=Path(tempfile.gettempdir()) / "auth-yeti-layers")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--preview", action="store_true")
    args = parser.parse_args()
    build(args.out, args.write, args.preview)
