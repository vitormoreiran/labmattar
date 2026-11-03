import { trackDestination, iconRotationStep, setTrackDestination } from "./script-controls.mjs";
import { Stage } from "./stage.js";
import { library, assets } from "./catalog.mjs";
import {
  createProject,
  track,
  step,
  compileProject,
  compileTrack,
  poseAt,
  routeTrack,
  bridgeFor,
  pairsFor,
  sanitizeProject,
  wrap,
  uid,
} from "./timeline.mjs";
import { exportProjectVideo } from "./export-video.js";
import { renderScriptControls } from "./ui/project-controls.js";
import { $, $$, esc, field } from "./ui/dom.js";
import { icon } from "./ui/icons.js";
const LOCAL = "mattar-spatial-current-v2",
  SAVED = "mattar-spatial-projects-v2";
let project = createProject();
try {
  const raw = localStorage.getItem(LOCAL);
  if (raw) project = sanitizeProject(JSON.parse(raw));
} catch {}
const state = {
  project,
  compiled: compileProject(project),
  trackId: project.tracks[0].id,
  stepId: null,
  selectedAsset: "M",
  previewAngle: 0,
  mode: "timeline",
  libraryTab: "routes",
  inspectorTab: "letter",
  choosingDestination: false,
  filter: "all",
  search: "",
  playing: false,
  time: 0,
  busy: false,
  preparation: 0,
  history: [],
  exporting: false,
  modal: null,
  style: "silhouette",
};

