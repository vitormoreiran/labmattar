type Point = { x: number; y: number; corner?: boolean };
type VectorAsset = {
  name: string;
  contours: string[];
  viewBox: string;
  sourceCount: number;
  components?: number[];
  holes?: boolean[];
};
type PathBox = { x: number; y: number; width: number; height: number };
type NativePathChannel = {
  parts: string[];
  a: number[];
  b: number[];
  boxA?: PathBox;
  boxB?: PathBox;
};
type TransitionMatrix = {
  a: Point[][];
  mid?: Point[][];
  b: Point[][];
  allocation: number[];
  semantic?: boolean;
  groupsA?: number[];
  groupsB?: number[];
  holesA?: boolean[];
  holesB?: boolean[];
  absorbing?: boolean[];
  renderGroups?: number[];
  direction?: "merge" | "split" | "pair";
  sourceIndices?: (number | null)[];
  targetIndices?: (number | null)[];
  nativeChannels?: boolean[];
  nativePaths?: (NativePathChannel | null)[];
};
type ScaleMode = "bounds" | "viewBox" | "raw";
const numberPattern = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;
type MorphEngine = (typeof import("gsap/MorphSVGPlugin"))["MorphSVGPlugin"];
let morphEngine: MorphEngine | null = null,
  morphEnginePromise: Promise<MorphEngine> | null = null;
function loadMorphEngine() {
  return morphEngine
    ? Promise.resolve(morphEngine)
    : (morphEnginePromise ??= import("gsap/MorphSVGPlugin").then(
        (module) => (morphEngine = module.MorphSVGPlugin),
      ));
}

function safeTangent(before: Point, current: Point, after: Point) {
  if (current.corner) return { x: 0, y: 0 };
  const x = after.x - before.x,
    y = after.y - before.y,
    length = Math.hypot(x, y),
    beforeLength = Math.hypot(current.x - before.x, current.y - before.y),
    afterLength = Math.hypot(after.x - current.x, after.y - current.y);
  if (length < 1e-6 || beforeLength < 1e-6 || afterLength < 1e-6) return { x: 0, y: 0 };
  const harmonic = (2 * beforeLength * afterLength) / (beforeLength + afterLength),
    magnitude = Math.min(harmonic * 0.92, Math.min(beforeLength, afterLength) * 1.35);
  return { x: (x / length) * magnitude, y: (y / length) * magnitude };
}

function pointsPath(contours: Point[][]) {
  return contours
    .map((points) => {
      if (points.length < 3)
        return (
          points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ") +
          " Z"
        );
      let d = `M${points[0].x.toFixed(3)},${points[0].y.toFixed(3)}`;
      for (let i = 0; i < points.length; i++) {
        const p0 = points[(i - 1 + points.length) % points.length],
          p1 = points[i],
          p2 = points[(i + 1) % points.length],
          p3 = points[(i + 2) % points.length];
        const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (chord < 0.001) {
          d += ` L${p2.x.toFixed(3)},${p2.y.toFixed(3)}`;
          continue;
        }
        const t1 = safeTangent(p0, p1, p2),
          t2 = safeTangent(p1, p2, p3),
          c1 = { x: p1.x + t1.x / 3, y: p1.y + t1.y / 3 },
          c2 = { x: p2.x - t2.x / 3, y: p2.y - t2.y / 3 };
        d += ` C${c1.x.toFixed(3)},${c1.y.toFixed(3)} ${c2.x.toFixed(3)},${c2.y.toFixed(3)} ${p2.x.toFixed(3)},${p2.y.toFixed(3)}`;
      }
      return d + " Z";
    })
    .join(" ");
}

function pathMetrics(d: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  svg.style.cssText = "position:fixed;left:-10000px;top:-10000px";
  path.setAttribute("d", d);
  svg.appendChild(path);
  document.body.appendChild(svg);
  return { path, length: path.getTotalLength(), dispose: () => svg.remove() };
}

