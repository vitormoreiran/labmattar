import { bridgeFor, routeTrack } from "./timeline.mjs";
export const trackDestination = (t) =>
  t.steps.find((s) => s.type === "morph" && /^P[1-9]$/.test(s.target))?.target ??
  (/^P[1-9]$/.test(t.startAsset) ? t.startAsset : null);
export function iconRotationStep(t) {
  let asset = t.startAsset;
  const destination = trackDestination(t);
  for (const s of t.steps) {
    if (s.type === "morph") asset = s.target;
    else if (s.type === "rotate" && asset === destination) return s;
  }
  return null;
}
export function setTrackDestination(t, target, geometry) {
  if (!/^P[1-9]$/.test(target)) throw new Error("Ícone inválido.");
  const previous = trackDestination(t);
  if (previous) {
    if (t.startAsset === previous) t.startAsset = target;
    for (const s of t.steps) if (s.type === "morph" && s.target === previous) s.target = target;
    t.name = t.name.replace(new RegExp(`\\b${previous}\\b`, "g"), target);
  } else t.steps = routeTrack(t.startAsset, target).steps;
  let from = t.startAsset;
  for (const s of t.steps)
    if (s.type === "morph") {
      s.experimental = !bridgeFor(from, s.target, geometry);
      from = s.target;
    }
  return t;
}
