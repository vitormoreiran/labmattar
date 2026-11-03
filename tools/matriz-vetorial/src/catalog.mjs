import libraryData from "./library.json";

// Asset metadata lives here; prepared transformation pairs live in timeline.mjs.
export const library = libraryData;
export const assets = new Map(library.assets.map((asset) => [asset.id, asset]));