function sampleContour(d: string, count: number): Point[] {
  const metric = pathMetrics(d);
  try {
    return Array.from({ length: count }, (_, i) => {
      const p = metric.path.getPointAtLength((metric.length * i) / count);
      return { x: p.x, y: p.y };
    });
  } finally {
    metric.dispose();
  }
}
type CubicSegment = { p0: Point; c1: Point; c2: Point; p1: Point };
function cubicSegments(d: string): CubicSegment[] | null {
  const values = (d.match(numberPattern) || []).map(Number);
  if (values.length < 8 || (values.length - 2) % 6 !== 0 || !/^\s*M/i.test(d) || !/[Cc]/.test(d))
    return null;
  const segments: CubicSegment[] = [];
  let p0 = { x: values[0], y: values[1] };
  for (let index = 2; index < values.length; index += 6) {
    const segment = {
      p0,
      c1: { x: values[index], y: values[index + 1] },
      c2: { x: values[index + 2], y: values[index + 3] },
      p1: { x: values[index + 4], y: values[index + 5] },
    };
    segments.push(segment);
    p0 = segment.p1;
  }
  return segments;
}
function cubicPoint(segment: CubicSegment, t: number): Point {
  const u = 1 - t,
    uu = u * u,
    tt = t * t;
  return {
    x:
      uu * u * segment.p0.x +
      3 * uu * t * segment.c1.x +
      3 * u * tt * segment.c2.x +
      tt * t * segment.p1.x,
    y:
      uu * u * segment.p0.y +
      3 * uu * t * segment.c1.y +
      3 * u * tt * segment.c2.y +
      tt * t * segment.p1.y,
  };
}
function cubicLength(segment: CubicSegment) {
  let length = 0,
    before = segment.p0;
  for (let index = 1; index <= 12; index++) {
    const point = cubicPoint(segment, index / 12);
    length += Math.hypot(point.x - before.x, point.y - before.y);
    before = point;
  }
  return length;
}
function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function splitCubic(segment: CubicSegment, t: number): [CubicSegment, CubicSegment] {
  const p01 = lerpPoint(segment.p0, segment.c1, t),
    p12 = lerpPoint(segment.c1, segment.c2, t),
    p23 = lerpPoint(segment.c2, segment.p1, t),
    p012 = lerpPoint(p01, p12, t),
    p123 = lerpPoint(p12, p23, t),
    pivot = lerpPoint(p012, p123, t);
  return [
    { p0: segment.p0, c1: p01, c2: p012, p1: pivot },
    { p0: pivot, c1: p123, c2: p23, p1: segment.p1 },
  ];
}
function subdivideCubic(segment: CubicSegment, parts: number) {
  if (parts <= 1) return [segment];
  const result: CubicSegment[] = [];
  let remaining = segment;
  for (let index = parts; index > 1; index--) {
    const [head, tail] = splitCubic(remaining, 1 / index);
    result.push(head);
    remaining = tail;
  }
  result.push(remaining);
  return result;
}
function allocateCubicSubdivisions(lengths: number[], total: number) {
  const count = Math.max(lengths.length, total),
    result = lengths.map(() => 1),
    remaining = count - lengths.length,
    sum = lengths.reduce((value, length) => value + length, 0) || 1,
    exact = lengths.map((length) => (remaining * length) / sum),
    base = exact.map(Math.floor);
  base.forEach((value, index) => (result[index] += value));
  let missing = remaining - base.reduce((value, item) => value + item, 0);
  exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
    .slice(0, missing)
    .forEach((item) => {
      result[item.index]++;
      missing--;
    });
  return result;
}
function exactSubdividedPath(d: string, totalSegments: number) {
  const segments = cubicSegments(d);
  if (!segments?.length) return null;
  const allocation = allocateCubicSubdivisions(segments.map(cubicLength), totalSegments),
    expanded = segments.flatMap((segment, index) => subdivideCubic(segment, allocation[index]));
  let path = `M${expanded[0].p0.x},${expanded[0].p0.y}`;
  for (const segment of expanded)
    path += ` C${segment.c1.x},${segment.c1.y} ${segment.c2.x},${segment.c2.y} ${segment.p1.x},${segment.p1.y}`;
  return path + " z";
}
function segmentCorner(segments: CubicSegment[], index: number) {
  const previous = segments[(index - 1 + segments.length) % segments.length],
    current = segments[index],
    point = current.p0;
  let incoming = { x: point.x - previous.c2.x, y: point.y - previous.c2.y },
    outgoing = { x: current.c1.x - point.x, y: current.c1.y - point.y };
  let incomingLength = Math.hypot(incoming.x, incoming.y),
    outgoingLength = Math.hypot(outgoing.x, outgoing.y);
  if (incomingLength < 1e-5) {
    incoming = { x: point.x - previous.p0.x, y: point.y - previous.p0.y };
    incomingLength = Math.hypot(incoming.x, incoming.y);
  }
  if (outgoingLength < 1e-5) {
    outgoing = { x: current.p1.x - point.x, y: current.p1.y - point.y };
    outgoingLength = Math.hypot(outgoing.x, outgoing.y);
  }
  if (incomingLength < 1e-5 || outgoingLength < 1e-5) return false;
  const alignment =
    (incoming.x * outgoing.x + incoming.y * outgoing.y) / (incomingLength * outgoingLength);
  return alignment < 0.965;
}
function localPathNumbers(d: string, box: PathBox) {
  return (d.match(numberPattern) || []).map((value, index) =>
    index % 2 === 0 ? (Number(value) - box.x) / box.width : (Number(value) - box.y) / box.height,
  );
}
function orderedNativeStrings(
  sourceD: string,
  targetD: string,
  sourceBox: PathBox,
  targetBox: PathBox,
) {
  if (!morphEngine) return [sourceD, targetD] as [string, string];
  let baseline: [string, string];
  try {
    baseline = morphEngine.normalizeStrings(sourceD, targetD, {
      shapeIndex: 0,
      map: "complexity",
    }) as [string, string];
  } catch {
    return [sourceD, targetD];
  }
  const segmentCount = Math.max(
    1,
    Math.round(((baseline[0].match(numberPattern) || []).length - 2) / 6),
  );
  let best = baseline,
    bestScore = Infinity;
  for (let shift = 0; shift < segmentCount; shift++) {
    try {
      const candidate = morphEngine.normalizeStrings(sourceD, targetD, {
          shapeIndex: shift,
          map: "complexity",
        }) as [string, string],
        a = localPathNumbers(candidate[0], sourceBox),
        b = localPathNumbers(candidate[1], targetBox);
      if (a.length !== b.length) continue;
      let score = 0;
      for (let index = 0; index < a.length; index++) {
        const delta = a[index] - b[index],
          anchorWeight = index % 6 < 2 ? 3 : 1;
        score += delta * delta * anchorWeight;
      }
      score /= Math.max(1, a.length);
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    } catch {
      /* ignora apenas esta rotação; nunca inverte o contorno */
    }
  }
  return best;
}
function cubicPath(segments: CubicSegment[]) {
  if (!segments.length) return "";
  let path = `M${segments[0].p0.x},${segments[0].p0.y}`;
  for (const segment of segments)
    path += ` C${segment.c1.x},${segment.c1.y} ${segment.c2.x},${segment.c2.y} ${segment.p1.x},${segment.p1.y}`;
  return path + " z";
}
function zeroCubic(point: Point): CubicSegment {
  return { p0: point, c1: point, c2: point, p1: point };
}
function terminalRPathChannel(
  sourceD: string,
  targetD: string,
  normalizeA: (point: Point) => Point,
  normalizeB: (point: Point) => Point,
  sourceBox: PathBox,
  targetBox: PathBox,
) {
  const [orderedSource, orderedTarget] = orderedNativeStrings(
      sourceD,
      targetD,
      sourceBox,
      targetBox,
    ),
    sourceSegments = cubicSegments(orderedSource),
    targetSegments = cubicSegments(orderedTarget);
  if (!sourceSegments || !targetSegments || sourceSegments.length !== targetSegments.length)
    return nativePathChannel(
      orderedSource,
      orderedTarget,
      normalizeA,
      normalizeB,
      sourceBox,
      targetBox,
    );
  const legEdges = (segments: CubicSegment[], box: PathBox) =>
    segments
      .map((segment, index) => {
        const a = { x: (segment.p0.x - box.x) / box.width, y: (segment.p0.y - box.y) / box.height },
          b = { x: (segment.p1.x - box.x) / box.width, y: (segment.p1.y - box.y) / box.height };
        return { index, a, b };
      })
      .filter(
        ({ a, b }) =>
          Math.max(a.x, b.x) > 0.92 &&
          Math.min(a.x, b.x) < 0.48 &&
          Math.min(a.y, b.y) > 0.52 &&
          Math.abs(a.x - b.x) > 0.35 &&
          Math.abs(a.y - b.y) > 0.045,
      )
      .map((item) => item.index);
  const sourceLeg = legEdges(sourceSegments, sourceBox),
    targetLeg = legEdges(targetSegments, targetBox),
    offset = (targetLeg[0] ?? 0) - (sourceLeg[0] ?? 0);
  if (offset !== 1 || sourceLeg.length !== 2 || targetLeg.length !== 2)
    return nativePathChannel(
      orderedSource,
      orderedTarget,
      normalizeA,
      normalizeB,
      sourceBox,
      targetBox,
    );
  const source = [...sourceSegments],
    target = [...targetSegments],
    sourceJoin = source[sourceLeg[0]].p0,
    targetClose = target[target.length - 1].p1;
  source.splice(sourceLeg[0], 0, zeroCubic(sourceJoin));
  target.push(zeroCubic(targetClose));
  return nativePathChannel(
    cubicPath(source),
    cubicPath(target),
    normalizeA,
    normalizeB,
    sourceBox,
    targetBox,
  );
}
function rotateCubics(segments: CubicSegment[], index: number) {
  return [...segments.slice(index), ...segments.slice(0, index)];
}
function topRightStart(segments: CubicSegment[]) {
  const points = segments.map((segment, index) => ({ index, point: segment.p0 })),
    minY = Math.min(...points.map((item) => item.point.y)),
    maxY = Math.max(...points.map((item) => item.point.y)),
    band = minY + (maxY - minY) * 0.04;
  return (
    points.filter((item) => item.point.y <= band).sort((a, b) => b.point.x - a.point.x)[0]?.index ??
    0
  );
}
function cubicParameterAtLength(segment: CubicSegment, distance: number) {
  const total = cubicLength(segment);
  if (distance <= 0) return 0;
  if (distance >= total) return 1;
  let low = 0,
    high = 1;
  for (let index = 0; index < 18; index++) {
    const middle = (low + high) / 2,
      [head] = splitCubic(segment, middle);
    if (cubicLength(head) < distance) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}
function splitCubicRegionAtFractions(segments: CubicSegment[], fractions: number[]) {
  const lengths = segments.map(cubicLength),
    total = lengths.reduce((sum, value) => sum + value, 0) || 1,
    boundaries = fractions
      .filter((value) => value > 1e-6 && value < 1 - 1e-6)
      .map((value) => value * total),
    result: CubicSegment[] = [];
  let cursor = 0;
  segments.forEach((segment, index) => {
    const length = lengths[index],
      local = boundaries
        .filter((distance) => distance > cursor + 1e-6 && distance < cursor + length - 1e-6)
        .map((distance) => cubicParameterAtLength(segment, distance - cursor));
    let remaining = segment,
      previous = 0;
    for (const parameter of local) {
      const relative = (parameter - previous) / (1 - previous),
        [head, tail] = splitCubic(remaining, relative);
      result.push(head);
      remaining = tail;
      previous = parameter;
    }
    result.push(remaining);
    cursor += length;
  });
  return result;
}
function matchedCubicRegions(source: CubicSegment[], target: CubicSegment[]) {
  if (!source.length || !target.length) return null;
  const boundaryFractions = (segments: CubicSegment[]) => {
      const lengths = segments.map(cubicLength),
        total = lengths.reduce((sum, value) => sum + value, 0) || 1;
      let cursor = 0;
      return lengths.slice(0, -1).map((length) => (cursor += length) / total);
    },
    uniformCount = Math.max(source.length, target.length) * 2;
  const fractions = [
      ...boundaryFractions(source),
      ...boundaryFractions(target),
      ...Array.from(
        { length: Math.max(0, uniformCount - 1) },
        (_, index) => (index + 1) / uniformCount,
      ),
    ]
      .sort((a, b) => a - b)
      .filter((value, index, items) => index === 0 || Math.abs(value - items[index - 1]) > 1e-5),
    alignedSource = splitCubicRegionAtFractions(source, fractions),
    alignedTarget = splitCubicRegionAtFractions(target, fractions);
  return alignedSource.length === alignedTarget.length
    ? ([alignedSource, alignedTarget] as const)
    : null;
}
function structuralMPathChannel(
  sourceD: string,
  targetD: string,
  normalizeA: (point: Point) => Point,
  normalizeB: (point: Point) => Point,
  sourceBox: PathBox,
  targetBox: PathBox,
) {
  const rawSource = cubicSegments(sourceD),
    rawTarget = cubicSegments(targetD);
  if (!rawSource || !rawTarget) return null;
  const targetScale = Math.hypot(targetBox.width, targetBox.height),
    targetClean = rawTarget.filter((segment) => cubicLength(segment) > targetScale * 1e-5),
    source = rotateCubics(rawSource, topRightStart(rawSource)),
    target = rotateCubics(targetClean, topRightStart(targetClean));
  const sourceRegions = [4, 2, 4, 3, 2, 12, 2, 3],
    targetRegions = [3, 1, 3, 1, 2, 4, 1, 1];
  if (
    source.length !== sourceRegions.reduce((sum, value) => sum + value, 0) ||
    target.length !== targetRegions.reduce((sum, value) => sum + value, 0)
  )
    return null;
  const alignedSource: CubicSegment[] = [],
    alignedTarget: CubicSegment[] = [];
  let sourceCursor = 0,
    targetCursor = 0;
  for (let region = 0; region < sourceRegions.length; region++) {
    const sourceCount = sourceRegions[region],
      targetCount = targetRegions[region],
      matched = matchedCubicRegions(
        source.slice(sourceCursor, sourceCursor + sourceCount),
        target.slice(targetCursor, targetCursor + targetCount),
      );
    if (!matched) return null;
    alignedSource.push(...matched[0]);
    alignedTarget.push(...matched[1]);
    sourceCursor += sourceCount;
    targetCursor += targetCount;
  }
  if (
    sourceCursor !== source.length ||
    targetCursor !== target.length ||
    alignedSource.length !== alignedTarget.length
  )
    return null;
  return nativePathChannel(
    cubicPath(alignedSource),
    cubicPath(alignedTarget),
    normalizeA,
    normalizeB,
    sourceBox,
    targetBox,
  );
}
function samplePairedContours(
  sourceD: string,
  targetD: string,
  count: number,
  normalizeTopology = false,
  sourceBox?: PathBox,
  targetBox?: PathBox,
  preserveNativeTemplate = false,
) {
  const nativeTemplate =
    sourceD.replace(numberPattern, "#") === targetD.replace(numberPattern, "#");
  if (normalizeTopology && sourceBox && targetBox && !(preserveNativeTemplate && nativeTemplate))
    [sourceD, targetD] = orderedNativeStrings(sourceD, targetD, sourceBox, targetBox);
  else if (normalizeTopology && !nativeTemplate && morphEngine) {
    try {
      [sourceD, targetD] = morphEngine.normalizeStrings(sourceD, targetD, {
        shapeIndex: "auto",
        map: "complexity",
      });
    } catch {
      /* mantém os paths autorais */
    }
  }
  const sourceSegments = cubicSegments(sourceD),
    targetSegments = cubicSegments(targetD);
  if (!sourceSegments || !targetSegments || sourceSegments.length !== targetSegments.length)
    return null;
  const weights = sourceSegments.map((segment, index) =>
      Math.max(cubicLength(segment), cubicLength(targetSegments[index])),
    ),
    perSegment = allocatePoints(weights, count),
    source: Point[] = [],
    target: Point[] = [];
  sourceSegments.forEach((segment, index) => {
    const isCorner = segmentCorner(sourceSegments, index) || segmentCorner(targetSegments, index),
      samples = perSegment[index];
    for (let sample = 0; sample < samples; sample++) {
      const t = sample / samples;
      source.push({ ...cubicPoint(segment, t), corner: sample === 0 && isCorner });
      target.push({ ...cubicPoint(targetSegments[index], t), corner: sample === 0 && isCorner });
    }
  });
  return { source, target, sourceD, targetD };
}
function normalizedBox(box: PathBox, normalize: (point: Point) => Point): PathBox {
  const topLeft = normalize({ x: box.x, y: box.y }),
    bottomRight = normalize({ x: box.x + box.width, y: box.y + box.height });
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}
function nativePathChannel(
  sourceD: string,
  targetD: string,
  normalizeA: (point: Point) => Point,
  normalizeB: (point: Point) => Point,
  sourceBox?: PathBox,
  targetBox?: PathBox,
): NativePathChannel | null {
  if (sourceD.replace(numberPattern, "#") !== targetD.replace(numberPattern, "#")) return null;
  const source = (sourceD.match(numberPattern) || []).map(Number),
    target = (targetD.match(numberPattern) || []).map(Number);
  if (source.length !== target.length || source.length % 2 !== 0) return null;
  const local = Boolean(sourceBox && targetBox),
    a: number[] = [],
    b: number[] = [];
  for (let index = 0; index < source.length; index += 2) {
    if (local) {
      a.push(
        (source[index] - sourceBox!.x) / sourceBox!.width,
        (source[index + 1] - sourceBox!.y) / sourceBox!.height,
      );
      b.push(
        (target[index] - targetBox!.x) / targetBox!.width,
        (target[index + 1] - targetBox!.y) / targetBox!.height,
      );
    } else {
      const pa = normalizeA({ x: source[index], y: source[index + 1] }),
        pb = normalizeB({ x: target[index], y: target[index + 1] });
      a.push(pa.x, pa.y);
      b.push(pb.x, pb.y);
    }
  }
  return {
    parts: sourceD.split(numberPattern),
    a,
    b,
    ...(local
      ? { boxA: normalizedBox(sourceBox!, normalizeA), boxB: normalizedBox(targetBox!, normalizeB) }
      : {}),
  };
}
function exactContourPathChannel(
  sourceD: string,
  targetD: string,
  normalizeA: (point: Point) => Point,
  normalizeB: (point: Point) => Point,
  sourceBox: PathBox,
  targetBox: PathBox,
  count: number,
): NativePathChannel | null {
  const sourceSegments = cubicSegments(sourceD)?.length ?? 0,
    targetSegments = cubicSegments(targetD)?.length ?? 0,
    total = Math.max(
      sourceSegments,
      targetSegments,
      Math.min(192, Math.max(72, Math.round(count * 0.55))),
    ),
    source = exactSubdividedPath(sourceD, total),
    target = exactSubdividedPath(targetD, total);
  if (!source || !target) return null;
  return nativePathChannel(source, target, normalizeA, normalizeB, sourceBox, targetBox);
}
function interpolateNativePaths(
  matrix: TransitionMatrix,
  raw: number,
  ease: EaseName,
  custom: BezierCurve,
  roundness = 0,
) {
  if (!matrix.nativePaths?.some(Boolean)) return null;
  const t = easeValue(ease, raw, custom),
    fallback = interpolateTransition(matrix, raw, ease, custom, roundness);
  return matrix.nativePaths.map((channel, index) => {
    if (!channel) return pointsPath([fallback[index]]);
    const box =
      channel.boxA && channel.boxB
        ? {
            x: channel.boxA.x + (channel.boxB.x - channel.boxA.x) * t,
            y: channel.boxA.y + (channel.boxB.y - channel.boxA.y) * t,
            width: channel.boxA.width + (channel.boxB.width - channel.boxA.width) * t,
            height: channel.boxA.height + (channel.boxB.height - channel.boxA.height) * t,
          }
        : null;
    let d = channel.parts[0];
    for (let value = 0; value < channel.a.length; value++) {
      const interpolated = channel.a[value] + (channel.b[value] - channel.a[value]) * t,
        coordinate = box
          ? value % 2 === 0
            ? box.x + interpolated * box.width
            : box.y + interpolated * box.height
          : interpolated;
      d += coordinate.toFixed(3) + channel.parts[value + 1];
    }
    return d;
  });
}
function polygonContains(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j],
      cross =
        a.y > point.y !== b.y > point.y &&
        point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || 1e-9) + a.x;
    if (cross) inside = !inside;
  }
  return inside;
}
function contourHierarchy(contours: string[]) {
  const polygons = contours.map((d) => sampleContour(d, 72)),
    areas = polygons.map((points) =>
      Math.abs(
        points.reduce((sum, p, i) => {
          const q = points[(i + 1) % points.length];
          return sum + p.x * q.y - q.x * p.y;
        }, 0) / 2,
      ),
    ),
    centers = polygons.map((points) =>
      points.reduce(
        (sum, p) => ({ x: sum.x + p.x / points.length, y: sum.y + p.y / points.length }),
        { x: 0, y: 0 },
      ),
    ),
    parents = contours.map((_, index) => {
      const candidates = contours
        .map((__, i) => i)
        .filter(
          (i) =>
            i !== index && areas[i] > areas[index] && polygonContains(centers[index], polygons[i]),
        )
        .sort((a, b) => areas[a] - areas[b]);
      return candidates[0] ?? -1;
    }),
    depths = parents.map((_, index) => {
      let depth = 0,
        parent = parents[index],
        guard = 0;
      while (parent >= 0 && guard++ < contours.length) {
        depth++;
        parent = parents[parent];
      }
      return depth;
    }),
    roots = parents.map((_, index) => {
      let root = index,
        parent = parents[index],
        guard = 0;
      while (parent >= 0 && guard++ < contours.length) {
        root = parent;
        parent = parents[parent];
      }
      return root;
    }),
    rootIds = new Map<number, number>();
  roots.forEach((root) => {
    if (!rootIds.has(root)) rootIds.set(root, rootIds.size);
  });
  return {
    components: roots.map((root) => rootIds.get(root) ?? 0),
    holes: depths.map((depth) => depth % 2 === 1),
  };
}
function assetComponents(asset: VectorAsset) {
  return asset.components ?? asset.contours.map((_, i) => i);
}
function assetHoles(asset: VectorAsset) {
  return asset.holes ?? asset.contours.map(() => false);
}
function componentCount(asset: VectorAsset) {
  return new Set(assetComponents(asset)).size;
}

