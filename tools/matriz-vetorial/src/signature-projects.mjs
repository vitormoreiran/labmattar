import assembly from "./roteiros/01-acervo-mattar.json" with { type: "json" };
import response from "./roteiros/02-abertura-fecho.json" with { type: "json" };

// Review projects use the existing editor and its portable project format.
export const signatureProjects = {
  "acervo-mattar": assembly,
  "abertura-fecho": response,
};

export function signatureFromLink(search) {
  const requested = new URLSearchParams(search).get("roteiro");
  const aliases = {
    "forma-encontra-m": "acervo-mattar",
    "mattar-acento-m": "abertura-fecho",
  };
  const key = Object.hasOwn(aliases, requested) ? aliases[requested] : requested;
  return Object.hasOwn(signatureProjects, key) ? signatureProjects[key] : null;
}
