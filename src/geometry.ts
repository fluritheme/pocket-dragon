export interface Point {
  x: number;
  y: number;
}
export interface Quad {
  p1: Point;
  p2: Point;
  p3: Point;
  p4: Point;
}
/** Recover an element's painted 2D border box without changing host styles.
 * Translation and transform-origin are recovered from its bounding rectangle;
 * only the linear affine part needs composing through the ancestor chain. */
export function paintedQuad(
  element: HTMLElement,
  width = element.offsetWidth,
  height = element.offsetHeight,
): Quad {
  const quadElement = element as HTMLElement & { getBoxQuads?: () => Quad[] };
  const native = quadElement.getBoxQuads?.()[0];
  if (native) return native;
  let matrix = new DOMMatrix();
  for (let e: HTMLElement | null = element; e; e = e.parentElement) {
    const style = getComputedStyle(e);
    let local =
      style.transform === "none"
        ? new DOMMatrix()
        : new DOMMatrix(style.transform);
    if (style.scale && style.scale !== "none") {
      const parts = style.scale.split(/\s+/).map(Number);
      local = new DOMMatrix()
        .scale(parts[0] ?? 1, parts[1] ?? parts[0] ?? 1)
        .multiply(local);
    }
    if (style.rotate && style.rotate !== "none") {
      const value = style.rotate.trim();
      const angle = parseFloat(value);
      const degrees = value.endsWith("rad")
        ? (angle * 180) / Math.PI
        : value.endsWith("turn")
          ? angle * 360
          : angle;
      if (Number.isFinite(degrees))
        local = new DOMMatrix().rotate(degrees).multiply(local);
    }
    matrix = new DOMMatrix([local.a, local.b, local.c, local.d, 0, 0]).multiply(
      matrix,
    );
  }
  const raw = [
    { x: 0, y: 0 },
    { x: matrix.a * width, y: matrix.b * width },
    {
      x: matrix.a * width + matrix.c * height,
      y: matrix.b * width + matrix.d * height,
    },
    { x: matrix.c * height, y: matrix.d * height },
  ];
  const r = element.getBoundingClientRect(),
    ox = r.left - Math.min(...raw.map((p) => p.x)),
    oy = r.top - Math.min(...raw.map((p) => p.y));
  const points = raw.map((p) => ({ x: p.x + ox, y: p.y + oy }));
  return { p1: points[0]!, p2: points[1]!, p3: points[2]!, p4: points[3]! };
}
export function toLocal(
  point: Point,
  quad: Quad,
  width: number,
  height: number,
): Point {
  const a = (quad.p2.x - quad.p1.x) / width,
    b = (quad.p2.y - quad.p1.y) / width,
    c = (quad.p4.x - quad.p1.x) / height,
    d = (quad.p4.y - quad.p1.y) / height,
    det = a * d - b * c;
  if (Math.abs(det) < 1e-9) return { x: 0, y: 0 };
  const x = point.x - quad.p1.x,
    y = point.y - quad.p1.y;
  return { x: (d * x - c * y) / det, y: (a * y - b * x) / det };
}