function assetBounds(asset: VectorAsset, mode: ScaleMode) {
  if (mode === "viewBox") {
    const values = asset.viewBox.trim().split(/[ ,]+/).map(Number);
    if (values.length === 4 && values.every(Number.isFinite))
      return {
        x: values[0],
        y: values[1],
        width: Math.abs(values[2]) || 1,
        height: Math.abs(values[3]) || 1,
      };
  }
  const points = asset.contours.flatMap((d) => sampleContour(d, 72));
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(0.001, maxX - minX),
    height: Math.max(0.001, maxY - minY),
  };
}

function scaleNormalizer(asset: VectorAsset, mode: ScaleMode, padding: number) {
  if (mode === "raw") return (point: Point) => point;
  const bounds = assetBounds(asset, mode),
    available = 1000 - padding * 20;
  const scale = Math.min(available / bounds.width, available / bounds.height);
  const offsetX = 500 - (bounds.x + bounds.width / 2) * scale,
    offsetY = 500 - (bounds.y + bounds.height / 2) * scale;
  return (point: Point): Point => ({
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY,
    corner: point.corner,
  });
}

function scaleTransform(asset: VectorAsset, mode: ScaleMode, padding: number) {
  if (mode === "raw") return "";
  const bounds = assetBounds(asset, mode),
    available = 1000 - padding * 20,
    scale = Math.min(available / bounds.width, available / bounds.height),
    x = 500 - (bounds.x + bounds.width / 2) * scale,
    y = 500 - (bounds.y + bounds.height / 2) * scale;
  return `matrix(${scale} 0 0 ${scale} ${x} ${y})`;
}

