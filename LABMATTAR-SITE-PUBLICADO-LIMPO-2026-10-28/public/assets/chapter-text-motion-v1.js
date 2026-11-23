const SUPPORTED_PATHS = new Set(["/capitulo-3", "/capitulo-4", "/capitulo-5"]);
const MOTION_SELECTOR = [
  "article h1",
  "article h2",
  "article p:not(.navigation-guide-title)",
  "main > section h1",
  "main > section h2",
  "main > section p:not(.navigation-guide-title)",
].join(",");

let activePath = "";
let observer;
let routeTimer;

function reveal(element, delay = 0) {
  element.dataset.chapterTextMotion = "done";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  element.animate(
    [
      { opacity: 0.08, transform: "translate3d(0, 22px, 0)", filter: "blur(10px)" },
      { opacity: 1, transform: "translate3d(0, 0, 0)", filter: "blur(0px)" },
    ],
    { duration: 1250, delay, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" },
  );
}

function setupMotion() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (!SUPPORTED_PATHS.has(path)) return;
  if (activePath === path && document.querySelector('[data-chapter-text-motion="ready"]')) return;
  activePath = path;
  observer?.disconnect();

  const elements = [...document.querySelectorAll(MOTION_SELECTOR)].filter((element) => {
    if (element.closest(".navigation-guide, header, nav, aside, form, dialog, [role='dialog']")) return false;
    return Boolean(element.textContent?.trim()) && getComputedStyle(element).display !== "none";
  });
  elements.forEach((element) => { element.dataset.chapterTextMotion = "ready"; });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    elements.forEach((element) => reveal(element));
    return;
  }

  observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target)
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    const groupCounts = new Map();
    visible.forEach((element) => {
      const group = element.closest("section, .story-panel, article") || element.parentElement;
      const index = groupCounts.get(group) || 0;
      groupCounts.set(group, index + 1);
      observer.unobserve(element);
      reveal(element, Math.min(index * 105, 420));
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
  elements.forEach((element) => observer.observe(element));
}

function startWhenReady() {
  window.clearTimeout(routeTimer);
  routeTimer = window.setTimeout(() => {
    if (!document.querySelector(".navigation-guide")) setupMotion();
  }, 120);
}

window.addEventListener("mattar:guide-dismissed", () => { activePath = ""; startWhenReady(); });
window.addEventListener("popstate", startWhenReady);
window.addEventListener("pageshow", startWhenReady);
new MutationObserver(() => {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (path !== activePath) startWhenReady();
}).observe(document.documentElement, { childList: true, subtree: true });

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startWhenReady, { once: true });
else startWhenReady();
