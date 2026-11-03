import { ease } from "./timeline.mjs";

export function exitAt(exit, time) {
  if (!exit || time <= exit.start) return null;
  if (time >= exit.start + exit.duration) return { hidden: true };
  return entranceAt({ ...exit, start: 0 }, exit.start + exit.duration - time);
}

export function entranceAt(entrance, time) {
  if (!entrance || time >= entrance.start + entrance.duration) return null;
  if (time <= entrance.start) return { hidden: true };
  const local = (time - entrance.start) / entrance.duration;
  const lineFraction = entrance.lineFraction ?? 0.12;
  return {
    hidden: false,
    line: ease(Math.min(1, local / lineFraction), "easeOut"),
    morph: ease(
      Math.max(0, (local - lineFraction) / (1 - lineFraction)),
      entrance.easing ?? "polished",
    ),
  };
}