function allocatePoints(lengths: number[], budget: number) {
  const minimum = Math.max(3, Math.min(8, Math.floor(budget / Math.max(1, lengths.length * 2))));
  const usable = Math.max(0, budget - minimum * lengths.length);
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const exact = lengths.map((length) => minimum + (usable * length) / total);
  const result = exact.map(Math.floor);
  const missing = budget - result.reduce((a, b) => a + b, 0);
  exact
    .map((value, i) => ({ i, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
    .slice(0, missing)
    .forEach(({ i }) => result[i]++);
  return result;
}

function alignPoints(source: Point[], target: Point[]) {
  if (source.length < 2) return source;
  let best = source,
    bestScore = Infinity;
  const candidates = [source, [...source].reverse()];
  for (const candidate of candidates) {
    const sampleStep = Math.max(1, Math.floor(candidate.length / 160)),
      shiftStep = Math.max(1, Math.floor(candidate.length / 160));
    let coarse = 0,
      coarseScore = Infinity;
    const score = (shift: number) => {
      let value = 0;
      for (let i = 0; i < candidate.length; i += sampleStep) {
        const a = candidate[(i + shift + candidate.length) % candidate.length],
          b = target[i];
        value += (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
      }
      return value;
    };
    for (let shift = 0; shift < candidate.length; shift += shiftStep) {
      const value = score(shift);
      if (value < coarseScore) {
        coarseScore = value;
        coarse = shift;
      }
    }
    for (let delta = -shiftStep; delta <= shiftStep; delta++) {
      const shift = (coarse + delta + candidate.length) % candidate.length,
        value = score(shift);
      if (value < bestScore) {
        bestScore = value;
        best = candidate.map((_, i) => candidate[(i + shift) % candidate.length]);
      }
    }
  }
  return best;
}
function alignPointsByFeatures(source: Point[], target: Point[]) {
  if (source.length < 3) return source;
  const weight = (points: Point[], i: number) => {
    const a = points[(i - 1 + points.length) % points.length],
      b = points[i],
      c = points[(i + 1) % points.length],
      u = { x: a.x - b.x, y: a.y - b.y },
      v = { x: c.x - b.x, y: c.y - b.y },
      ul = Math.hypot(u.x, u.y) || 1,
      vl = Math.hypot(v.x, v.y) || 1,
      turn = 1 - (u.x * v.x + u.y * v.y) / (ul * vl);
    return 1 + Math.max(0, turn) * 7;
  };
  let best = source,
    bestScore = Infinity;
  for (const candidate of [source, [...source].reverse()]) {
    const sampleStep = Math.max(1, Math.floor(candidate.length / 192)),
      shiftStep = Math.max(1, Math.floor(candidate.length / 192));
    let coarse = 0,
      coarseScore = Infinity;
    const score = (shift: number) => {
      let value = 0;
      for (let i = 0; i < candidate.length; i += sampleStep) {
        const index = (i + shift + candidate.length) % candidate.length,
          a = candidate[index],
          b = target[i],
          w = Math.max(weight(candidate, index), weight(target, i));
        value += ((a.x - b.x) ** 2 + (a.y - b.y) ** 2) * w;
      }
      return value;
    };
    for (let shift = 0; shift < candidate.length; shift += shiftStep) {
      const value = score(shift);
      if (value < coarseScore) {
        coarseScore = value;
        coarse = shift;
      }
    }
    for (let delta = -shiftStep; delta <= shiftStep; delta++) {
      const shift = (coarse + delta + candidate.length) % candidate.length,
        value = score(shift);
      if (value < bestScore) {
        bestScore = value;
        best = candidate.map((_, i) => candidate[(i + shift) % candidate.length]);
      }
    }
  }
  return best;
}

function rotatePoints(points: Point[], offset: number) {
  if (!points.length) return points;
  const shift = ((offset % points.length) + points.length) % points.length;
  return points.map((_, i) => points[(i + shift) % points.length]);
}
function pointCenter(points: Point[]) {
  return points.reduce(
    (sum, p) => ({ x: sum.x + p.x / points.length, y: sum.y + p.y / points.length }),
    { x: 0, y: 0 },
  );
}

type ContourInfo = {
  index: number;
  d: string;
  length: number;
  center: Point;
  area: number;
  hole: boolean;
};
function contourInfo(d: string, index: number, hole = false): ContourInfo {
  const points = sampleContour(d, 96),
    center = points.reduce(
      (sum, p) => ({ x: sum.x + p.x / points.length, y: sum.y + p.y / points.length }),
      { x: 0, y: 0 },
    );
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  const metric = pathMetrics(d);
  try {
    return { index, d, length: metric.length, center, area: Math.abs(area / 2), hole };
  } finally {
    metric.dispose();
  }
}
function closestContour(reference: ContourInfo, candidates: ContourInfo[]) {
  return candidates.reduce((best, item) => {
    const score =
      (item.center.x - reference.center.x) ** 2 +
      (item.center.y - reference.center.y) ** 2 +
      Math.abs(Math.log((item.area + 1) / (reference.area + 1))) ** 2 * 2500;
    const bestScore =
      (best.center.x - reference.center.x) ** 2 +
      (best.center.y - reference.center.y) ** 2 +
      Math.abs(Math.log((best.area + 1) / (reference.area + 1))) ** 2 * 2500;
    return score < bestScore ? item : best;
  }, candidates[0]).index;
}
function matchContours(from: ContourInfo[], to: ContourInfo[]) {
  const candidates = from
    .flatMap((a) =>
      to
        .filter((b) => a.hole === b.hole)
        .map((b) => {
          const dx = a.center.x - b.center.x,
            dy = a.center.y - b.center.y,
            area = Math.abs(Math.log((a.area + 1) / (b.area + 1)));
          return { a: a.index, b: b.index, score: dx * dx + dy * dy + area * area * 2500 };
        }),
    )
    .sort((x, y) => x.score - y.score);
  const usedA = new Set<number>(),
    usedB = new Set<number>(),
    pairs: { a: number | null; b: number | null }[] = [];
  for (const item of candidates)
    if (!usedA.has(item.a) && !usedB.has(item.b)) {
      usedA.add(item.a);
      usedB.add(item.b);
      pairs.push({ a: item.a, b: item.b });
    }
  from.forEach((item) => {
    if (!usedA.has(item.index)) pairs.push({ a: item.index, b: null });
  });
  to.forEach((item) => {
    if (!usedB.has(item.index)) pairs.push({ a: null, b: item.index });
  });
  return pairs;
}
function dominantComponent(infos: ContourInfo[], components: number[]) {
  const ids = [...new Set(components)],
    ranked = ids
      .map((id) => {
        const members = infos.filter((info) => components[info.index] === id && !info.hole),
          usable = members.length ? members : infos.filter((info) => components[info.index] === id);
        return { id, area: usable.reduce((sum, item) => sum + item.area, 0) };
      })
      .sort((a, b) => b.area - a.area);
  return ranked[0]?.id ?? 0;
}
function orderedWordComponents(infos: ContourInfo[], components: number[]) {
  return [...new Set(components)]
    .map((id) => {
      const members = infos.filter((info) => components[info.index] === id),
        outer =
          members.filter((info) => !info.hole).sort((a, b) => b.area - a.area)[0] ?? members[0];
      return { id, x: outer?.center.x ?? 0, members };
    })
    .sort((a, b) => a.x - b.x);
}
function componentBounds(infos: ContourInfo[], components: number[], component: number): PathBox {
  const coordinates = infos
      .filter((info) => components[info.index] === component)
      .flatMap((info) => (info.d.match(numberPattern) || []).map(Number)),
    xs = coordinates.filter((_, index) => index % 2 === 0),
    ys = coordinates.filter((_, index) => index % 2 === 1),
    minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(0.001, maxX - minX),
    height: Math.max(0.001, maxY - minY),
  };
}
function viewBoxValues(viewBox: string) {
  const values = viewBox.trim().split(/[ ,]+/).map(Number);
  return values.length === 4 && values.every(Number.isFinite) ? values : [0, 0, 1, 1];
}
function viewBoxMatches(asset: VectorAsset, expected: number[]) {
  const values = viewBoxValues(asset.viewBox);
  return (
    values.length === expected.length &&
    values.every((value, index) => Math.abs(value - expected[index]) < 0.001)
  );
}
function isMattarNativeBoundary(from: VectorAsset, to: VectorAsset, targetState: number) {
  return (
    targetState === 3 &&
    componentCount(from) === 6 &&
    componentCount(to) === 6 &&
    viewBoxMatches(from, [0, 0, 2735.54, 659.62]) &&
    viewBoxMatches(to, [0, 0, 276.02, 66.58])
  );
}
function isMattarMStructuralBoundary(from: VectorAsset, to: VectorAsset, targetState: number) {
  return (
    targetState === 4 &&
    componentCount(from) === 6 &&
    componentCount(to) === 6 &&
    viewBoxMatches(from, [0, 0, 276.02, 66.58]) &&
    viewBoxMatches(to, [0, 0, 280.7, 67.07])
  );
}
function remapPathToViewBox(d: string, sourceViewBox: string, targetViewBox: string) {
  const [sx, sy, sw, sh] = viewBoxValues(sourceViewBox),
    [tx, ty, tw, th] = viewBoxValues(targetViewBox),
    scale = Math.min(Math.abs(tw / sw) || 1, Math.abs(th / sh) || 1),
    offsetX = tx + (tw - sw * scale) / 2 - sx * scale,
    offsetY = ty + (th - sh * scale) / 2 - sy * scale;
  let coordinate = 0;
  return d.replace(numberPattern, (value) => {
    const number = Number(value),
      mapped = coordinate++ % 2 === 0 ? number * scale + offsetX : number * scale + offsetY;
    return Number.isInteger(mapped) ? String(mapped) : mapped.toFixed(5);
  });
}
function primaryMContour(asset: VectorAsset) {
  if (componentCount(asset) !== 6) return null;
  const holes = assetHoles(asset),
    components = assetComponents(asset),
    infos = asset.contours.map((d, index) => contourInfo(d, index, holes[index])),
    first = orderedWordComponents(infos, components)[0];
  return (
    first?.members.filter((member) => !member.hole).sort((a, b) => b.area - a.area)[0]?.index ??
    null
  );
}
function replaceMFromReference(asset: VectorAsset, reference: VectorAsset) {
  const targetIndex = primaryMContour(asset),
    referenceIndex = primaryMContour(reference);
  if (targetIndex === null || referenceIndex === null) return asset;
  const contours = [...asset.contours];
  contours[targetIndex] = remapPathToViewBox(
    reference.contours[referenceIndex],
    reference.viewBox,
    asset.viewBox,
  );
  return { ...asset, contours };
}
function matchWordContours(
  from: ContourInfo[],
  to: ContourInfo[],
  fromComponents: number[],
  toComponents: number[],
) {
  const source = orderedWordComponents(from, fromComponents),
    target = orderedWordComponents(to, toComponents);
  if (source.length !== 6 || target.length !== 6) return null;
  return source.flatMap((component, index) =>
    [...component.members]
      .sort((a, b) => Number(a.hole) - Number(b.hole) || b.area - a.area)
      .map((member) => {
        const candidates = target[index].members
          .filter((item) => item.hole === member.hole)
          .sort((a, b) => b.area - a.area);
        return { a: member.index, b: candidates[0]?.index ?? null };
      }),
  );
}
function matchWithCarrier(
  from: ContourInfo[],
  to: ContourInfo[],
  fromComponents: number[],
  toComponents: number[],
  wordOrder = false,
) {
  const fromCount = new Set(fromComponents).size,
    toCount = new Set(toComponents).size;
  if (wordOrder) {
    const wordPairs = matchWordContours(from, to, fromComponents, toComponents);
    if (wordPairs) return wordPairs;
  }
  const orderedNative =
    from.length === to.length &&
    from.every(
      (info, index) =>
        Boolean(to[index]) &&
        info.hole === to[index].hole &&
        fromComponents[index] === toComponents[index],
    );
  if (orderedNative) return from.map((_, index) => ({ a: index, b: index }));
  if (fromCount > 1 && toCount === 1) {
    const carrier = dominantComponent(from, fromComponents),
      carrierContours = from.filter((info) => fromComponents[info.index] === carrier);
    return matchContours(carrierContours, to);
  }
  if (fromCount === 1 && toCount > 1) {
    const carrier = dominantComponent(to, toComponents),
      carrierContours = to.filter((info) => toComponents[info.index] === carrier),
      pairs = matchContours(from, carrierContours),
      used = new Set(pairs.flatMap((pair) => (pair.b === null ? [] : [pair.b])));
    return [
      ...pairs,
      ...to.filter((info) => !used.has(info.index)).map((info) => ({ a: null, b: info.index })),
    ];
  }
  return matchContours(from, to);
}
function nearestPoint(points: Point[], reference: Point) {
  return points.reduce(
    (best, point) =>
      (point.x - reference.x) ** 2 + (point.y - reference.y) ** 2 <
      (best.x - reference.x) ** 2 + (best.y - reference.y) ** 2
        ? point
        : best,
    points[0],
  );
}

function canonicalizeTransition(
  from: VectorAsset,
  to: VectorAsset,
  budget: number,
  scaleMode: ScaleMode,
  padding: number,
  autoAlign: boolean,
  targetState: number,
  reversals: Record<string, boolean>,
  offsets: Record<string, number>,
) {
  const fromHoles = assetHoles(from),
    toHoles = assetHoles(to),
    fromComponents = assetComponents(from),
    toComponents = assetComponents(to),
    fromInfo = from.contours.map((d, i) => contourInfo(d, i, fromHoles[i])),
    toInfo = to.contours.map((d, i) => contourInfo(d, i, toHoles[i])),
    wordOrder = targetState <= 4 && componentCount(from) === 6 && componentCount(to) === 6,
    pairs = matchWithCarrier(fromInfo, toInfo, fromComponents, toComponents, wordOrder);
  const lengths = pairs.map((pair) =>
    Math.max(
      pair.a === null ? 0 : fromInfo[pair.a].length,
      pair.b === null ? 0 : toInfo[pair.b].length,
    ),
  );
  const effectiveBudget = Math.max(budget, pairs.length * (wordOrder ? 180 : 120), 480),
    allocation = allocatePoints(lengths, effectiveBudget),
    normalizeA = scaleNormalizer(from, scaleMode, padding),
    normalizeB = scaleNormalizer(to, scaleMode, padding);
  const a: Point[][] = [],
    b: Point[][] = [],
    groupsA: number[] = [],
    groupsB: number[] = [],
    holesA: boolean[] = [],
    holesB: boolean[] = [],
    absorbing: boolean[] = [],
    sourceIndices: (number | null)[] = [],
    targetIndices: (number | null)[] = [],
    nativeChannels: boolean[] = [],
    nativePaths: (NativePathChannel | null)[] = [],
    merging = componentCount(from) > 1 && componentCount(to) === 1,
    splitting = componentCount(from) === 1 && componentCount(to) > 1,
    direction = merging ? "merge" : splitting ? "split" : "pair",
    localGlyphInterpolation = wordOrder && targetState >= 3,
    isolatedNativeMotion = wordOrder && isMattarNativeBoundary(from, to, targetState),
    structuralMMotion = wordOrder && isMattarMStructuralBoundary(from, to, targetState),
    orderedSourceComponents =
      isolatedNativeMotion || structuralMMotion
        ? orderedWordComponents(fromInfo, fromComponents)
        : [],
    terminalWordComponent = isolatedNativeMotion ? orderedSourceComponents.at(-1)?.id : null,
    primaryWordComponent = structuralMMotion ? orderedSourceComponents[0]?.id : null,
    fromBoxCache = new Map<number, PathBox>(),
    toBoxCache = new Map<number, PathBox>();
  pairs.forEach((pair, channel) => {
    const count = allocation[channel];
    const sourceIndex = pair.a ?? closestContour(toInfo[pair.b!], fromInfo),
      targetIndex = pair.b ?? closestContour(fromInfo[pair.a!], toInfo);
    const sourceComponent = fromComponents[sourceIndex],
      targetComponent = toComponents[targetIndex];
    if (localGlyphInterpolation && !fromBoxCache.has(sourceComponent))
      fromBoxCache.set(sourceComponent, componentBounds(fromInfo, fromComponents, sourceComponent));
    if (localGlyphInterpolation && !toBoxCache.has(targetComponent))
      toBoxCache.set(targetComponent, componentBounds(toInfo, toComponents, targetComponent));
    const sourceBox = localGlyphInterpolation ? fromBoxCache.get(sourceComponent) : undefined,
      targetBox = localGlyphInterpolation ? toBoxCache.get(targetComponent) : undefined,
      paired =
        pair.a !== null && pair.b !== null
          ? samplePairedContours(
              from.contours[sourceIndex],
              to.contours[targetIndex],
              count,
              wordOrder,
              sourceBox,
              targetBox,
              isolatedNativeMotion,
            )
          : null;
    let source = (paired?.source ?? sampleContour(from.contours[sourceIndex], count)).map(
      normalizeA,
    );
    let target = (paired?.target ?? sampleContour(to.contours[targetIndex], count)).map(normalizeB);
    if (splitting && pair.a === null) {
      const carrier = sampleContour(from.contours[sourceIndex], Math.max(96, count)).map(
          normalizeA,
        ),
        join = nearestPoint(carrier, pointCenter(target));
      source = Array.from({ length: count }, () => ({ ...join }));
    }
    if (merging && pair.b === null) {
      const carrier = sampleContour(to.contours[targetIndex], Math.max(96, count)).map(normalizeB),
        join = nearestPoint(carrier, pointCenter(source));
      target = Array.from({ length: count }, () => ({ ...join }));
    }
    const sameTemplate =
        from.contours[sourceIndex].replace(numberPattern, "#") ===
        to.contours[targetIndex].replace(numberPattern, "#"),
      key = `${targetState}:${pair.b ?? channel}`,
      manualReverse = !wordOrder && Boolean(reversals[key]),
      manualOffset = wordOrder ? 0 : (offsets[key] ?? 0);
    let nativePath: NativePathChannel | null = null;
    if (wordOrder && paired) {
      if (
        structuralMMotion &&
        sourceComponent === primaryWordComponent &&
        sourceBox &&
        targetBox &&
        !fromHoles[sourceIndex]
      )
        nativePath = structuralMPathChannel(
          from.contours[sourceIndex],
          to.contours[targetIndex],
          normalizeA,
          normalizeB,
          sourceBox,
          targetBox,
        );
      else if (isolatedNativeMotion && !sameTemplate && sourceBox && targetBox)
        nativePath = exactContourPathChannel(
          from.contours[sourceIndex],
          to.contours[targetIndex],
          normalizeA,
          normalizeB,
          sourceBox,
          targetBox,
          count,
        );
      else if (
        isolatedNativeMotion &&
        sourceComponent === terminalWordComponent &&
        sourceBox &&
        targetBox &&
        !fromHoles[sourceIndex]
      )
        nativePath = terminalRPathChannel(
          from.contours[sourceIndex],
          to.contours[targetIndex],
          normalizeA,
          normalizeB,
          sourceBox,
          targetBox,
        );
      else if (
        isolatedNativeMotion &&
        sourceComponent === terminalWordComponent &&
        sourceBox &&
        targetBox
      ) {
        const [orderedSource, orderedTarget] = orderedNativeStrings(
          from.contours[sourceIndex],
          to.contours[targetIndex],
          sourceBox,
          targetBox,
        );
        nativePath = nativePathChannel(
          orderedSource,
          orderedTarget,
          normalizeA,
          normalizeB,
          sourceBox,
          targetBox,
        );
      } else
        nativePath = nativePathChannel(
          paired.sourceD,
          paired.targetD,
          normalizeA,
          normalizeB,
          sourceBox,
          targetBox,
        );
    }
    if (manualReverse) target = [...target].reverse();
    target = rotatePoints(target, manualOffset);
    if (
      autoAlign &&
      !paired &&
      !manualReverse &&
      !manualOffset &&
      pair.a !== null &&
      pair.b !== null
    )
      target =
        merging || splitting ? alignPointsByFeatures(target, source) : alignPoints(target, source);
    a.push(source);
    b.push(target);
    groupsA.push(fromComponents[sourceIndex]);
    groupsB.push(toComponents[targetIndex]);
    holesA.push(pair.a === null ? false : fromHoles[sourceIndex]);
    holesB.push(pair.b === null ? false : toHoles[targetIndex]);
    absorbing.push(false);
    sourceIndices.push(pair.a);
    targetIndices.push(pair.b);
    nativeChannels.push(pair.a !== null && pair.b !== null && Boolean(paired));
    nativePaths.push(nativePath);
  });
  return {
    a,
    b,
    allocation,
    semantic: merging || splitting,
    groupsA,
    groupsB,
    holesA,
    holesB,
    absorbing,
    renderGroups: groupsB,
    direction,
    sourceIndices,
    targetIndices,
    nativeChannels,
    nativePaths: wordOrder ? nativePaths : undefined,
  };
}

function analyzeNativeTopology(assets: VectorAsset[]) {
  const compatible =
    assets.length > 1 &&
    assets.every((asset) => asset.contours.length === assets[0].contours.length) &&
    assets[0].contours.every((contour, index) =>
      assets.every(
        (asset) =>
          asset.contours[index].replace(numberPattern, "#") === contour.replace(numberPattern, "#"),
      ),
    );
  if (!compatible)
    return {
      compatible: false,
      templates: [] as string[],
      numbers: [] as number[][][],
      stable: [] as boolean[][],
      stableCount: 0,
      totalCount: 0,
    };
  const templates = assets[0].contours,
    numbers = assets.map((asset) =>
      asset.contours.map((d) => (d.match(numberPattern) || []).map(Number)),
    );
  const stable = templates.map((_, contour) =>
    numbers[0][contour].map((value, index) =>
      numbers.every((state) => state[contour][index] === value),
    ),
  );
  const stableCount = stable.flat().filter(Boolean).length,
    totalCount = stable.flat().length;
  return { compatible, templates, numbers, stable, stableCount, totalCount };
}

function analyzePair(from: VectorAsset, to: VectorAsset, transition?: TransitionMatrix) {
  const fromCount = componentCount(from),
    toCount = componentCount(to),
    sameCount = fromCount === toCount;
  const channelCount =
      transition?.sourceIndices?.length ?? Math.max(from.contours.length, to.contours.length),
    fromGroups = assetComponents(from),
    toGroups = assetComponents(to),
    fromHoles = assetHoles(from),
    toHoles = assetHoles(to);
  const rows = Array.from({ length: channelCount }, (_, index) => {
    const sourceIndex = transition?.sourceIndices?.[index] ?? (from.contours[index] ? index : null),
      targetIndex = transition?.targetIndices?.[index] ?? (to.contours[index] ? index : null),
      a = sourceIndex === null ? undefined : from.contours[sourceIndex],
      b = targetIndex === null ? undefined : to.contours[targetIndex],
      points = transition?.allocation[index] ?? 0;
    const common = {
      index,
      sourceIndex,
      targetIndex,
      sourceComponent: sourceIndex === null ? null : fromGroups[sourceIndex],
      targetComponent: targetIndex === null ? null : toGroups[targetIndex],
      sourceHole: sourceIndex === null ? false : fromHoles[sourceIndex],
      targetHole: targetIndex === null ? false : toHoles[targetIndex],
      points,
    };
    if (!a || !b)
      return {
        ...common,
        status: sourceIndex === null ? ("created" as const) : ("absorbed" as const),
        stable: 0,
        confidence: 42,
      };
    const templateNative = a.replace(numberPattern, "#") === b.replace(numberPattern, "#"),
      orderedNative =
        sourceIndex === targetIndex &&
        common.sourceComponent === common.targetComponent &&
        common.sourceHole === common.targetHole,
      normalizedNative = Boolean(transition?.nativeChannels?.[index]);
    if (!templateNative && !orderedNative && !normalizedNative)
      return { ...common, status: "structural" as const, stable: 0, confidence: 68 };
    if (!templateNative)
      return {
        ...common,
        status: "native" as const,
        stable: 0,
        confidence: normalizedNative ? 98 : 95,
      };
    const an = (a.match(numberPattern) || []).map(Number),
      bn = (b.match(numberPattern) || []).map(Number),
      stable = an.filter((value, i) => value === bn[i]).length / an.length;
    return {
      ...common,
      status: stable === 1 ? ("fixed" as const) : ("native" as const),
      stable,
      confidence: Math.round(90 + stable * 10),
    };
  });
  const allNative =
    sameCount && rows.every((row) => row.status === "fixed" || row.status === "native");
  const mode = allNative
    ? "Topologia nativa"
    : sameCount
      ? "Preservação estrutural"
      : fromCount > toCount
        ? `Fusão ${fromCount} → ${toCount}`
        : `Divisão ${fromCount} → ${toCount}`;
  const confidence = Math.round(rows.reduce((sum, row) => sum + row.confidence, 0) / rows.length);
  const attention = rows.filter(
    (row) => row.status === "structural" || row.status === "created" || row.status === "absorbed",
  ).length;
  return { rows, mode, confidence, attention };
}
function relationStatusLabel(status: string) {
  return status === "fixed"
    ? "Imóvel"
    : status === "native"
      ? "Nativo"
      : status === "structural"
        ? "Estrutural"
        : status === "created"
          ? "Multiplicado"
          : "Absorvido";
}

function rebuildPath(template: string, numbers: number[]) {
  let index = 0;
  return template.replace(numberPattern, () =>
    Number.isInteger(numbers[index]) ? String(numbers[index++]) : numbers[index++].toFixed(3),
  );
}

async function parseSvg(markup: string, name: string): Promise<VectorAsset> {
  const documentSvg = new DOMParser().parseFromString(markup, "image/svg+xml");
  const root = documentSvg.documentElement;
  if (root.nodeName.toLowerCase() !== "svg" || documentSvg.querySelector("parsererror"))
    throw new Error("SVG inválido ou corrompido.");
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:-10000px;opacity:0;pointer-events:none";
  const imported = document.importNode(root, true) as unknown as SVGSVGElement;
  host.appendChild(imported);
  document.body.appendChild(host);
  try {
    const MorphSVGPlugin = await loadMorphEngine();
    const elements = Array.from(
      imported.querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon"),
    ) as SVGElement[];
    if (!elements.length) throw new Error("Nenhuma geometria vetorial foi encontrada.");
    const primitives = elements.filter((el) => el.tagName.toLowerCase() !== "path");
    if (primitives.length) MorphSVGPlugin.convertToPath(primitives as never, true);
    const paths = Array.from(imported.querySelectorAll("path"));
    const contours: string[] = [],
      components: number[] = [],
      holes: boolean[] = [];
    paths.forEach((path, pathIndex) => {
      const raw = MorphSVGPlugin.getRawPath(path) as unknown as number[][];
      raw.forEach((subpath, subpathIndex) => {
        const contour = MorphSVGPlugin.rawPathToString([subpath] as never);
        if (!contour) return;
        contours.push(contour);
        components.push(pathIndex);
        holes.push(subpathIndex > 0);
      });
    });
    if (!contours.length) throw new Error("Os elementos não puderam ser convertidos em paths.");
    const viewBox =
      imported.getAttribute("viewBox") ||
      `0 0 ${imported.getAttribute("width") || 470} ${imported.getAttribute("height") || 340}`;
    return {
      name: name.replace(/\.svg$/i, ""),
      contours,
      viewBox,
      sourceCount: paths.length,
      components,
      holes,
    };
  } finally {
    host.remove();
  }
}
async function readSvg(file: File) {
  return parseSvg(await file.text(), file.name);
}

type EaseName =
  | "linear"
  | "smooth"
  | "gentle"
  | "sine"
  | "emphasis"
  | "expo"
  | "easeIn"
  | "easeOut"
  | "custom";
type BezierCurve = [number, number, number, number];
const DEFAULT_CURVE: BezierCurve = [0.45, 0, 0.55, 1];
const easingCurves: Record<Exclude<EaseName, "custom">, BezierCurve> = {
  linear: [0, 0, 1, 1],
  smooth: [0.45, 0, 0.55, 1],
  gentle: [0.25, 0.1, 0.25, 1],
  sine: [0.37, 0, 0.63, 1],
  emphasis: [0.65, 0, 0.35, 1],
  expo: [0.87, 0, 0.13, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
};
function isEaseName(value: unknown): value is EaseName {
  return typeof value === "string" && easeNames.includes(value as EaseName);
}
function isBezierCurve(value: unknown): value is BezierCurve {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}
function normalizeCurves(value: unknown, length: number, fallback: BezierCurve = DEFAULT_CURVE) {
  const source = Array.isArray(value) ? value : [];
  return Array.from(
    { length },
    (_, index) => [...(isBezierCurve(source[index]) ? source[index] : fallback)] as BezierCurve,
  );
}
function cubicBezierValue(t: number, [x1, y1, x2, y2]: BezierCurve) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const sample = (u: number, a: number, b: number) =>
    3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u;
  let low = 0,
    high = 1,
    u = t;
  for (let i = 0; i < 14; i++) {
    const x = sample(u, x1, x2);
    if (x < t) low = u;
    else high = u;
    u = (low + high) / 2;
  }
  return sample(u, y1, y2);
}
const easeValue = (name: EaseName, t: number, custom: BezierCurve) =>
  cubicBezierValue(t, name === "custom" ? custom : easingCurves[name]);

function timelineSegment(time: number, durations: number[]) {
  const total = durations.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  if (time >= total)
    return {
      index: Math.max(0, durations.length - 1),
      start: Math.max(0, total - (durations.at(-1) ?? 0)),
      local: 1,
    };
  for (let index = 0; index < durations.length; index++) {
    const duration = durations[index];
    if (time < cursor + duration)
      return { index, start: cursor, local: Math.max(0, Math.min(1, (time - cursor) / duration)) };
    cursor += duration;
  }
  return { index: 0, start: 0, local: 0 };
}
function softenContour(points: Point[], amount: number) {
  if (points.length < 5 || amount <= 0) return points;
  let current = points;
  for (let pass = 0; pass < 2; pass++)
    current = current.map((point, index) => {
      if (point.corner) return point;
      const before = current[(index - 1 + current.length) % current.length],
        after = current[(index + 1) % current.length],
        average = {
          x: (before.x + point.x * 2 + after.x) / 4,
          y: (before.y + point.y * 2 + after.y) / 4,
        };
      return {
        x: point.x + (average.x - point.x) * amount,
        y: point.y + (average.y - point.y) * amount,
        corner: point.corner,
      };
    });
  return current;
}
function interpolateTransition(
  matrix: TransitionMatrix,
  raw: number,
  ease: EaseName,
  custom: BezierCurve,
  roundness = 0,
) {
  const split = 0.46,
    hasMid = Boolean(matrix.mid),
    phase = hasMid ? (raw <= split ? 0 : 1) : 0,
    local = hasMid ? (phase === 0 ? raw / split : (raw - split) / (1 - split)) : raw,
    t = easeValue(ease, local, custom),
    from = phase === 1 ? matrix.mid! : matrix.a,
    to = phase === 0 && hasMid ? matrix.mid! : matrix.b;
  const bell = matrix.semantic ? Math.sin(Math.PI * raw) ** 2 : 0,
    soften = bell * Math.max(0, Math.min(1, roundness / 100)) * 0.82,
    holes = from.map((_, index) => Boolean(matrix.holesA?.[index] || matrix.holesB?.[index]));
  return from.map((contour, channel) => {
    const channelT = phase === 1 && matrix.absorbing?.[channel] ? 1 - Math.pow(1 - local, 2.4) : t,
      interpolated = contour.map((point, index) => ({
        x: point.x + (to[channel][index].x - point.x) * channelT,
        y: point.y + (to[channel][index].y - point.y) * channelT,
        corner: Boolean(point.corner || to[channel][index].corner),
      }));
    return holes[channel] ? interpolated : softenContour(interpolated, soften);
  });
}
function svgDocument(paths: string, background?: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">${background ? `<rect width="1000" height="1000" fill="${background}"/>` : ""}${paths}</svg>`;
}

function UnionComponents({
  contours,
  groups,
}: {
  contours: string[];
  holes?: boolean[];
  holeStrengths?: number[];
  groups: number[];
  maskId?: string;
  extent?: number;
}) {
  return (
    <g>
      {[...new Set(groups)].reverse().map((group) => {
        const d = contours.filter((_, index) => groups[index] === group).join(" ");
        return (
          <path key={group} d={d} className="morph-shape" fillRule="evenodd" clipRule="evenodd" />
        );
      })}
    </g>
  );
}
function unionComponentsSvgMarkup(
  contours: string[],
  _holes: boolean[],
  groups: number[],
  color: string,
) {
  return [...new Set(groups)]
    .reverse()
    .map(
      (group) =>
        `<path d="${contours.filter((_, index) => groups[index] === group).join(" ")}" fill="${color}" fill-rule="evenodd" clip-rule="evenodd"/>`,
    )
    .join("");
}

export {
  loadMorphEngine,
  parseSvg,
  canonicalizeTransition,
  interpolateNativePaths,
  interpolateTransition,
  pointsPath,
};
