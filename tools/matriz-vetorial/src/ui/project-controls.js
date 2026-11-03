import { library, assets } from "../catalog.mjs";
import { pairsFor } from "../timeline.mjs";
import { trackDestination, iconRotationStep } from "../script-controls.mjs";
import { esc, field } from "./dom.js";

export function renderScriptControls(state, t) {
  const destination = trackDestination(t),
    turn = iconRotationStep(t),
    rate = state.project.speed || 1;
  const letter =
    assets.get(t.startAsset)?.kind === "letter"
      ? t.startAsset
      : t.steps.find((s) => s.type === "morph" && assets.get(s.target)?.kind === "letter")?.target;
  const prepared = pairsFor(state.project.geometry).find(([a]) => a === letter)?.[1],
    morph = t.steps.find((s) => s.type === "morph");
  const scope = /* html */ `<div class="inspector-scope" role="tablist" aria-label="O que editar"><button role="tab" aria-selected="${state.inspectorTab === "letter"}" data-action="inspector-scope" data-value="letter">Esta letra</button><button role="tab" aria-selected="${state.inspectorTab === "project"}" data-action="inspector-scope" data-value="project">Roteiro inteiro</button></div>`;
  if (state.inspectorTab === "project")
    return (
      scope +
      /* html */ `<section class="property focused-property"><h3>Velocidade geral</h3><p>Acelere ou desacelere todas as letras juntas.</p><div class="tempo-presets">${[
        [0.75, "Mais lento"],
        [1, "Original"],
        [1.5, "Mais rápido"],
      ]
        .map(
          ([v, n]) =>
            /* html */ `<button class="${Math.abs(rate - v) < 0.001 ? "active" : ""}" data-action="speed" data-value="${v}" aria-pressed="${Math.abs(rate - v) < 0.001}">${n}</button>`,
        )
        .join(
          "",
        )}</div><div class="range-caption"><span>0,25×</span><b>${rate.toLocaleString("pt-BR")}×</b><span>3×</span></div><input id="project-speed" aria-label="Velocidade do roteiro inteiro" type="range" min="0.25" max="3" step="0.05" value="${rate}"><div class="duration-summary"><span>Duração do roteiro</span><strong>${state.compiled.duration.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s</strong></div></section>`
    );
  return (
    scope +
    `${state.project.tracks.length > 1 ? /* html */ `<section class="property letter-picker"><h3>Escolha a letra</h3><div class="letter-tabs">${state.project.tracks.map((x) => /* html */ `<button data-action="track" data-id="${x.id}" class="${x.id === t.id ? "active" : ""}" aria-label="Ajustar ${esc(x.name)}" aria-pressed="${x.id === t.id}">${esc(x.startAsset)}</button>`).join("")}</div></section>` : ""}<section class="property focused-property"><h3>Transformação</h3><div class="transformation-pair"><div><img src="${assets.get(letter || t.startAsset).front}" alt="${esc(letter || t.startAsset)}"><span>${esc(letter || t.startAsset)}</span></div><span class="pair-arrow">→</span><div>${destination ? /* html */ `<img src="${assets.get(destination).front}" alt="${destination}"><span>${destination}</span>` : "<span>Escolher</span>"}</div></div><p class="destination-name">${destination ? esc(assets.get(destination).name) : "Escolha o ícone de chegada"}</p><button class="full change-destination" data-action="choose-destination" aria-expanded="${state.choosingDestination}">${state.choosingDestination ? "Fechar opções" : "Trocar ícone"}</button>${
      state.choosingDestination
        ? /* html */ `<div class="destination-chooser"><p>Escolha o destino de ${esc(letter || t.startAsset)}.</p><div class="destination-grid">${library.assets
            .filter((a) => a.kind === "picto")
            .sort((a, b) => Number(b.id === prepared) - Number(a.id === prepared))
            .map(
              (a) =>
                /* html */ `<button data-action="destination" data-id="${a.id}" class="destination-card ${a.id === destination ? "selected" : ""}" aria-label="Transformar ${esc(letter || t.startAsset)} em ${a.id} · ${esc(a.name)}" aria-pressed="${a.id === destination}" title="${esc(a.name)}"><img src="${a.front}" alt=""><span>${a.id}${a.id === prepared ? " ✓" : ""}</span></button>`,
            )
            .join(
              "",
            )}</div><p class="chooser-hint">✓ Passagem preparada. Outros destinos criam uma passagem experimental.</p></div>`
        : destination && destination !== prepared
          ? '<p class="chooser-hint">Passagem experimental</p>'
          : ""
    }${morph ? /* html */ `<div class="duration-control">${field("Tempo da transformação", /* html */ `<div class="number-with-unit"><input id="morph-duration" aria-label="Tempo da transformação em segundos" type="number" min="0.1" max="60" step="0.1" value="${+(morph.duration / rate).toFixed(2)}"><span>s</span></div>`)}<small>Usado na ida e na volta.</small></div>` : ""}</section><section class="property focused-property"><h3>Giro do ícone</h3>${
      turn
        ? /* html */ `<div class="turn-presets">${[
            [180, "½ volta"],
            [360, "1 volta"],
            [720, "2 voltas"],
          ]
            .map(
              ([v, n]) =>
                /* html */ `<button data-action="icon-turn" data-value="${v}" class="${Math.abs(turn.degrees) === v ? "active" : ""}" aria-pressed="${Math.abs(turn.degrees) === v}">${n}</button>`,
            )
            .join("")}</div><div class="grid2 motion-fields">${field(
            "Ângulo",
            /* html */ `<select id="icon-turn">${[90, 180, 270, 360, 720, Math.abs(turn.degrees)]
              .filter((v, i, a) => a.indexOf(v) === i)
              .sort((a, b) => a - b)
              .map(
                (v) =>
                  /* html */ `<option value="${v}" ${Math.abs(turn.degrees) === v ? "selected" : ""}>${v}°</option>`,
              )
              .join("")}</select>`,
          )}${field("Tempo do giro", /* html */ `<div class="number-with-unit"><input id="spin-duration" aria-label="Tempo do giro em segundos" type="number" min="0.1" max="60" step="0.1" value="${+(turn.duration / rate).toFixed(2)}"><span>s</span></div>`)}</div><div class="direction-options">${[
            [1, "↻ Horário"],
            [-1, "↺ Anti-horário"],
          ]
            .map(
              ([v, n]) =>
                /* html */ `<button data-action="icon-direction" data-value="${v}" class="${Math.sign(turn.degrees) === v ? "active" : ""}" aria-pressed="${Math.sign(turn.degrees) === v}">${n}</button>`,
            )
            .join("")}</div>`
        : "<p>Escolha um ícone para configurar o movimento.</p>"
    }</section>`
  );
}