function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  $("#toasts").append(el);
  setTimeout(() => el.remove(), 4500);
}
function saveCurrent() {
  try {
    localStorage.setItem(LOCAL, JSON.stringify(state.project));
  } catch {
    toast("Não foi possível salvar neste navegador. Baixe o roteiro para guardar uma cópia.");
  }
}
function snapshot() {
  state.history.push(JSON.stringify(state.project));
  if (state.history.length > 40) state.history.shift();
}
function currentTrack() {
  return state.project.tracks.find((t) => t.id === state.trackId) || state.project.tracks[0];
}
function currentCompiled() {
  return compileTrack(currentTrack(), state.project.geometry, state.project.speed);
}
function download(content, name, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function slug() {
  return (
    state.project.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "roteiro-mattar"
  );
}
function stop() {
  state.playing = false;
  updateTransport();
}
async function mutate(callback, { seekEnd = false } = {}) {
  if (state.exporting) return;
  stop();
  snapshot();
  callback(state.project);
  state.mode = "timeline";
  state.compiled = compileProject(state.project);
  if (seekEnd) state.time = Math.min(state.compiled.duration, currentCompiled().duration);
  else state.time = Math.min(state.time, state.compiled.duration);
  saveCurrent();
  renderLibrary();
  renderTimeline();
  renderInspector();
  updateHeader();
  await prepare();
}
function updateHeader() {
  sizeStage();
  $("#project-name").value = state.project.name;
  $("#undo").disabled = !state.history.length;
  $("#loop").checked = state.project.loop;
  $("#stage-area").style.background = state.project.background;
  $$('[data-action="geometry"]').forEach((b) =>
    b.classList.toggle("active", b.dataset.value === state.project.geometry),
  );
}
function renderShell() {
  $("#app").innerHTML =
    `<div class="app"><header class="topbar"><div class="brand"><div class="brand-mark">MV</div><div><h1>Matriz Vetorial</h1><span>LAB MATTAR · ESPACIAL</span></div></div><input class="project-title" id="project-name" aria-label="Nome do roteiro" maxlength="100"><div class="top-actions"><a href="./legacy.html" target="_blank" rel="noopener">Editor de contornos ↗</a><button class="quiet small" data-action="refs">Referências</button><button class="quiet small" data-action="help" aria-label="Como usar">?</button><button class="small open-button" data-action="open">Abrir</button><button class="small" data-action="save">Salvar</button><button class="primary small" data-action="export">Exportar</button></div></header><div class="workspace"><aside class="library" aria-label="Roteiros e formas"><div class="section-head"><span class="eyebrow">Roteiros</span><span class="pill">3 bases</span></div><div class="library-tabs"><button data-action="library-tab" data-value="routes" class="active">Roteiros</button><button data-action="library-tab" data-value="forms">Explorar formas</button></div><div id="library-content"></div></aside><main class="stage-panel"><div class="stage-header"><div><h2 class="stage-title" id="stage-title">Composição</h2><p class="stage-subtitle" id="stage-subtitle">Giros e transformações em continuidade</p></div><div class="stage-controls"><button data-action="geometry" data-value="volume">Assinatura</button><button data-action="geometry" data-value="silhouette">Estudos</button><button class="mobile-library icon-btn" data-action="inspector" aria-label="Abrir propriedades">${icon("settings")}</button></div></div><div class="stage-wrap" id="stage-wrap"><div id="stage-area" class="stage-area"></div><div class="stage-status"><span class="status-dot"></span><span id="stage-status">Preparando as formas originais</span></div><div id="loading" class="stage-loading"><div><div class="loading-dot"></div><span id="loading-message">Carregando as formas originais…</span></div></div></div><div class="orientation"><span class="eyebrow">Vista</span><span class="angle-readout" id="angle-readout">0°</span><input id="angle" type="range" min="0" max="720" step="1" value="0" aria-label="Orientação da forma"><div class="pose-buttons"><button data-action="pose" data-angle="0">0°</button><button data-action="pose" data-angle="90">90°</button><button data-action="pose" data-angle="180">180°</button><button data-action="pose" data-angle="270">270°</button><button data-action="pose" data-angle="360">360°</button></div></div></main><aside class="inspector" id="inspector" aria-label="Propriedades"></aside></div><section class="timeline-panel" aria-label="Roteiro e pistas"><div class="transport"><div class="left"><button class="icon-btn quiet" id="undo" data-action="undo" aria-label="Desfazer">${icon("undo")}</button><button class="icon-btn quiet" data-action="start" aria-label="Ir ao início">${icon("start")}</button><button class="play-button" id="play" data-action="play">${icon("play")} REPRODUZIR</button><button class="icon-btn quiet" data-action="end" aria-label="Ir ao final">${icon("end")}</button></div><label class="time-field"><input id="time-input" type="number" min="0" step="0.01" value="0" aria-label="Ir para tempo em segundos"><span>s</span></label><code id="time" hidden>0.00 s</code><input id="scrub" type="range" min="0" max="17" step="0.001" value="0" aria-label="Tempo do roteiro"><span class="duration" id="total-time">17.00 s</span><label class="loop"><input type="checkbox" id="loop">Repetir</label></div><div class="timeline-body" id="timeline-body"></div></section></div><input type="file" id="project-file" accept=".json,application/json" hidden><div id="modal-root"></div>`;
  $("#app").addEventListener("click", handleClick);
  $("#app").addEventListener("change", handleChange);
  $("#project-name").addEventListener("change", (e) =>
    mutate((p) => (p.name = e.target.value || "Roteiro sem nome")),
  );
  $("#scrub").addEventListener("input", (e) => {
    stop();
    state.mode = "timeline";
    state.time = +e.target.value;
    renderFrame();
    updateTransport();
  });
  $("#time-input").addEventListener("input", (e) => {
    if (!Number.isFinite(e.target.valueAsNumber)) return;
    stop();
    state.mode = "timeline";
    state.time = Math.min(state.compiled.duration, Math.max(0, e.target.valueAsNumber));
    renderFrame();
    updateTransport();
  });
  $("#angle").addEventListener("input", (e) => {
    stop();
    state.mode = "library";
    state.previewAngle = +e.target.value;
    previewSelected();
    renderInspector();
  });
  $("#project-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const p = sanitizeProject(JSON.parse(await file.text()));
      await replaceProject(p);
      toast("Roteiro aberto.");
    } catch (error) {
      toast(error.message);
    } finally {
      e.target.value = "";
    }
  });
}
renderShell();
let stage;
function sizeStage() {
  const host = $("#stage-wrap"),
    area = $("#stage-area");
  if (!host || !area) return;
  const ratio =
    state.mode === "library" ? 1 : state.project.aspect.split(":").reduce((a, b) => +a / +b);
  const width = Math.min(host.clientWidth, host.clientHeight * ratio);
  area.style.width = Math.max(1, width) + "px";
  area.style.height = Math.max(1, width / ratio) + "px";
}
new ResizeObserver(() => sizeStage()).observe($("#stage-wrap"));
try {
  stage = new Stage($("#stage-area"), library.assets, toast);
} catch (error) {
  $("#loading-message").textContent = "A prévia espacial precisa de WebGL neste navegador.";
  toast("Não foi possível iniciar a prévia 3D. Verifique a aceleração gráfica do navegador.");
  throw error;
}
function renderLibrary() {
  $$('[data-action="library-tab"]').forEach((b) =>
    b.classList.toggle("active", b.dataset.value === state.libraryTab),
  );
  const el = $("#library-content");
  if (state.libraryTab === "routes") {
    el.innerHTML = `<p class="description" style="margin:0 0 16px">Escolha uma estrutura. Ajuste a velocidade, os destinos e os giros no painel à direita.</p><button class="route-card" data-action="script" data-kind="m-form"><span class="script-number">01 · UMA LETRA</span><strong>M + Forma</strong><div class="script-preview"><img src="${assets.get("M").front}" alt="M"><span>→</span><img src="${assets.get("P8").front}" alt="Forma"></div><span>Giro contínuo · transformação · retorno</span></button><button class="route-card" data-action="script" data-kind="mattar-rhythm"><span class="script-number">02 · SEIS LETRAS</span><strong>Onda e resposta</strong><div class="script-word">MATTAR<span>↗ ↗ ↗ ↘ ↘ ↘</span></div><span>Entrada em onda e retorno na ordem inversa</span></button><button class="route-card" data-action="script" data-kind="composition"><span class="script-number">03 · SEIS LETRAS</span><strong>Composição MATTAR</strong><div class="script-word">MATTAR<span>↻ ↻ ↻ ↻ ↻ ↻</span></div><span>Voltas completas e entradas em sequência</span></button><button class="full" style="width:100%;margin-top:8px" data-action="new">+ Roteiro em branco</button><button class="full" style="width:100%;margin-top:8px" data-action="open">Abrir meus roteiros</button>`;
    return;
  }
  const filtered = library.assets.filter(
    (a) =>
      (state.filter === "all" || a.kind === state.filter) &&
      (!state.search || `${a.id} ${a.name}`.toLowerCase().includes(state.search.toLowerCase())),
  );
  el.innerHTML = `<input class="search" id="search" placeholder="Buscar forma…" aria-label="Buscar na biblioteca" value="${esc(state.search)}"><div class="library-filter"><button data-action="filter" data-value="all" class="${state.filter === "all" ? "active" : ""}">Todas</button><button data-action="filter" data-value="letter" class="${state.filter === "letter" ? "active" : ""}">Letras</button><button data-action="filter" data-value="picto" class="${state.filter === "picto" ? "active" : ""}">Pictos</button></div><div class="asset-grid">${filtered.map((a) => `<button class="asset-card ${state.selectedAsset === a.id ? "selected" : ""}" data-action="asset" data-id="${a.id}" aria-label="Explorar ${esc(a.id + " · " + a.name)}" aria-pressed="${state.selectedAsset === a.id}"><div class="asset-thumb"><img src="${a.front}" alt="" loading="lazy"></div><div><strong>${a.id}</strong><span>${esc(a.name)}</span></div></button>`).join("")}</div><p class="library-note">Escolha uma forma para percorrer suas vistas. Adicione um giro ou encontre uma passagem para outra forma.</p><button class="small" style="width:100%" data-action="new">Novo roteiro</button>`;
  $("#search").addEventListener("input", (e) => {
    const position = e.target.selectionStart;
    state.search = e.target.value;
    renderLibrary();
    const input = $("#search");
    input.focus();
    input.setSelectionRange(position, position);
  });
}

