import profile from "./roteiros/03-perfil-corte.json" with { type: "json" };
import handoff from "./roteiros/04-passagem-bastao.json" with { type: "json" };
import interval from "./roteiros/05-forma-intervalo.json" with { type: "json" };

export const transitionOptions = [
  {
    key: "perfil-corte",
    name: "Perfil · corte",
    project: profile,
    duration: "1,7",
    cut: "0,56",
    preview: "perfil",
  },
  {
    key: "passagem-bastao",
    name: "Passagem de bastão",
    project: handoff,
    duration: "1,75",
    cut: "0,53",
    preview: "palavra",
  },
  {
    key: "forma-intervalo",
    name: "Forma · intervalo",
    project: interval,
    duration: "2,2",
    cut: "1,45",
    preview: "forma",
  },
];
export const transitionProjects = Object.fromEntries(
  transitionOptions.map((option) => [option.key, option.project]),
);
