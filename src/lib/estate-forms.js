/**
 * ESTATE FORM STANDARDS — storefront edition (one file, identical in all four
 * commerce storefronts; mirrors linear-console's AGENTS.md § "UNIVERSAL BUILD
 * STANDARDS", 2026-11-14). Two progressive enhancements, zero per-page wiring:
 *
 * 1. DIAL PICKERS — every native <select> whose options are dial rows
 *    ("🇺🇸 United States +1") is upgraded into the searchable combobox the
 *    Console's CountryPicker ships. The bug this fixes is native type-ahead:
 *    every option label STARTS with the flag emoji and type-ahead
 *    prefix-matches the option text, so typing "U" never landed on United
 *    States/Uganda/Uruguay — reported on every dialer at once. The select
 *    STAYS in the DOM (hidden) as the source of truth: form serialization
 *    and every existing script reading select.value keep working unchanged;
 *    a selection dispatches a real bubbling `change` event so existing
 *    listeners fire exactly as before. The trigger button inherits the
 *    select's own class and inline style, so each site keeps its own CSS
 *    vocabulary (nanoliss .field, gobble .text-field, TCS .input-field…).
 *
 * 2. PIN AUTOFILL — every input[name="pincode"] that has no bespoke lookup
 *    (the bespoke ones — nanoliss checkout, TCS checkout drawer, TCS/gobble
 *    account pages, gobble COD drawer — either carry no name attribute or
 *    their own India-Post/prefix logic) fills sibling city/state fields from
 *    the free India Post API at 6 digits. The result OVERWRITES (the PIN is
 *    authoritative, same rule as the Console module); debounced, abortable,
 *    and a status line reports what happened. State selects (mane checkout,
 *    gobble COD) are filled by matching the option value/text, never blindly.
 *
 * Degrades gracefully: if this script never runs, the page is exactly the
 * pre-enhancement page — the native select still works (minus search), the
 * PIN field still takes manual entry.
 */

function isDialSelect(sel) {
  if (sel.tagName !== "SELECT" || sel.dataset.efDial !== undefined) return false;
  const opts = Array.from(sel.options);
  if (opts.length < 30) return false;
  // Dial rows: numeric value + a flag-emoji-prefixed label ending in a dial.
  // NOTE: flag emoji are Regional-Indicator pairs (U+1F1E6–FF), which are NOT
  // \p{Extended_Pictographic} — the first shipped detector used that class
  // and matched ZERO selects on the live sites (found in the live browser
  // check, 2026-11-14). Storefront labels end with a bare dial ("… 93"),
  // Console labels with "+93" — both end in digits, both start with a flag.
  const sample = opts.slice(0, 40);
  const numeric = sample.every((o) => /^\d+$/.test(o.value));
  const flagged = sample.every(
    (o) => /^[\u{1F1E6}-\u{1F1FF}]/u.test(o.text) && /\d{1,4}\s*$/.test(o.text),
  );
  return numeric && flagged;
}

const PANEL_CSS = `
.ef-dial-wrap { position: relative; display: inline-block; }
.ef-dial-panel { position: absolute; z-index: 9999; top: calc(100% + 4px); left: 0;
  background: #fff; color: #111; border: 1px solid rgba(0,0,0,.18); border-radius: 10px;
  box-shadow: 0 12px 32px rgba(0,0,0,.25); width: 280px; max-width: calc(100vw - 24px);
  font-size: 13.5px; overflow: hidden; font-family: inherit; }
.ef-dial-search { width: 100%; box-sizing: border-box; border: 0; border-bottom: 1px solid rgba(0,0,0,.12);
  padding: 9px 12px; font-size: 13.5px; outline: none; background: #fff; color: #111; font-family: inherit; }
.ef-dial-list { max-height: 264px; overflow: auto; margin: 0; padding: 4px 0; list-style: none; }
.ef-dial-opt { display: block; width: 100%; text-align: left; background: none; border: 0;
  padding: 8px 12px; cursor: pointer; color: #111; font-size: 13.5px; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; font-family: inherit; }
.ef-dial-opt.ef-hl, .ef-dial-opt:hover { background: rgba(0,0,0,.07); }
.ef-dial-none { padding: 10px 12px; color: #777; font-size: 12.5px; }
.ef-pin-status { margin: 4px 0 0; font-size: 12px; opacity: .72; }
`;

