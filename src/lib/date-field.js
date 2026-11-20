/**
 * Progressive date picker for the storefronts.
 *
 * The browser's native type="date" calendar only lets you tap the YEAR — to
 * change the month you have to swipe a wheel sideways. This replaces that
 * interaction with explicit month + year dropdowns while keeping the input's
 * value contract byte-for-byte: every page reads `document.getElementById(id).value`
 * and TCS even assigns to it, so the real input stays in the form, holds
 * `YYYY-MM-DD`, and our JS `value` accessor mirrors writes to the visible
 * trigger. Nothing here changes a site's colours or theme.
 */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

let styled = false;

function injectStyle() {
  if (styled) return;
  styled = true;
  const s = document.createElement("style");
  s.textContent = `
.lc-date-pop{position:fixed;z-index:99999;width:320px;max-width:calc(100vw - 16px);padding:12px;background:#fff;color:#111;border:1px solid #ddd3bf;border-radius:10px;box-shadow:0 12px 34px rgba(0,0,0,.18);font-family:inherit;font-size:14px;line-height:1.3}
.lc-date-pop *{box-sizing:border-box}
.lc-date-head{display:flex;align-items:center;gap:5px}
.lc-date-head button,.lc-date-foot button{font:inherit;cursor:pointer;background:#fff;color:#111;border:1px solid #ddd3bf;border-radius:6px;padding:4px 8px}
.lc-date-head button{min-width:32px;font-size:16px;line-height:1}
.lc-date-head select{font:inherit;background:#fff;color:#111;border:1px solid #ddd3bf;border-radius:6px;padding:5px;min-width:0}
.lc-date-head select[data-role="month"]{flex:1}
.lc-date-head select[data-role="year"]{width:76px}
.lc-date-dow,.lc-date-grid{display:grid;grid-template-columns:repeat(7,1fr);text-align:center}
.lc-date-dow{margin-top:10px;font-size:11px;opacity:.6}
.lc-date-grid{margin-top:4px;gap:3px}
.lc-date-grid button{font:inherit;cursor:pointer;height:32px;border:1px solid transparent;border-radius:6px;background:transparent;color:inherit}
.lc-date-grid button:hover{background:#f1ede1}
.lc-date-grid button[aria-pressed="true"]{background:#111;color:#fff}
.lc-date-grid button:disabled{opacity:.25;cursor:default}
.lc-date-foot{display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:9px;border-top:1px solid #ddd3bf}
.lc-date-foot button[data-act="done"]{background:#111;color:#fff;border-color:#111;padding:5px 12px}
.lc-date-icon{flex:none;opacity:.7}
`;
  document.head.appendChild(s);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function parse(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || "");
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { y: Number(m[1]), m: month, d: Number(m[3]) };
}

function display(v) {
  const p = parse(v);
  return p ? `${MONTHS_SHORT[p.m - 1]} ${p.d}, ${p.y}` : "Pick a date";
}

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

function firstWeekday(y, m) {
  return new Date(y, m - 1, 1).getDay();
}

function closeAll(except) {
  document.querySelectorAll(".lc-date-pop").forEach((p) => {
    if (p !== except) p.remove();
  });
}

