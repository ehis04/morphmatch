import type { FigureGeometry } from "@/lib/silhouette";

interface SilhouetteProps {
  figure: FigureGeometry;
  color: string;
  /** Applied at group level so overlapping limbs don't double-darken. */
  opacity?: number;
  transform?: string;
  blend?: boolean;
}

/**
 * Renders a FigureGeometry inside an existing <svg>. Coordinates are in cm:
 * the figure stands on y = 0 and extends upward in negative y.
 */
export function Silhouette({
  figure,
  color,
  opacity = 1,
  transform,
  blend = false,
}: SilhouetteProps) {
  return (
    <g
      transform={transform}
      opacity={opacity}
      style={blend ? { mixBlendMode: "multiply" } : undefined}
    >
      {figure.primitives.map((p, i) => {
        if (p.type === "ellipse") {
          return <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} fill={color} />;
        }
        if (p.type === "path") {
          return <path key={i} d={p.d} fill={color} />;
        }
        return (
          <line
            key={i}
            x1={p.x1}
            y1={p.y1}
            x2={p.x2}
            y2={p.y2}
            stroke={color}
            strokeWidth={p.w}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}
