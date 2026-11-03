import { createProject, compileProject } from "./timeline.mjs";
import { reviewProjects } from "./review-projects.mjs";

export function motionProjects() {
  const entries = [
    {
      id: "m-form",
      title: "M + Forma",
      status: "approved",
      group: "assinaturas",
      project: createProject("m-form"),
    },
    {
      id: "mattar-rhythm",
      title: "Onda e resposta",
      status: "approved",
      group: "assinaturas",
      project: createProject("mattar-rhythm"),
    },
    {
      id: "composition",
      title: "Composição MATTAR",
      status: "approved",
      group: "assinaturas",
      project: createProject("composition"),
    },
    {
      id: "acervo-mattar",
      title: "Acervo vira MATTAR",
      status: "review",
      group: "assinaturas",
      project: reviewProjects["acervo-mattar"],
    },
    {
      id: "abertura-fecho",
      title: "Abertura e fecho",
      status: "review",
      group: "assinaturas",
      project: reviewProjects["abertura-fecho"],
    },
    {
      id: "perfil-corte",
      title: "Perfil · corte",
      status: "review",
      group: "transicoes",
      cut: 0.56,
      project: reviewProjects["perfil-corte"],
    },
    {
      id: "passagem-bastao",
      title: "Passagem de bastão",
      status: "review",
      group: "transicoes",
      cut: 0.53,
      project: reviewProjects["passagem-bastao"],
    },
    {
      id: "forma-intervalo",
      title: "Forma · intervalo",
      status: "review",
      group: "transicoes",
      cut: 1.45,
      project: reviewProjects["forma-intervalo"],
    },
  ];
  return entries.map((entry) => ({ ...entry, duration: compileProject(entry.project).duration }));
}