function enhanceOne(input) {
  input.setAttribute("data-lc-date", "1");
  const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  const now = new Date();
  const state = { y: now.getFullYear(), m: now.getMonth() + 1, pop: null };

  const raw = () => native.get.call(input) || "";

  // Sites do not all style fields by class: Gobble, for example, styles a bare
  // `input` selector, so copying className to a <button> leaves a grey Arial
  // browser default. Resolve the REAL field styles BEFORE hiding the input
  // and apply them to the trigger, then layer our flex layout on top.
  const cs = getComputedStyle(input);
  const fieldStyles = {};
  const styleProps = [
    "font-family", "font-size", "font-weight", "font-style", "line-height",
    "letter-spacing", "text-transform", "text-align", "text-indent",
    "color", "background-color", "background-image", "background-size",
    "background-position", "background-repeat",
    "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
    "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
    "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
    "border-radius", "padding-top", "padding-right", "padding-bottom", "padding-left",
    "box-shadow", "box-sizing", "min-height",
  ];
  for (const prop of styleProps) {
    const v = cs.getPropertyValue(prop);
    if (v) fieldStyles[prop] = v;
  }
  // A hidden auth pane reports width:0 — fall back to full width there.
  const resolvedWidth = parseFloat(cs.width) > 0 ? cs.width : "100%";
  const resolvedHeight = parseFloat(cs.height) > 0 ? cs.height : "";

  // Keep the visible button in sync with ANY write to input.value — including
  // storefront code that fills the profile from an API response.
  function setRaw(v, notify) {
    native.set.call(input, v);
    const label = trigger.querySelector('[data-role="label"]');
    if (label) label.textContent = display(v);
    else trigger.textContent = display(v);
    if (notify) {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  Object.defineProperty(input, "value", {
    configurable: true,
    get() {
      return native.get.call(input);
    },
    set(v) {
      setRaw(String(v == null ? "" : v), false);
    },
  });

  // The real input stays in the form (FormData, name, id, validation contract)
  // but is no longer the thing the shopper taps.
  input.tabIndex = -1;
  input.setAttribute("aria-hidden", "true");
  input.style.position = "absolute";
  input.style.width = "1px";
  input.style.height = "1px";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = input.className + " lc-date-trigger";
  trigger.setAttribute("aria-label", input.getAttribute("aria-label") || "Pick a date");
  trigger.setAttribute("aria-haspopup", "dialog");
  for (const [prop, v] of Object.entries(fieldStyles)) trigger.style.setProperty(prop, v);
  if (resolvedHeight) trigger.style.height = resolvedHeight;
  trigger.style.width = resolvedWidth;
  // Our layout wins over the copied field styles.
  trigger.style.display = "flex";
  trigger.style.alignItems = "center";
  trigger.style.justifyContent = "space-between";
  trigger.style.gap = "0.5rem";
  trigger.style.textAlign = "left";
  trigger.style.cursor = "pointer";
  trigger.style.appearance = "none";
  trigger.innerHTML =
    '<span data-role="label"></span>' +
    '<svg class="lc-date-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.7"/>' +
    '<path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
    "</svg>";
  input.parentNode.insertBefore(trigger, input.nextSibling);
  setRaw(raw(), false);

  function renderDays(pop) {
    const grid = pop.querySelector(".lc-date-grid");
    const monthSelect = pop.querySelector('[data-role="month"]');
    const yearSelect = pop.querySelector('[data-role="year"]');
    monthSelect.value = String(state.m);
    yearSelect.value = String(state.y);
    const total = daysInMonth(state.y, state.m);
    const lead = firstWeekday(state.y, state.m);
    const chosen = parse(raw());
    let html = "";
    for (let i = 0; i < lead; i++) html += "<span></span>";
    for (let d = 1; d <= total; d++) {
      const iso = `${state.y}-${pad(state.m)}-${pad(d)}`;
      const on = chosen && chosen.y === state.y && chosen.m === state.m && chosen.d === d;
      html +=
        `<button type="button" data-day="${d}" aria-label="${MONTHS[state.m - 1]} ${d}, ${state.y}"` +
        `${on ? ' aria-pressed="true"' : ""}>${d}</button>`;
    }
    grid.innerHTML = html;
  }

  function open() {
    if (state.pop) {
      state.pop.remove();
      state.pop = null;
      return;
    }
    closeAll();
    const p = parse(raw()) || { y: state.y, m: state.m, d: 1 };
    state.y = p.y;
    state.m = p.m;
    const pop = document.createElement("div");
    pop.className = "lc-date-pop";
    pop.setAttribute("role", "dialog");
    pop.innerHTML =
      '<div class="lc-date-head">' +
      '<button type="button" data-act="prev" aria-label="Previous month">&#8249;</button>' +
      '<select data-role="month" aria-label="Month">' +
      MONTHS.map((name, i) => `<option value="${i + 1}">${name}</option>`).join("") +
      "</select>" +
      '<select data-role="year" aria-label="Year">' +
      Array.from({ length: 121 }, (_, i) => {
        const y = now.getFullYear() + 20 - i; // birthdays need old years
        return `<option value="${y}">${y}</option>`;
      }).join("") +
      "</select>" +
      '<button type="button" data-act="next" aria-label="Next month">&#8250;</button>' +
      "</div>" +
      '<div class="lc-date-dow">' +
      DOW.map((d) => `<span>${d}</span>`).join("") +
      "</div>" +
      '<div class="lc-date-grid"></div>' +
      '<div class="lc-date-foot">' +
      '<button type="button" data-act="today">Today</button>' +
      '<button type="button" data-act="clear">Clear</button>' +
      '<button type="button" data-act="done">Done</button>' +
      "</div>";
    document.body.appendChild(pop);
    const r = trigger.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - 328));
    const below = r.bottom + 6;
    pop.style.left = `${left}px`;
    pop.style.top = `${below + 380 < window.innerHeight ? below : Math.max(8, r.top - 386)}px`;

    pop.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn || !pop.contains(btn)) return;
      const act = btn.getAttribute("data-act");
      if (btn.hasAttribute("data-day")) {
        setRaw(`${state.y}-${pad(state.m)}-${pad(Number(btn.getAttribute("data-day")))}`, true);
        pop.remove();
        state.pop = null;
      } else if (act === "prev" || act === "next") {
        let y = state.y;
        let m = state.m + (act === "next" ? 1 : -1);
        if (m < 1) { m = 12; y--; }
        if (m > 12) { m = 1; y++; }
        state.y = y;
        state.m = m;
        renderDays(pop);
      } else if (act === "today") {
        const t = new Date();
        setRaw(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`, true);
        pop.remove();
        state.pop = null;
      } else if (act === "clear") {
        setRaw("", true);
        pop.remove();
        state.pop = null;
      } else if (act === "done") {
        pop.remove();
        state.pop = null;
      }
    });
    pop.addEventListener("change", (e) => {
      if (e.target.matches('[data-role="month"]')) state.m = Number(e.target.value);
      else if (e.target.matches('[data-role="year"]')) state.y = Number(e.target.value);
      else return;
      renderDays(pop);
    });
    state.pop = pop;
    renderDays(pop);
  }

  trigger.addEventListener("click", open);
  document.addEventListener("mousedown", (e) => {
    if (state.pop && !state.pop.contains(e.target) && !trigger.contains(e.target)) {
      state.pop.remove();
      state.pop = null;
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.pop) {
      state.pop.remove();
      state.pop = null;
      trigger.focus();
    }
  });
}

export function initDateFields() {
  if (typeof document === "undefined" || window.__lcDateFieldsReady) return;
  window.__lcDateFieldsReady = true;
  const run = () => {
    injectStyle();
    document.querySelectorAll('input[type="date"]:not([data-lc-date])').forEach(enhanceOne);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
}