function enhanceDialSelect(sel) {
  sel.dataset.efDial = "1";

  const wrap = document.createElement("span");
  wrap.className = "ef-dial-wrap";
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);
  sel.style.display = "none";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = (sel.className || "") + " ef-dial-trigger";
  trigger.setAttribute("style", (sel.getAttribute("style") || "") +
    ";display:flex;align-items:center;justify-content:space-between;gap:6px;text-align:left;cursor:pointer;");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-label", sel.getAttribute("aria-label") || "Country dial code");

  const label = document.createElement("span");
  label.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
  const caret = document.createElement("span");
  caret.setAttribute("aria-hidden", "true");
  caret.style.cssText = "flex:none;opacity:.55;font-size:10px;";
  caret.textContent = "▼";
  trigger.appendChild(label);
  trigger.appendChild(caret);
  wrap.insertBefore(trigger, sel);

  const syncLabel = () => {
    const o = sel.options[sel.selectedIndex];
    label.textContent = o ? o.text : "Select country";
    label.title = o ? o.text : "";
  };
  syncLabel();

  const panel = document.createElement("span");
  panel.className = "ef-dial-panel";
  panel.style.display = "none";
  const search = document.createElement("input");
  search.type = "text";
  search.className = "ef-dial-search";
  search.placeholder = "Search country or code…";
  search.setAttribute("aria-label", "Search country");
  const list = document.createElement("ul");
  list.className = "ef-dial-list";
  list.setAttribute("role", "listbox");
  panel.appendChild(search);
  panel.appendChild(list);
  wrap.appendChild(panel);

  const all = Array.from(sel.options).map((o, i) => ({ text: o.text, value: o.value, i }));
  let shown = all;
  let hl = 0;

  const render = () => {
    list.innerHTML = "";
    if (shown.length === 0) {
      const none = document.createElement("li");
      none.className = "ef-dial-none";
      none.textContent = "No country matches that search.";
      list.appendChild(none);
      return;
    }
    shown.forEach((item, idx) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ef-dial-opt" + (idx === hl ? " ef-hl" : "");
      btn.setAttribute("role", "option");
      btn.textContent = item.text;
      btn.addEventListener("mouseenter", () => { hl = idx; paint(); });
      btn.addEventListener("click", () => pick(item));
      li.appendChild(btn);
      list.appendChild(li);
    });
  };
  const paint = () => {
    Array.from(list.querySelectorAll(".ef-dial-opt")).forEach((b, idx) => {
      b.classList.toggle("ef-hl", idx === hl);
      if (idx === hl) b.scrollIntoView({ block: "nearest" });
    });
  };

  const open = () => {
    panel.style.display = "";
    search.value = "";
    shown = all;
    hl = 0;
    render();
    trigger.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => search.focus());
  };
  const close = () => {
    panel.style.display = "none";
    trigger.setAttribute("aria-expanded", "false");
  };

  const pick = (item) => {
    sel.value = item.value;
    // A real bubbling change event: every existing listener (profile save
    // composition, checkout totals, whatever reads this select) keeps firing.
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    sel.dispatchEvent(new Event("input", { bubbles: true }));
    syncLabel();
    close();
  };

  trigger.addEventListener("click", () => (panel.style.display === "none" ? open() : close()));
  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    shown = !q ? all : all.filter((o) => {
      const t = o.text.toLowerCase();
      if (t.includes(q)) return true;
      if (digits && o.value.startsWith(digits)) return true;
      return false;
    });
    hl = 0;
    render();
  });
  search.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); hl = Math.min(hl + 1, shown.length - 1); paint(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); hl = Math.max(hl - 1, 0); paint(); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown[hl]) pick(shown[hl]); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  });
  document.addEventListener("mousedown", (e) => {
    if (panel.style.display !== "none" && !wrap.contains(e.target)) close();
  });
}

