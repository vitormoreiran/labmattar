import { signatureProjects, signatureFromLink } from "./signature-projects.mjs";
import { transitionProjects } from "./transition-projects.mjs";
import { createProject } from "./timeline.mjs";

export const reviewProjects = { ...signatureProjects, ...transitionProjects };
export function reviewFromLink(search) {
  const signature = signatureFromLink(search);
  if (signature) return signature;
  const key = new URLSearchParams(search).get("roteiro");
  if (["m-form", "mattar-rhythm", "composition"].includes(key)) return createProject(key);
  return Object.hasOwn(transitionProjects, key) ? transitionProjects[key] : null;
}
