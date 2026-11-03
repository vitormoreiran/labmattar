import wordLayout from "./word-layout.mjs";
export const PAIRS = [
  ["M", "P8"],
  ["A1", "P3"],
  ["T1", "P4"],
  ["T2", "P2"],
  ["A2", "P9"],
  ["R", "P5"],
];
export const STUDY_PAIRS = [
  ["M", "P8"],
  ["A1", "P3"],
  ["T1", "P2"],
  ["T2", "P4"],
  ["A2", "P9"],
  ["R", "P5"],
];
export const pairsFor = (geometry) => (geometry === "silhouette" ? STUDY_PAIRS : PAIRS);
export const ASSET_IDS = [
  "M",
  "A1",
  "T1",
  "T2",
  "A2",
  "R",
  ...Array.from({ length: 9 }, (_, i) => `P${i + 1}`),
];
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const wrap = (x) => ((x % 360) + 360) % 360;
export const ease = (t, name = "smooth") =>
  name === "polished"
    ? t * t * t * (t * (t * 6 - 15) + 10)
    : name === "linear"
      ? t
      : name === "easeIn"
        ? t * t
        : name === "easeOut"
          ? 1 - (1 - t) ** 2
          : (1 - Math.cos(Math.PI * t)) / 2;
export function bridgeFor(a, b, geometry = "volume") {
  return (
    pairsFor(geometry)
      .find(([x, y]) => (x === a && y === b) || (x === b && y === a))
      ?.join("-") ?? null
  );
}
export function track(asset = "M", name = asset) {
  return {
    id: uid(),
    name,
    startAsset: asset,
    startAngle: 0,
    delay: 0,
    position: { x: 0, y: 0 },
    scale: 1,
    enabled: true,
    steps: [],
  };
}
export function step(type, values = {}) {
  return { id: uid(), type, duration: type === "hold" ? 0.8 : 1.8, easing: "smooth", ...values };
}
export function compileTrack(t, geometry = "volume", speed = 1) {
  const rate = Math.max(0.25, Math.min(3, Number(speed) || 1));
  const entrance = t.entrance
    ? {
        ...t.entrance,
        start: ((Number(t.delay) || 0) + t.entrance.start) / rate,
        duration: t.entrance.duration / rate,
      }
    : null;
  const exit = t.exit
    ? {
        ...t.exit,
        start: ((Number(t.delay) || 0) + t.exit.start) / rate,
        duration: t.exit.duration / rate,
      }
    : null;
  let pose = { asset: t.startAsset, angle: Number(t.startAngle) || 0 },
    cursor = (Number(t.delay) || 0) / rate;
  const segments = [],
    warnings = [];
  const add = (s, from, to, extra = {}) => {
    const duration = Math.max(0.1, Number(s.duration) || 1) / rate;
    segments.push({
      id: s.id,
      stepId: s.parentId ?? s.id,
      type: s.type,
      start: cursor,
      end: cursor + duration,
      duration,
      from: { ...from },
      to: { ...to },
      easing: s.easing ?? "smooth",
      ...extra,
    });
    cursor += duration;
    pose = { ...to };
  };
  for (const s of t.steps) {
    if (s.type === "rotate") add(s, pose, { ...pose, angle: pose.angle + Number(s.degrees ?? 90) });
    else if (s.type === "hold") add(s, pose, pose);
    else if (s.type === "morph") {
      if (!ASSET_IDS.includes(s.target) || s.target === pose.asset) continue;
      const bridge = bridgeFor(pose.asset, s.target, geometry);
      if (!bridge && !s.experimental) {
        warnings.push({
          stepId: s.id,
          from: pose.asset,
          to: s.target,
          time: cursor,
          reason: "Passagem não preparada nesta ordem",
        });
        continue;
      }
      const angularDistance = wrap(90 - wrap(pose.angle));
      if (angularDistance > 0.001 && angularDistance < 359.999) {
        add(
          {
            id: `${s.id}:align`,
            parentId: s.id,
            type: "rotate",
            duration: s.prepareDuration ?? 1.5,
            easing: s.easing,
          },
          pose,
          { ...pose, angle: pose.angle + angularDistance },
          { automatic: true },
        );
      }
      add(s, pose, { asset: s.target, angle: pose.angle }, { bridge, experimental: !bridge });
    }
  }
  return {
    track: t,
    delay: (Number(t.delay) || 0) / rate,
    segments,
    warnings,
    startPose: { asset: t.startAsset, angle: Number(t.startAngle) || 0 },
    endPose: pose,
    duration:
      entrance || exit
        ? Math.max(
            cursor,
            entrance ? entrance.start + entrance.duration : 0,
            exit ? exit.start + exit.duration : 0,
          )
        : cursor,
    ...(entrance ? { entrance } : {}),
    ...(exit ? { exit } : {}),
  };
}
export function compileProject(project) {
  const tracks = project.tracks
    .filter((t) => t.enabled)
    .map((t) => compileTrack(t, project.geometry, project.speed));
  return { tracks, duration: Math.max(0.1, ...tracks.map((t) => t.duration)) };
}
export function poseAt(compiled, time) {
  const segments = compiled.segments;
  if (time < (compiled.delay ?? compiled.track.delay ?? 0))
    return { type: "pose", pose: compiled.startPose, local: 0 };
  if (!segments.length || time >= compiled.duration)
    return { type: "pose", pose: compiled.endPose, local: 1 };
  const segment = segments.find((s) => time >= s.start && time < s.end);
  if (!segment) return { type: "pose", pose: compiled.startPose, local: 0 };
  const local = Math.min(1, Math.max(0, (time - segment.start) / segment.duration)),
    q = ease(local, segment.easing);
  if (segment.type === "morph") return { ...segment, local, q };
  return {
    ...segment,
    local,
    q,
    pose: {
      asset: segment.from.asset,
      angle: segment.from.angle + (segment.to.angle - segment.from.angle) * q,
    },
  };
}
export function routeTrack(from = "M", to = "P8", options = {}) {
  const t = track(from, `${from} → ${to} → ${from}`);
  t.steps = [
    step("rotate", { degrees: 90, duration: 2 }),
    step("morph", { target: to, duration: 2.5 }),
    step("rotate", { degrees: 360, duration: 8, easing: "linear" }),
    step("morph", { target: from, duration: 2.5 }),
    step("rotate", { degrees: -90, duration: 2 }),
  ];
  return { ...t, ...options };
}
export function createProject(kind = "route") {
  const project = {
    format: "mattar-spatial",
    version: 2,
    id: uid(),
    name: "M · P8 · M",
    color: "#181814",
    background: "#f2efe7",
    aspect: "1:1",
    geometry: "volume",
    speed: 1,
    loop: false,
    tracks: [routeTrack()],
  };
  if (kind === "composition") {
    project.name = "MATTAR · composição";
    project.aspect = "16:9";
    project.tracks = PAIRS.map(([a, b], i) => {
      const native = wordLayout.letters.find((l) => l.id === a),
        factor = 0.28;
      return routeTrack(a, b, {
        name: `${a} · ${b}`,
        position: { x: native.position[0] * factor, y: native.position[1] * factor },
        scale: native.scale * factor,
        delay: i * 0.24,
      });
    });
  }
  if (kind === "empty") {
    project.name = "Novo roteiro";
    project.tracks = [track("M")];
  }
  if (kind === "m-form") {
    project.name = "M + Forma · respiração";
    project.tracks = [track("M", "M + P8 · respiração")];
    // One uninterrupted revolution, with zero velocity and acceleration at
    // each transition between rotation and deformation.
    project.tracks[0].steps = [
      step("hold", { duration: 0.7 }),
      step("rotate", { degrees: 90, duration: 1.25, easing: "polished" }),
      step("morph", { target: "P8", duration: 1.5, easing: "polished" }),
      step("rotate", { degrees: 360, duration: 3.9, easing: "polished" }),
      step("morph", { target: "M", duration: 1.5, easing: "polished" }),
      step("rotate", { degrees: -90, duration: 1.25, easing: "polished" }),
      step("hold", { duration: 0.7 }),
    ];
  }
  if (kind === "mattar-rhythm") {
    project.name = "MATTAR · onda e resposta";
    project.aspect = "16:9";
    project.tracks = PAIRS.map(([a, b], i) => {
      const native = wordLayout.letters.find((l) => l.id === a),
        factor = 0.28;
      const t = track(a, `${a} · pulso ${i + 1}`),
        entry = 0.4 + i * 0.18,
        spin = [1.1, 0.95, 1.2, 0.95, 1.1, 1.2][i];
      const returnAt = 3.5 + (5 - i) * 0.14;
      Object.assign(t, {
        position: { x: native.position[0] * factor, y: native.position[1] * factor },
        scale: native.scale * factor,
      });
      t.steps = [
        step("hold", { duration: entry }),
        step("rotate", { degrees: 90, duration: 0.36, easing: "easeIn" }),
        step("morph", { target: b, duration: 0.44 }),
        step("rotate", { degrees: 360, duration: spin }),
        step("hold", { duration: returnAt - entry - 0.36 - 0.44 - spin }),
        step("morph", { target: a, duration: 0.44 }),
        step("rotate", { degrees: -90, duration: 0.36, easing: "easeOut" }),
        step("hold", { duration: 5.8 - returnAt - 0.8 }),
      ];
      return t;
    });
  }
  return project;
}
export function sanitizeProject(input) {
  if (
    input?.format !== "mattar-spatial" ||
    input.version !== 2 ||
    !Array.isArray(input.tracks) ||
    !input.tracks.length ||
    input.tracks.length > 12
  )
    throw new Error("Escolha um roteiro da Matriz Espacial (.json).");
  const number = (x, fallback, min, max) =>
    Number.isFinite(Number(x)) ? Math.max(min, Math.min(max, Number(x))) : fallback;
  const color = (x, f) => (/^#[0-9a-f]{6}$/i.test(x) ? x : f);
  const p = {
    format: "mattar-spatial",
    version: 2,
    id: uid(),
    name: String(input.name || "Roteiro importado").slice(0, 100),
    color: color(input.color, "#181814"),
    background: color(input.background, "#f2efe7"),
    aspect: ["1:1", "16:9", "9:16"].includes(input.aspect) ? input.aspect : "1:1",
    geometry: input.geometry === "silhouette" ? "silhouette" : "volume",
    speed: number(input.speed, 1, 0.25, 3),
    loop: Boolean(input.loop),
    tracks: [],
  };
  for (const source of input.tracks) {
    if (!ASSET_IDS.includes(source.startAsset))
      throw new Error("O roteiro contém uma forma fora desta biblioteca.");
    const t = track(source.startAsset, String(source.name || source.startAsset).slice(0, 60));
    Object.assign(t, {
      startAngle: number(source.startAngle, 0, -36000, 36000),
      delay: number(source.delay, 0, 0, 120),
      scale: number(source.scale, 1, 0.05, 2),
      position: {
        x: number(source.position?.x, 0, -3, 3),
        y: number(source.position?.y, 0, -3, 3),
      },
      enabled: source.enabled !== false,
    });
    for (const key of ["entrance", "exit"]) {
      const transition = source[key];
      if (transition?.type !== "line") continue;
      t[key] = {
        type: "line",
        start: number(transition.start, 0, 0, 120),
        duration: number(transition.duration, 0.65, 0.1, 10),
        baseline: number(transition.baseline, -0.28, -3, 3),
        lineFraction: number(transition.lineFraction, 0.12, 0.02, 0.4),
        easing: ["polished", "smooth", "easeOut"].includes(transition.easing)
          ? transition.easing
          : "polished",
      };
    }
    for (const s of (Array.isArray(source.steps) ? source.steps : []).slice(0, 100)) {
      if (!["rotate", "morph", "hold"].includes(s.type)) continue;
      if (s.type === "morph" && !ASSET_IDS.includes(s.target))
        throw new Error("Destino de transformação inválido.");
      t.steps.push(
        step(s.type, {
          duration: number(s.duration, 1.8, 0.1, 60),
          easing: ["linear", "smooth", "polished", "easeIn", "easeOut"].includes(s.easing)
            ? s.easing
            : "smooth",
          degrees: number(s.degrees, 90, -1080, 1080),
          target: s.target,
          experimental: Boolean(s.experimental),
          prepareDuration: number(s.prepareDuration, 1.5, 0.1, 30),
        }),
      );
    }
    p.tracks.push(t);
  }
  return p;
}
