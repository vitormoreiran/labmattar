// A contour with no counterpart must begin/end with zero area. Reusing the
// outer contour for an emerging hole punches a large spurious opening.
export function collapseUnpairedChannels(matrix) {
  const center = (points) =>
    points.reduce((p, q) => ({ x: p.x + q.x / points.length, y: p.y + q.y / points.length }), {
      x: 0,
      y: 0,
    });
  for (let i = 0; i < matrix.a.length; i++) {
    if (matrix.sourceIndices?.[i] === null) {
      const c = center(matrix.b[i]);
      matrix.a[i] = matrix.b[i].map(() => ({ ...c }));
    }
    if (matrix.targetIndices?.[i] === null) {
      const c = center(matrix.a[i]);
      matrix.b[i] = matrix.a[i].map(() => ({ ...c }));
    }
  }
  return matrix;
}