function findField(container, kind) {
  // city: input named/id'd city (ckCity, codCity, co-city, a-city, name="city")
  // state: input OR select (ckState, codState, co-state, a-state, name="state")
  if (kind === "city") {
    return container.querySelector('input[name="city" i], input[id$="city" i], input[id$="City"]');
  }
  return container.querySelector(
    'select[name="state" i], select[id$="state" i], select[id$="State"], input[name="state" i], input[id$="state" i], input[id$="State"]',
  );
}

function pinContainer(pin) {
  // Climb from the PIN input to a container that holds BOTH a city and a
  // state field (forms, drawers, and JS-composed blocks all qualify).
  let node = pin;
  for (let depth = 0; node && depth < 6; depth++, node = node.parentElement) {
    if (findField(node, "city") && findField(node, "state") &&
        findField(node, "city") !== pin && findField(node, "state") !== pin) return node;
  }
  return null;
}

function enhancePinInput(pin) {
  if (pin.dataset.efPin !== undefined) return;
  pin.dataset.efPin = "1";

  const container = pinContainer(pin);
  if (!container) return; // a PIN-only form — nothing to fill
  const city = findField(container, "city");
  const state = findField(container, "state");

  const status = document.createElement("p");
  status.className = "ef-pin-status";
  status.setAttribute("role", "status");
  status.style.display = "none";
  pin.parentNode.insertBefore(status, pin.nextSibling);

  const setStatus = (text) => { status.textContent = text; status.style.display = "block"; };
  const hideStatus = () => { status.style.display = "none"; };

  const setStateField = (name) => {
    if (!state) return false;
    if (state.tagName === "SELECT") {
      const q = name.trim().toLowerCase();
      const opt = Array.from(state.options).find((o) =>
        o.value.trim().toLowerCase() === q || o.text.trim().toLowerCase() === q);
      if (!opt) return false;
      state.value = opt.value;
      state.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    state.value = name;
    state.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  };

  let controller = null;
  let timer = null;
  pin.addEventListener("input", () => {
    const digits = (pin.value || "").replace(/\D/g, "");
    if (digits.length !== 6) { hideStatus(); return; }
    clearTimeout(timer);
    controller?.abort();
    timer = setTimeout(() => {
      controller = new AbortController();
      setStatus("Looking up city & state…");
      fetch(`https://api.postalpincode.in/pincode/${digits}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          const po = (Array.isArray(data) && data[0]?.Status === "Success" ? data[0].PostOffice?.[0] : undefined);
          if (po && (po.District || po.Name || po.State)) {
            if (city) city.value = po.District || po.Name || "";
            const stateSet = setStateField(po.State || "");
            setStatus(`✓ ${[po.District || po.Name, po.State].filter(Boolean).join(", ")} — filled from PIN code` +
              (state && !stateSet ? "" : ""));
          } else {
            setStatus("PIN not found — enter city/state manually.");
          }
        })
        .catch((err) => {
          if (err && err.name === "AbortError") return;
          setStatus("Couldn't look up that PIN — enter city/state manually.");
        });
    }, 500);
  });
}

export function initEstateForms() {
  const style = document.createElement("style");
  style.textContent = PANEL_CSS;
  document.head.appendChild(style);

  const scan = () => {
    document.querySelectorAll("select").forEach((sel) => {
      if (isDialSelect(sel)) enhanceDialSelect(sel);
    });
    document.querySelectorAll('input[name="pincode"]').forEach((pin) => {
      if (!pin.closest("[data-pin-bespoke]")) enhancePinInput(pin);
    });
  };
  scan();

  // Some estate surfaces render their forms ON DEMAND (nanoliss's account
  // address editor is JS-composed per address) — a one-shot scan at load
  // misses those. The dataset guards make re-scans idempotent, so a
  // debounced observer re-runs the same scan whenever the DOM grows.
  let t = null;
  const mo = new MutationObserver(() => {
    clearTimeout(t);
    t = setTimeout(scan, 150);
  });
  mo.observe(document.body, { childList: true, subtree: true });
}
