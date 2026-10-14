import type { BodyStats } from "./types";

/**
 * Parametric silhouette
 * ---------------------
 * Generates a mannequin-style figure in centimetre coordinates so that two
 * figures rendered in the same SVG are physically comparable: 1 unit = 1 cm.
 *
 * Coordinate system: x = 0 is the body's centre line, y = 0 is the ground and
 * y is NEGATIVE going up (native SVG orientation). Height, limb length and
 * body width are all derived from the person's real stats:
 *
 *   - overall scale        ← height
 *   - arm length           ← wingspan (minus shoulder breadth)
 *   - shoulder/hip/limb width ← BMI-based width factor, with a gender nudge
 *
 * Figures are drawn with a slight, fixed arm abduction so wingspan
 * differences read clearly in overlay comparisons.
 */

export type Primitive =
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; w: number }
  | { type: "path"; d: string };

export interface FigureGeometry {
  primitives: Primitive[];
  /** Total visual half-width in cm (for layout). */
  halfWidth: number;
  heightCm: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const n = (v: number) => Math.round(v * 100) / 100;

export function buildFigure(stats: BodyStats): FigureGeometry {
  const H = stats.heightCm;
  const female = stats.gender === "f";
  const bmi = stats.weightKg / (H / 100) ** 2;
  // 1.0 at BMI 22; sqrt so mass reads as girth, not area explosion.
  const w = clamp(Math.sqrt(bmi / 22), 0.84, 1.34);

  const prims: Primitive[] = [];

  // ── Head & neck ──────────────────────────────────────────────
  const headRy = H * 0.062;
  const headRx = H * 0.046;
  const headCy = -(H - headRy);
  prims.push({ type: "ellipse", cx: 0, cy: n(headCy), rx: n(headRx), ry: n(headRy) });

  const shoulderY = -(H * 0.818);
  prims.push({
    type: "line",
    x1: 0,
    y1: n(-(H - headRy * 2) - 1),
    x2: 0,
    y2: n(shoulderY + 2),
    w: n(H * 0.036 * w),
  });

  // ── Torso ────────────────────────────────────────────────────
  const sh = H * (female ? 0.104 : 0.115) * w; // shoulder half-width
  const wa = sh * (female ? 0.72 : 0.74); // waist half-width
  const hp = sh * (female ? 0.92 : 0.78); // hip half-width
  const ySh = shoulderY;
  const yWa = -(H * 0.585);
  const yHp = -(H * 0.5);
  const chest = female ? 1.0 : 1.04; // slight male chest flare

  const d = [
    `M ${n(-sh)} ${n(ySh)}`,
    // left side: shoulder → waist → hip
    `C ${n(-sh * chest)} ${n(ySh + H * 0.09)} ${n(-wa)} ${n(yWa - H * 0.04)} ${n(-wa)} ${n(yWa)}`,
    `C ${n(-wa)} ${n(yWa + H * 0.03)} ${n(-hp)} ${n(yHp - H * 0.035)} ${n(-hp)} ${n(yHp)}`,
    // bottom: hip → hip with a soft pelvis curve
    `Q 0 ${n(yHp + H * 0.045)} ${n(hp)} ${n(yHp)}`,
    // right side: hip → waist → shoulder
    `C ${n(hp)} ${n(yHp - H * 0.035)} ${n(wa)} ${n(yWa + H * 0.03)} ${n(wa)} ${n(yWa)}`,
    `C ${n(wa)} ${n(yWa - H * 0.04)} ${n(sh * chest)} ${n(ySh + H * 0.09)} ${n(sh)} ${n(ySh)}`,
    // top: shoulder line with a gentle rise to the neck
    `Q 0 ${n(ySh - H * 0.028)} ${n(-sh)} ${n(ySh)}`,
    "Z",
  ].join(" ");
  prims.push({ type: "path", d });

  // ── Arms (length driven by wingspan) ─────────────────────────
  const jointX = sh * 0.9;
  const jointY = ySh + H * 0.012;
  const armLen = Math.max(stats.wingspanCm / 2 - jointX, H * 0.28);
  const upperLen = armLen * 0.46;
  const foreLen = armLen * 0.54;
  const upperW = H * 0.045 * w;
  const foreW = H * 0.035 * w;
  const A1 = (16 * Math.PI) / 180; // upper-arm abduction
  const A2 = (10 * Math.PI) / 180; // forearm angle (slight inward bend)

  for (const side of [-1, 1] as const) {
    const sx = side * jointX;
    const ex = sx + side * Math.sin(A1) * upperLen;
    const ey = jointY + Math.cos(A1) * upperLen;
    // pull the fingertip in by the cap radius so the rounded stroke cap
    // lands exactly on the true fingertip position
    const tipLen = foreLen - foreW / 2;
    const tx = ex + side * Math.sin(A2) * tipLen;
    const ty = ey + Math.cos(A2) * tipLen;
    prims.push({ type: "line", x1: n(sx), y1: n(jointY), x2: n(ex), y2: n(ey), w: n(upperW) });
    prims.push({ type: "line", x1: n(ex), y1: n(ey), x2: n(tx), y2: n(ty), w: n(foreW) });
  }

  // ── Legs & feet ──────────────────────────────────────────────
  const hipJointX = hp * 0.5;
  const kneeY = -(H * 0.275);
  const ankleY = -(H * 0.05);
  const ankleX = H * 0.052;
  const thighW = H * 0.064 * w * (female ? 1.04 : 1);
  const shinW = H * 0.045 * w;

  for (const side of [-1, 1] as const) {
    const hx = side * hipJointX;
    const kx = side * (hipJointX + (ankleX - hipJointX) * 0.55);
    const ax = side * ankleX;
    prims.push({
      type: "line",
      x1: n(hx),
      y1: n(yHp - H * 0.01),
      x2: n(kx),
      y2: n(kneeY),
      w: n(thighW),
    });
    prims.push({ type: "line", x1: n(kx), y1: n(kneeY), x2: n(ax), y2: n(ankleY), w: n(shinW) });
    // foot pointing outward
    const footY = -(H * 0.021);
    prims.push({
      type: "line",
      x1: n(ax),
      y1: n(footY),
      x2: n(ax + side * H * 0.052),
      y2: n(footY),
      w: n(H * 0.042),
    });
  }

  // Include rounded stroke caps in the layout bounds. Without them the
  // longest arms could be clipped by a side-by-side figure's slot.
  const halfWidth =
    Math.max(
      sh * chest,
      ...prims.map((primitive) => {
        if (primitive.type === "line") {
          return Math.max(Math.abs(primitive.x1), Math.abs(primitive.x2)) + primitive.w / 2;
        }
        if (primitive.type === "ellipse") return Math.abs(primitive.cx) + primitive.rx;
        return 0;
      })
    ) + 2;

  return { primitives: prims, halfWidth: n(halfWidth), heightCm: H };
}