function renderInspector() {
  const t = currentTrack(),
    compiled = currentCompiled(),
    s = t.steps.find((s) => s.id === state.stepId),
    current = compiled.endPose,
    selected = assets.get(state.selectedAsset),
    known = bridgeFor(current.asset, selected.id, state.project.geometry);
  let body = `<div class="inspector-head"><div class="section-head"><span class="eyebrow">${state.mode === "library" ? "Forma selecionada" : "Editar animação"}</span><button class="quiet small mobile-library" data-action="inspector">Fechar</button></div><h2>${state.mode === "library" ? esc(selected.id + " · " + selected.name) : esc(state.inspectorTab === "project" ? state.project.name : t.name)}</h2></div>`;
  if (state.mode === "library") {
    const links = pairsFor(state.project.geometry).flatMap(([a, b]) =>
      a === selected.id ? [b] : b === selected.id ? [a] : [],
    );
    body += `<section class="property"><h3>Explorar a forma</h3><p>Arraste a orientação para acompanhar o volume em uma volta completa.</p><span class="badge">Geometria original</span><div class="grid2" style="margin-top:12px"><button class="small" data-action="spin-preview">Girar 360°</button><button class="small" data-action="style">${state.style === "shaded" ? "Ver silhueta" : "Ver com luz"}</button></div></section><section class="property"><h3>Usar no roteiro</h3><p>Pista atual: <b>${esc(t.name)}</b><br>Termina em ${current.asset}, ${Math.round(current.angle)}°.</p><button class="primary full" data-action="append-morph" data-target="${selected.id}" ${selected.id === current.asset ? "disabled" : ""}>Transformar em ${selected.id}</button><button class="full" data-action="new-track" data-id="${selected.id}" ${state.project.tracks.length >= 12 ? "disabled" : ""}>Nova pista com ${selected.id}</button>${!known && selected.id !== current.asset ? '<p class="note">Esta combinação ainda não tem uma passagem preparada. Você poderá adicioná-la como experimento.</p>' : ""}</section><section class="property"><h3>Passagens preparadas</h3><div class="bridge-list">${links.length ? links.map((id) => `<button data-action="preview-route" data-from="${selected.id}" data-to="${id}">${selected.id} ↔ ${id}</button>`).join("") : "<p>Giro disponível. Novas combinações podem ser experimentadas no roteiro.</p>"}</div></section>`;
  } else {
    body += renderScriptControls(state, t);
    if (state.inspectorTab === "letter") {
      body += `<details class="advanced-controls"><summary>Posição e escala</summary><section class="property"><h3>Composição</h3>${field("Pista", `<select id="track-select">${state.project.tracks.map((x) => `<option value="${x.id}" ${x.id === t.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>`)}<div style="margin-top:10px">${field("Vista inicial (graus)", `<input data-track="startAngle" type="number" value="${t.startAngle}" min="-36000" max="36000" step="90">`)}</div><div class="grid2" style="margin-top:12px">${field("Começar em (s)", `<input data-track="delay" type="number" value="${t.delay}" min="0" max="120" step="0.1">`)}${field("Escala", `<input data-track="scale" type="number" value="${+t.scale.toFixed(3)}" min="0.05" max="2" step="0.05">`)}</div><div class="grid2" style="margin-top:10px">${field("Posição X", `<input data-position="x" type="number" value="${+t.position.x.toFixed(3)}" min="-3" max="3" step="0.05">`)}${field("Posição Y", `<input data-position="y" type="number" value="${+t.position.y.toFixed(3)}" min="-3" max="3" step="0.05">`)}</div><div class="grid2" style="margin-top:10px"><button class="small" data-action="duplicate-track">Duplicar pista</button><button class="small danger" data-action="remove-track" ${state.project.tracks.length === 1 ? "disabled" : ""}>Excluir pista</button></div></section></details>`;
      if (s) {
        const warning = compiled.warnings.find((w) => w.stepId === s.id);
        const labels = { rotate: "Giro", morph: "Transformação", hold: "Pausa" };
        body += `${warning ? `<section class="property"><p class="danger">${esc(warning.reason)}: ${warning.from} → ${warning.to}.</p><button class="full" data-action="allow-step">Usar como experimento</button></section>` : ""}<section class="property"><h3>${labels[s.type]} selecionad${s.type === "rotate" ? "o" : "a"}</h3><div class="grid2">${field("Duração (s)", `<input data-step="duration" type="number" value="${s.duration}" min="0.1" max="60" step="0.1">`)}${field(
          "Ritmo",
          `<select data-step="easing">${[
            ["polished", "Acabamento suave"],
            ["smooth", "Suave"],
            ["linear", "Constante"],
            ["easeIn", "Acelerar"],
            ["easeOut", "Desacelerar"],
          ]
            .map(
              ([v, l]) => `<option value="${v}" ${s.easing === v ? "selected" : ""}>${l}</option>`,
            )
            .join("")}</select>`,
        )}</div>`;
        if (s.type === "rotate")
          body +=
            field(
              "Giro acumulado (graus)",
              `<input data-step="degrees" type="number" value="${s.degrees}" min="-1080" max="1080" step="90">`,
            ) +
            `<p class="note">Positivo continua o giro; negativo inverte o sentido. Uma volta de 360° permanece no percurso.</p>`;
        if (s.type === "morph")
          body +=
            field(
              "Forma de chegada",
              `<select data-step="target">${library.assets.map((a) => `<option value="${a.id}" ${s.target === a.id ? "selected" : ""}>${a.id} · ${esc(a.name)}</option>`).join("")}</select>`,
            ) +
            `<p class="note">O roteiro prepara a vista de passagem de 90° antes de transformar, preservando a volta acumulada.</p><span class="badge ${s.experimental ? "experimental" : ""}">${s.experimental ? "Experimento" : "Com base no acervo"}</span>`;
        body += `<div class="grid2" style="margin-top:12px"><button class="small" data-action="move-step" data-delta="-1">← Mover</button><button class="small" data-action="move-step" data-delta="1">Mover →</button></div><button class="full small danger" data-action="remove-step">Remover trecho</button></section>`;
      }
      body += `<details class="advanced-controls"><summary>Adicionar e editar trechos</summary><section class="property"><h3>Continuar o percurso</h3><p>Saída: <b>${current.asset}</b> · ${Math.round(current.angle)}°</p><div class="motion-actions"><button data-action="rotate" data-degrees="90">+ Girar 90°</button><button data-action="rotate" data-degrees="180">+ Girar 180°</button><button data-action="rotate" data-degrees="360">+ Volta 360°</button><button data-action="hold">+ Pausa</button></div><div style="margin-top:12px">${field(
        "Transformar em",
        `<select id="morph-target">${library.assets
          .filter((a) => a.id !== current.asset)
          .map(
            (a) =>
              `<option value="${a.id}" ${bridgeFor(current.asset, a.id, state.project.geometry) ? 'data-known="true"' : ""}>${a.id} · ${esc(a.name)}${bridgeFor(current.asset, a.id, state.project.geometry) ? " ✓" : ""}</option>`,
          )
          .join("")}</select>`,
      )}</div><button class="primary full" data-action="append-morph">Adicionar transformação</button></section></details>`;
    }
  }
  if (state.mode === "library" || state.inspectorTab === "project")
    body += `<section class="property"><h3>Aparência</h3><div class="grid2">${field("Formas", `<input id="form-color" type="color" value="${state.project.color}">`)}${field("Fundo", `<input id="background-color" type="color" value="${state.project.background}">`)}</div><div style="margin-top:12px">${field("Enquadramento", `<select id="aspect">${["1:1", "16:9", "9:16"].map((x) => `<option ${state.project.aspect === x ? "selected" : ""}>${x}</option>`).join("")}</select>`)}</div><button class="full small" data-action="style">${state.style === "shaded" ? "Ver silhueta plana" : "Ver volume com luz"}</button></section>`;
  $("#inspector").innerHTML = body;
}
function renderTimeline() {
  const c = state.compiled,
    total = c.duration;
  const ticks = Array.from({ length: 8 }, (_, i) => `${((total * i) / 8).toFixed(1)}s`);
  let html = `<div class="ruler">${ticks.map((x) => `<span>${x}</span>`).join("")}</div>`;
  for (const t of state.project.tracks) {
    const compiled = compileTrack(t, state.project.geometry, state.project.speed);
    html += `<div class="track-row"><div class="track-label ${t.id === state.trackId ? "active" : ""} ${!t.enabled ? "disabled" : ""}"><span class="dot"></span><button data-action="track" data-id="${t.id}" title="${esc(t.name)}">${esc(t.name)}</button><button class="icon-btn quiet" data-action="toggle-track" data-id="${t.id}" aria-label="${t.enabled ? "Ocultar" : "Mostrar"} pista ${esc(t.name)}">${icon("eye")}</button></div><div class="track-lane" data-lane="${t.id}"><div class="delay-space" style="width:${(compiled.delay / total) * 100}%"></div>${compiled.segments
      .map((s) => {
        let label =
          s.type === "rotate"
            ? `${s.automatic ? "↗ " : ""}${s.to.angle - s.from.angle > 0 ? "↻" : "↺"} ${Math.round(Math.abs(s.to.angle - s.from.angle))}°`
            : s.type === "morph"
              ? `${s.from.asset} → ${s.to.asset}`
              : "Pausa";
        return `<button class="clip ${s.type} ${s.automatic ? "automatic" : ""} ${s.stepId === state.stepId && t.id === state.trackId ? "selected" : ""}" data-action="clip" data-track="${t.id}" data-step="${s.stepId}" data-start="${s.start}" data-end="${s.end}" style="width:${(s.duration / total) * 100}%" title="${esc(label)} · ${s.duration.toFixed(2)} s">${esc(label)}</button>`;
      })
      .join(
        "",
      )}${compiled.warnings.map((w) => `<button class="clip warning" data-action="clip" data-track="${t.id}" data-step="${w.stepId}" data-start="${w.time}" data-end="${w.time}" title="${esc(w.reason)}">Revisar ${w.from} → ${w.to}</button>`).join("")}${!compiled.segments.length ? '<span class="empty-line">Adicione um giro ou uma transformação</span>' : ""}<div class="playhead" style="left:${(state.time / total) * 100}%"></div></div></div>`;
  }
  html += `<div class="timeline-footer"><button data-action="new-track" data-id="${state.selectedAsset}" ${state.project.tracks.length >= 12 ? "disabled" : ""}>+ Nova pista</button><button data-action="composition">Composição MATTAR</button><button class="text-btn" data-action="timeline">Voltar ao roteiro</button></div>`;
  $("#timeline-body").innerHTML = html;
  $("#scrub").max = total;
  $("#total-time").textContent = `${total.toFixed(2)} s`;
  updateTransport();
}
function updateTransport() {
  $("#time").textContent = `${state.time.toFixed(2)} s`;
  if (document.activeElement !== $("#time-input")) $("#time-input").value = state.time.toFixed(2);
  $("#time-input").max = state.compiled.duration;
  $("#scrub").value = state.time;
  $("#play").innerHTML =
    icon(state.playing ? "pause" : "play") + (state.playing ? " PAUSAR" : " REPRODUZIR");
  $("#play").disabled = state.busy || state.exporting;
  $$(".playhead").forEach(
    (e) => (e.style.left = `${(state.time / state.compiled.duration) * 100}%`),
  );
  $$('[data-action="clip"]').forEach((e) =>
    e.classList.toggle("active", state.time >= +e.dataset.start && state.time < +e.dataset.end),
  );
}
async function prepare() {
  const generation = ++state.preparation;
  state.busy = true;
  $("#loading").hidden = false;
  $("#loading").style.display = "grid";
  stage.geometry = state.project.geometry;
  updateTransport();
  try {
    await stage.prepare(state.compiled);
    if (generation !== state.preparation) return;
    state.busy = false;
    $("#loading").style.display = "none";
    renderFrame();
    updateTransport();
  } catch (error) {
    console.error("Prepare failed", error);
    if (generation !== state.preparation) return;
    state.busy = false;
    $("#loading-message").textContent = error.message;
    toast(error.message);
    updateTransport();
  }
}
function renderFrame() {
  if (state.busy || state.exporting) return;
  sizeStage();
  if (state.mode === "library") {
    previewSelected();
    return;
  }
  stage.renderProject(state.compiled, state.time, state.project.color);
  $("#stage-title").textContent = "Composição · " + state.project.name;
  $("#stage-subtitle").textContent =
    `${state.project.tracks.length} pista${state.project.tracks.length > 1 ? "s" : ""} · ${state.project.geometry === "volume" ? "Percursos da assinatura" : "Estudos de silhueta"}`;
  $("#stage-wrap").classList.remove("library-mode");
  const t =
    state.compiled.tracks.find((c) => c.track.id === state.trackId) || state.compiled.tracks[0];
  if (t) {
    const p = poseAt(t, state.time);
    const a = p.type === "morph" ? p.from.angle : p.pose.angle;
    $("#angle-readout").textContent = `${Math.round(a)}°`;
    $("#angle").value = Math.min(720, Math.max(0, a));
    $("#angle").disabled = true;
    $("#stage-status").textContent =
      p.type === "morph"
        ? `${p.from.asset} → ${p.to.asset} · ${Math.round(p.local * 100)}%`
        : `${p.pose.asset} · ${p.type === "rotate" ? "Giro espacial" : "Vista"} ${Math.round(a)}°`;
  }
}
let previewToken = 0;
async function previewSelected() {
  const token = ++previewToken,
    id = state.selectedAsset,
    angle = state.previewAngle;
  sizeStage();
  try {
    stage.geometry = state.project.geometry;
    await stage.model(id);
    if (token !== previewToken || state.mode !== "library") return;
    await stage.preview(id, angle, state.project.color);
    if (token !== previewToken || state.mode !== "library") return;
    const a = assets.get(state.selectedAsset);
    $("#stage-title").textContent = a.id + " · " + a.name;
    $("#stage-subtitle").textContent =
      state.project.geometry === "volume"
        ? "Volume da montagem existente"
        : "Geometria dos estudos de silhueta";
    $("#stage-wrap").classList.add("library-mode");
    $("#angle").disabled = false;
    $("#angle").value = state.previewAngle;
    $("#angle-readout").textContent = `${Math.round(state.previewAngle)}°`;
    $("#stage-status").textContent =
      `Vista ${Math.round(wrap(state.previewAngle))}° · giro ${Math.round(state.previewAngle)}°`;
  } catch (error) {
    toast(error.message);
  }
}
async function replaceProject(p) {
  state.inspectorTab = "letter";
  state.choosingDestination = false;
  stop();
  snapshot();
  state.project = p;
  state.trackId = p.tracks[0].id;
  state.stepId = null;
  state.selectedAsset = p.tracks[0].startAsset;
  state.time = 0;
  state.mode = "timeline";
  state.compiled = compileProject(p);
  saveCurrent();
  updateHeader();
  renderLibrary();
  renderTimeline();
  renderInspector();
  await prepare();
}
function closeModal() {
  state.modal = null;
  $("#modal-root").replaceChildren();
}
function modal(title, body, after) {
  state.modal = title;
  $("#modal-root").innerHTML =
    `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><h2>${esc(title)}</h2><button class="icon-btn quiet" data-close aria-label="Fechar">${icon("close")}</button></div><div class="modal-body">${body}</div></section></div>`;
  $("#modal-root [data-close]").onclick = closeModal;
  $(".modal-backdrop").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-backdrop") && !state.exporting) closeModal();
  });
  after?.();
  $(".modal [data-close]")?.focus();
}
async function appendMorph(target, experimental = false) {
  const t = currentTrack(),
    from = currentCompiled().endPose.asset;
  if (target === from) {
    toast("A pista já termina nesta forma. Adicione um giro para continuar.");
    return;
  }
  const known = bridgeFor(from, target, state.project.geometry);
  if (!known && !experimental) {
    modal(
      "Experimentar uma nova passagem",
      `<p>A combinação <b>${from} → ${target}</b> ainda não faz parte dos percursos preparados. A ferramenta pode construir uma passagem entre os perfis, que ficará marcada como experimento.</p><div class="row"><button class="primary" id="confirm-experiment">Adicionar experimento</button><button id="cancel-experiment">Voltar</button></div>`,
      () => {
        $("#confirm-experiment").onclick = () => {
          closeModal();
          appendMorph(target, true);
        };
        $("#cancel-experiment").onclick = closeModal;
      },
    );
    return;
  }
  const s = step("morph", { target, duration: 2.5, experimental: !known });
  await mutate(
    () => {
      t.steps.push(s);
      state.stepId = s.id;
    },
    { seekEnd: true },
  );
}
async function handleClick(event) {
  const b = event.target.closest("[data-action]");
  if (!b || b.disabled || state.exporting) return;
  const action = b.dataset.action;
  if (action === "inspector-scope") {
    state.inspectorTab = b.dataset.value;
    state.choosingDestination = false;
    renderInspector();
    return;
  }
  if (action === "choose-destination") {
    state.choosingDestination = !state.choosingDestination;
    renderInspector();
    return;
  }
  if (action === "icon-turn" || action === "icon-direction") {
    const turn = iconRotationStep(currentTrack());
    if (turn)
      await mutate(() => {
        turn.degrees =
          action === "icon-turn"
            ? +b.dataset.value * (Math.sign(turn.degrees) || 1)
            : Math.abs(turn.degrees) * +b.dataset.value;
        state.time = 0;
      });
    return;
  }
  if (action === "destination") {
    state.choosingDestination = false;
    await mutate((p) => {
      setTrackDestination(currentTrack(), b.dataset.id, p.geometry);
      state.stepId = null;
      state.time = 0;
    });
    if (currentTrack().steps.some((s) => s.experimental))
      toast("Combinação experimental: confira a passagem antes de exportar.");
    return;
  }
  if (action === "speed") {
    const old = state.project.speed || 1;
    await mutate((p) => {
      p.speed = +b.dataset.value;
      state.time *= old / p.speed;
    });
    return;
  }
  if (action === "asset") {
    stop();
    state.selectedAsset = b.dataset.id;
    state.previewAngle = 0;
    state.mode = "library";
    renderLibrary();
    renderInspector();
    await previewSelected();
    return;
  }
  if (action === "library-tab") {
    state.libraryTab = b.dataset.value;
    renderLibrary();
    return;
  }
  if (action === "filter") {
    state.filter = b.dataset.value;
    renderLibrary();
    return;
  }
  if (action === "pose") {
    stop();
    if (state.mode !== "library")
      state.selectedAsset =
        poseAt(currentCompiled(), state.time).pose?.asset || currentCompiled().endPose.asset;
    state.mode = "library";
    state.previewAngle = +b.dataset.angle;
    renderLibrary();
    renderInspector();
    previewSelected();
    return;
  }
  if (action === "timeline") {
    state.mode = "timeline";
    renderInspector();
    renderFrame();
    return;
  }
  if (action === "play") {
    if (state.busy) return;
    if (state.playing) {
      stop();
      return;
    }
    state.mode = "timeline";
    if (state.time >= state.compiled.duration - 0.001) state.time = 0;
    state.playing = true;
    lastTick = performance.now();
    renderInspector();
    updateTransport();
    return;
  }
  if (action === "start" || action === "end") {
    stop();
    state.mode = "timeline";
    state.time = action === "start" ? 0 : state.compiled.duration;
    renderFrame();
    updateTransport();
    return;
  }
  if (action === "spin-preview") {
    stop();
    state.mode = "library";
    const start = state.previewAngle,
      begin = performance.now(),
      token = ++previewToken;
    const spin = (now) => {
      if (token !== previewToken || state.mode !== "library") return;
      state.previewAngle = start + Math.min(1, (now - begin) / 4000) * 360;
      stage.preview(state.selectedAsset, state.previewAngle, state.project.color);
      $("#angle-readout").textContent = `${Math.round(state.previewAngle)}°`;
      $("#angle").value = state.previewAngle;
      if (now - begin < 4000) requestAnimationFrame(spin);
    };
    requestAnimationFrame(spin);
    return;
  }
  if (action === "style") {
    state.style = state.style === "shaded" ? "silhouette" : "shaded";
    stage.style = state.style;
    renderInspector();
    renderFrame();
    return;
  }
  if (action === "inspector") {
    $("#inspector").classList.toggle("open");
    return;
  }
  if (action === "geometry") {
    await mutate((p) => {
      p.geometry = b.dataset.value;
      for (const t of p.tracks) {
        let from = t.startAsset;
        for (const s of t.steps) {
          if (s.type === "morph") {
            if (!bridgeFor(from, s.target, p.geometry)) s.experimental = true;
            from = s.target;
          }
        }
      }
    });
    return;
  }
  if (action === "rotate" || action === "hold") {
    const s = action === "rotate" ? step("rotate", { degrees: +b.dataset.degrees }) : step("hold");
    await mutate(
      () => {
        currentTrack().steps.push(s);
        state.stepId = s.id;
      },
      { seekEnd: true },
    );
    return;
  }
  if (action === "append-morph") {
    await appendMorph(b.dataset.target || $("#morph-target").value);
    return;
  }
  if (action === "new-track") {
    if (state.project.tracks.length >= 12) {
      toast("Este roteiro já tem 12 pistas.");
      return;
    }
    const t = track(b.dataset.id || "M");
    if (state.mode === "library") t.startAngle = state.previewAngle;
    await mutate((p) => {
      p.tracks.push(t);
      state.trackId = t.id;
      state.stepId = null;
    });
    return;
  }
  if (action === "duplicate-track") {
    if (state.project.tracks.length >= 12) return;
    const t = structuredClone(currentTrack());
    t.id = uid();
    t.name += " · cópia";
    t.steps.forEach((s) => (s.id = uid()));
    await mutate((p) => {
      p.tracks.push(t);
      state.trackId = t.id;
      state.stepId = null;
    });
    return;
  }
  if (action === "remove-track") {
    await mutate((p) => {
      p.tracks = p.tracks.filter((t) => t.id !== state.trackId);
      state.trackId = p.tracks[0].id;
      state.stepId = null;
    });
    return;
  }
  if (action === "track") {
    state.inspectorTab = "letter";
    state.choosingDestination = false;
    stop();
    state.trackId = b.dataset.id;
    state.stepId = null;
    state.mode = "timeline";
    renderTimeline();
    renderInspector();
    renderFrame();
    return;
  }
  if (action === "toggle-track") {
    await mutate((p) => {
      const t = p.tracks.find((t) => t.id === b.dataset.id);
      t.enabled = !t.enabled;
    });
    return;
  }
  if (action === "clip") {
    state.inspectorTab = "letter";
    state.choosingDestination = false;
    stop();
    state.trackId = b.dataset.track;
    state.stepId = b.dataset.step;
    state.time = +b.dataset.start;
    state.mode = "timeline";
    renderTimeline();
    renderInspector();
    renderFrame();
    return;
  }
  if (action === "allow-step") {
    await mutate(() => {
      const s = currentTrack().steps.find((s) => s.id === state.stepId);
      if (s) s.experimental = true;
    });
    return;
  }
  if (action === "remove-step") {
    await mutate(() => {
      const t = currentTrack();
      t.steps = t.steps.filter((s) => s.id !== state.stepId);
      state.stepId = null;
    });
    return;
  }
  if (action === "move-step") {
    await mutate(() => {
      const t = currentTrack(),
        i = t.steps.findIndex((s) => s.id === state.stepId),
        j = i + +b.dataset.delta;
      if (j >= 0 && j < t.steps.length) [t.steps[i], t.steps[j]] = [t.steps[j], t.steps[i]];
    });
    return;
  }
  if (action === "preview-route") {
    const t = routeTrack(b.dataset.from, b.dataset.to),
      old = currentTrack();
    t.position = { ...old.position };
    t.scale = old.scale;
    await mutate((p) => {
      p.tracks[p.tracks.findIndex((x) => x.id === old.id)] = t;
      state.trackId = t.id;
      state.stepId = null;
      state.time = 0;
    });
    return;
  }
  if (action === "script") {
    await replaceProject(createProject(b.dataset.kind));
    return;
  }
  if (action === "composition") {
    await replaceProject(createProject("composition"));
    return;
  }
  if (action === "new") {
    await replaceProject(createProject("empty"));
    return;
  }
  if (action === "undo") {
    if (!state.history.length) return;
    stop();
    state.project = JSON.parse(state.history.pop());
    state.trackId = state.project.tracks[0].id;
    state.stepId = null;
    state.mode = "timeline";
    state.compiled = compileProject(state.project);
    state.time = Math.min(state.time, state.compiled.duration);
    saveCurrent();
    updateHeader();
    renderLibrary();
    renderTimeline();
    renderInspector();
    await prepare();
    return;
  }
  if (action === "save") {
    saveNamed();
    return;
  }
  if (action === "open") {
    openProjects();
    return;
  }
  if (action === "refs") {
    openReferences();
    return;
  }
  if (action === "export") {
    openExport();
    return;
  }
  if (action === "help") {
    openHelp();
    return;
  }
}
async function handleChange(event) {
  if (state.exporting) return;
  const e = event.target;
  if (e.id === "project-speed") {
    const old = state.project.speed || 1;
    await mutate((p) => {
      p.speed = Math.max(0.25, Math.min(3, +e.value || 1));
      state.time *= old / p.speed;
    });
    return;
  }
  if (e.id === "morph-duration" || e.id === "spin-duration") {
    const seconds = Math.max(0.1, Math.min(60, +e.value || 0.1)),
      duration = Math.max(0.1, Math.min(60, seconds * (state.project.speed || 1)));
    await mutate(() => {
      if (e.id === "morph-duration")
        for (const s of currentTrack().steps) {
          if (s.type === "morph") s.duration = duration;
        }
      else {
        const turn = iconRotationStep(currentTrack());
        if (turn) turn.duration = duration;
      }
    });
    return;
  }
  if (e.id === "time-input") {
    stop();
    state.mode = "timeline";
    state.time = Math.min(state.compiled.duration, Math.max(0, +e.value || 0));
    renderFrame();
    updateTransport();
    renderInspector();
    return;
  }
  if (e.id === "icon-turn") {
    const turn = iconRotationStep(currentTrack());
    if (turn)
      await mutate(() => {
        turn.degrees = +e.value * (Math.sign(turn.degrees) || 1);
        state.time = 0;
      });
    return;
  }
  if (e.id === "loop") {
    state.project.loop = e.checked;
    saveCurrent();
    return;
  }
  if (e.id === "track-select") {
    state.trackId = e.value;
    state.stepId = null;
    state.mode = "timeline";
    renderTimeline();
    renderInspector();
    renderFrame();
    return;
  }
  if (e.dataset.track) {
    await mutate(() => {
      currentTrack()[e.dataset.track] = +e.value;
    });
    return;
  }
  if (e.dataset.position) {
    await mutate(() => {
      currentTrack().position[e.dataset.position] = +e.value;
    });
    return;
  }
  if (e.dataset.step) {
    const key = e.dataset.step,
      s = currentTrack().steps.find((s) => s.id === state.stepId);
    if (!s) return;
    if (key === "target") {
      const before = currentTrack().steps.indexOf(s),
        prefix = { ...currentTrack(), steps: currentTrack().steps.slice(0, before) },
        from = compileTrack(prefix, state.project.geometry).endPose.asset;
      await mutate(() => {
        s.target = e.value;
        s.experimental = !bridgeFor(from, e.value, state.project.geometry);
      });
      if (s.experimental) toast("A nova combinação foi marcada como experimento.");
    } else
      await mutate(() => {
        s[key] = ["duration", "degrees"].includes(key)
          ? Math.max(
              key === "duration" ? 0.1 : -1080,
              Math.min(key === "duration" ? 60 : 1080, +e.value || 0),
            )
          : e.value;
      });
    return;
  }
  if (e.id === "form-color" || e.id === "background-color") {
    await mutate((p) => (p[e.id === "form-color" ? "color" : "background"] = e.value));
    return;
  }
  if (e.id === "aspect") {
    await mutate((p) => (p.aspect = e.value));
    return;
  }
}
function saveNamed() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED) || "[]");
    const p = structuredClone(state.project);
    p.savedAt = new Date().toISOString();
    const i = saved.findIndex((x) => x.id === p.id);
    if (i >= 0) saved[i] = p;
    else saved.unshift(p);
    localStorage.setItem(SAVED, JSON.stringify(saved.slice(0, 30)));
    saveCurrent();
    toast("Roteiro salvo neste navegador.");
  } catch {
    toast("Baixe o roteiro para guardar uma cópia.");
  }
}
function openProjects() {
  stop();
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem(SAVED) || "[]");
  } catch {}
  modal(
    "Abrir roteiro",
    `<p>Abra um projeto deste navegador ou importe um roteiro baixado da Matriz Espacial.</p><div class="saved-list">${saved.map((p, i) => `<div class="saved-project"><div><b>${esc(p.name)}</b><br><span>${p.tracks.length} pistas</span></div><button data-saved="${i}">Abrir</button></div>`).join("") || "<p>Nenhum roteiro salvo ainda.</p>"}</div><button class="primary" id="import-project" style="margin-top:18px">Importar arquivo .json</button>`,
    () => {
      $("#import-project").onclick = () => {
        closeModal();
        $("#project-file").click();
      };
      $$("[data-saved]").forEach(
        (b) =>
          (b.onclick = () => {
            try {
              const p = sanitizeProject(saved[+b.dataset.saved]);
              closeModal();
              replaceProject(p);
            } catch (error) {
              toast(error.message);
            }
          }),
      );
    },
  );
}
function openReferences() {
  stop();
  const refs = [
    ["m-p8-m.mp4", "M → P8 → M"],
    ["assinatura-capitulo-2.mp4", "Assinatura · Capítulo 2"],
    ["assinatura-capitulo-5.mp4", "Assinatura · Capítulo 5"],
  ];
  modal(
    "Referências do acervo",
    `<p>Compare o percurso reconstruído com os exports que já existiam. As durações dos roteiros podem ser ajustadas trecho a trecho.</p><div class="reference-tabs">${refs.map(([f, n], i) => `<button data-ref="${f}" class="${i === 0 ? "active" : ""}">${n}</button>`).join("")}</div><video id="reference-video" controls playsinline src="./references/${refs[0][0]}"></video>`,
    () => {
      $("#reference-video").addEventListener("error", () => {
        $("#reference-video").hidden = true;
        if (!$("#reference-unavailable")) {
          $("#reference-video").insertAdjacentHTML(
            "afterend",
            '<p id="reference-unavailable" role="status">Os vídeos originais permanecem no acervo local e não acompanham esta publicação. Os roteiros e a exportação funcionam sem eles. Consulte o guia de uso para instalar as referências localmente.</p>',
          );
        }
      });
      $$("[data-ref]").forEach(
        (b) =>
          (b.onclick = () => {
            $("#reference-video").hidden = false;
            $("#reference-video").src = "./references/" + b.dataset.ref;
            $$("[data-ref]").forEach((x) => x.classList.toggle("active", x === b));
          }),
      );
    },
  );
}
function openHelp() {
  modal(
    "Construir um roteiro",
    `<div class="help-steps"><div><strong>Explore as vistas</strong><p>Escolha uma forma na biblioteca e arraste a orientação. Os giros usam as geometrias originais do acervo.</p></div><div><strong>Parta de um percurso</strong><p>Em Roteiros, escolha uma estrutura. Ajuste a velocidade, os ícones e as rotações no painel da letra. “Assinatura” usa os volumes da montagem; “Estudos” preserva os perfis simplificados.</p></div><div><strong>Monte o roteiro</strong><p>Adicione giros, transformações e pausas. A passagem entre formas acontece na vista de 90°. A orientação continua no trecho seguinte.</p></div><div><strong>Componha e guarde</strong><p>Use pistas para dar tempos diferentes às letras. Salve no navegador ou baixe o roteiro; exporte a prévia como vídeo ou imagem.</p></div></div><p>Para ajustar contornos e correspondências manualmente, o Editor de contornos anterior continua disponível no topo.</p>`,
  );
}
function openExport() {
  stop();
  modal(
    "Exportar roteiro",
    `<p id="export-description">${esc(state.project.name)} · ${state.compiled.duration.toFixed(2)} segundos · ${state.project.tracks.length} pistas</p><div class="row"><button class="primary" id="download-project">Baixar roteiro .json</button><button id="export-image">Baixar imagem PNG</button></div><hr style="border:0;border-top:1px solid var(--line);margin:22px 0"><h3 style="margin-bottom:15px">Vídeo MP4</h3><div class="row">${field("Resolução", `<select id="export-size"><option value="1080">1080 px</option><option value="720">720 px</option><option value="2160">2160 px</option></select>`)}${field("Quadros por segundo", `<select id="export-fps"><option value="30">30 fps</option><option value="24">24 fps</option><option value="60">60 fps</option></select>`)}</div><button class="primary" id="export-mp4" style="margin-top:15px">Exportar MP4</button><progress class="export-progress" id="export-progress" max="100" value="0" hidden></progress><p id="export-notice" style="margin-top:14px">O vídeo inclui os giros 3D e as transformações vetoriais. Mantenha esta janela aberta até concluir.</p>`,
    () => {
      $("#download-project").onclick = () =>
        download(JSON.stringify(state.project, null, 2), slug() + ".json", "application/json");
      $("#export-image").onclick = async () => {
        try {
          const c = document.createElement("canvas");
          c.width = 1200;
          c.height = 1200;
          const [a, b] = state.project.aspect.split(":").map(Number);
          if (a > b) c.height = Math.round((c.width * b) / a);
          else c.width = Math.round((c.height * a) / b);
          await stage.prepare(state.compiled);
          stage.setSize(c.width, c.height);
          await stage.composite(
            state.compiled,
            state.time,
            state.project.color,
            state.project.background,
            c,
          );
          c.toBlob((blob) => download(blob, slug() + ".png", "image/png"));
          stage.resize();
          renderFrame();
        } catch (error) {
          toast(error.message);
        }
      };
      $("#export-mp4").onclick = exportVideo;
    },
  );
}
function exportVideo() {
  return exportProjectVideo({ state, stage, stop, download, slug, renderFrame, updateTransport });
}
let lastTick = performance.now();
function tick(now) {
  const dt = Math.min((now - lastTick) / 1000, 0.08);
  lastTick = now;
  if (state.playing && !state.busy && !state.exporting) {
    state.time += dt;
    if (state.time >= state.compiled.duration) {
      if (state.project.loop) state.time %= state.compiled.duration;
      else {
        state.time = state.compiled.duration;
        state.playing = false;
      }
    }
    renderFrame();
    updateTransport();
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !state.exporting) {
    closeModal();
    $("#inspector").classList.remove("open");
  }
  if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
  if (event.code === "Space" && !state.modal) {
    event.preventDefault();
    $("#play").click();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "s") {
    event.preventDefault();
    saveNamed();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "z") {
    event.preventDefault();
    $("#undo").click();
  }
});
updateHeader();
renderLibrary();
renderTimeline();
renderInspector();
prepare();
