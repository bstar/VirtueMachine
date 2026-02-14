(() => {
  const PAGES = [
    { file: "README.md", title: "Wiki Home" },
    { file: "01-legacy-runtime-anatomy.md", title: "Legacy Runtime Anatomy" },
    { file: "02-modern-runtime-anatomy.md", title: "Modern Runtime Anatomy" },
    { file: "03-rendering-pipeline-deep-dive.md", title: "Rendering Pipeline Deep Dive" },
    { file: "04-object-baseline-provenance.md", title: "Object Baseline Provenance" },
    { file: "05-determinism-and-replay.md", title: "Determinism and Replay" },
    { file: "06-network-authority-and-persistence.md", title: "Network Authority and Persistence" },
    { file: "07-parity-engineering-workflow.md", title: "Parity Engineering Workflow" },
    { file: "08-deviation-ledger.md", title: "Deviation Ledger" },
    { file: "09-testing-and-tooling-index.md", title: "Testing and Tooling Index" },
    { file: "10-glossary.md", title: "Glossary" },
    { file: "11-parity-case-studies.md", title: "Parity Case Studies" },
    { file: "12-canonical-completion-roadmap.md", title: "Canonical Completion Roadmap" },
    { file: "13-reference-atlas.md", title: "Reference Atlas Guide" }
  ];

  const pageListEl = document.getElementById("page-list");
  const docEl = document.getElementById("doc");
  const sourceLinkEl = document.getElementById("source-link");
  const searchEl = document.getElementById("search");
  const referenceSearchEl = document.getElementById("reference-search");
  const referenceFocusCardEl = document.getElementById("reference-focus-card");
  const referenceListEl = document.getElementById("reference-list");
  const codeOverlayEl = document.getElementById("code-overlay");
  const codeOverlayBackdropEl = document.getElementById("code-overlay-backdrop");
  const codeOverlayCloseEl = document.getElementById("code-overlay-close");
  const codeOverlayPathEl = document.getElementById("code-overlay-path");
  const codeOverlayCodeEl = document.getElementById("code-overlay-code");
  const state = {
    currentPage: "README.md",
    currentTerm: "",
    termFilter: "",
    terms: []
  };

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safePath(path) {
    return String(path || "")
      .replace(/^\.\//, "")
      .replace(/^\/+/, "");
  }

  function isLikelyCodePath(href) {
    const h = safePath(href);
    if (!h) {
      return false;
    }
    if (!h.includes("/")) {
      return false;
    }
    return /\.(c|h|js|mjs|ts|tsx|json|sh|py|md|txt|css|html)$/i.test(h);
  }

  function codeKeywordRegex(ext) {
    const common = "\\b(return|if|else|for|while|switch|case|break|continue|function|const|let|var|class|new|try|catch|throw|import|from|export|default|async|await|true|false|null|undefined)\\b";
    const cLike = "\\b(static|struct|typedef|enum|void|char|short|int|long|float|double|unsigned|signed|sizeof|include|define)\\b";
    if (/^(c|h)$/i.test(ext)) {
      return new RegExp(`${common}|${cLike}`, "g");
    }
    return new RegExp(common, "g");
  }

  function highlightCode(raw, path) {
    const extMatch = /\.([a-z0-9]+)$/i.exec(path || "");
    const ext = extMatch ? extMatch[1].toLowerCase() : "";
    let text = escapeHtml(String(raw || ""));
    text = text.replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g, '<span class="tok-c">$1</span>');
    text = text.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, '<span class="tok-s">$1</span>');
    text = text.replace(/\b(0x[0-9a-fA-F]+|\d+(?:\.\d+)?)\b/g, '<span class="tok-n">$1</span>');
    text = text.replace(codeKeywordRegex(ext), '<span class="tok-k">$1</span>');
    text = text.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\s*(?=\()/g, '<span class="tok-f">$1</span>');
    return text;
  }

  function openCodeOverlay(path, contents) {
    codeOverlayPathEl.textContent = path;
    codeOverlayCodeEl.innerHTML = highlightCode(contents, path);
    codeOverlayEl.classList.remove("hidden");
    codeOverlayEl.setAttribute("aria-hidden", "false");
  }

  function closeCodeOverlay() {
    codeOverlayEl.classList.add("hidden");
    codeOverlayEl.setAttribute("aria-hidden", "true");
    codeOverlayPathEl.textContent = "";
    codeOverlayCodeEl.textContent = "";
  }

  async function showCodePath(path) {
    const clean = `/${safePath(path)}`;
    codeOverlayPathEl.textContent = `Loading ${clean} ...`;
    codeOverlayCodeEl.textContent = "";
    codeOverlayEl.classList.remove("hidden");
    codeOverlayEl.setAttribute("aria-hidden", "false");
    try {
      const res = await fetch(clean, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const text = await res.text();
      openCodeOverlay(clean, text);
    } catch (err) {
      openCodeOverlay(clean, `Failed to load ${clean}\n\n${String(err.message || err)}`);
    }
  }

  function applyThemeFromDebugPanel() {
    let theme = "obsidian";
    try {
      const params = new URLSearchParams(location.search || "");
      const fromQuery = params.get("theme");
      if (fromQuery) {
        theme = String(fromQuery);
      }
    } catch (_err) {
      // Ignore query parsing errors.
    }
    try {
      const fromStorage = localStorage.getItem("vm_theme");
      if (fromStorage && !location.search.includes("theme=")) {
        theme = String(fromStorage);
      }
    } catch (_err) {
      // Ignore localStorage access failures and keep fallback.
    }
    document.documentElement.setAttribute("data-theme", theme);
  }

  function inlineMarkdown(text) {
    let out = escapeHtml(text);
    out = out.replace(/\[\[term:([^\]]+)\]\]/gi, (_m, rawTerm) => {
      const term = String(rawTerm).trim();
      const href = `#page=${encodeURIComponent(state.currentPage)}&term=${encodeURIComponent(term)}`;
      return `<a class="term-link" href="${href}" data-term="${escapeHtml(term)}">${escapeHtml(term)}</a>`;
    });
    out = out.replace(/\[\[([^\]]+)\]\]/g, (_m, rawTerm) => {
      const term = String(rawTerm).trim();
      const href = `#page=${encodeURIComponent(state.currentPage)}&term=${encodeURIComponent(term)}`;
      return `<a class="term-link" href="${href}" data-term="${escapeHtml(term)}">${escapeHtml(term)}</a>`;
    });
    out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
    out = out.replace(/<code>([^<]+)<\/code>/g, (_m, codeText) => {
      const raw = String(codeText).trim();
      if (isLikelyCodePath(raw)) {
        return `<a class="code-link" href="#code=${encodeURIComponent(raw)}" data-code-path="${escapeHtml(raw)}"><code>${escapeHtml(raw)}</code></a>`;
      }
      return `<code>${escapeHtml(raw)}</code>`;
    });
    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, u) => {
      const href = String(u).trim();
      if (href.startsWith("#term=")) {
        const term = decodeURIComponent(href.slice("#term=".length));
        const routed = `#page=${encodeURIComponent(state.currentPage)}&term=${encodeURIComponent(term)}`;
        return `<a class="term-link" href="${routed}" data-term="${escapeHtml(term)}">${t}</a>`;
      }
      if (/\.md($|#)/.test(href)) {
        const file = href.split("#")[0].replace(/^\.\//, "");
        return `<a href="#page=${encodeURIComponent(file)}">${t}</a>`;
      }
      if (isLikelyCodePath(href)) {
        return `<a class="code-link" href="#code=${encodeURIComponent(href)}" data-code-path="${escapeHtml(href)}">${t}</a>`;
      }
      return `<a href="${href}" target="_blank" rel="noopener">${t}</a>`;
    });
    return out;
  }

  function renderMarkdown(md) {
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let i = 0;
    let inCode = false;
    let listType = null;

    function closeList() {
      if (listType) {
        out.push(`</${listType}>`);
        listType = null;
      }
    }

    while (i < lines.length) {
      const line = lines[i];

      if (line.startsWith("```")) {
        closeList();
        if (!inCode) {
          inCode = true;
          out.push("<pre><code>");
        } else {
          inCode = false;
          out.push("</code></pre>");
        }
        i += 1;
        continue;
      }

      if (inCode) {
        out.push(`${escapeHtml(line)}\n`);
        i += 1;
        continue;
      }

      if (/^\s*$/.test(line)) {
        closeList();
        i += 1;
        continue;
      }

      const h = /^(#{1,6})\s+(.*)$/.exec(line);
      if (h) {
        closeList();
        const level = h[1].length;
        out.push(`<h${level}>${inlineMarkdown(h[2])}</h${level}>`);
        i += 1;
        continue;
      }

      if (/^>\s?/.test(line)) {
        closeList();
        out.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s?/, ""))}</blockquote>`);
        i += 1;
        continue;
      }

      if (/^---+$/.test(line.trim())) {
        closeList();
        out.push("<hr />");
        i += 1;
        continue;
      }

      const ul = /^[-*]\s+(.*)$/.exec(line);
      if (ul) {
        if (!listType) {
          listType = "ul";
          out.push("<ul>");
        } else if (listType !== "ul") {
          closeList();
          listType = "ul";
          out.push("<ul>");
        }
        out.push(`<li>${inlineMarkdown(ul[1])}</li>`);
        i += 1;
        continue;
      }

      const ol = /^\d+\.\s+(.*)$/.exec(line);
      if (ol) {
        if (!listType) {
          listType = "ol";
          out.push("<ol>");
        } else if (listType !== "ol") {
          closeList();
          listType = "ol";
          out.push("<ol>");
        }
        out.push(`<li>${inlineMarkdown(ol[1])}</li>`);
        i += 1;
        continue;
      }

      closeList();
      out.push(`<p>${inlineMarkdown(line)}</p>`);
      i += 1;
    }

    closeList();
    return out.join("\n");
  }

  function getCurrentPage() {
    const params = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    const p = params.get("page");
    if (!p) {
      return "README.md";
    }
    const found = PAGES.find((x) => x.file === p);
    return found ? found.file : "README.md";
  }

  function getCurrentTerm() {
    const params = new URLSearchParams((location.hash || "").replace(/^#/, ""));
    return String(params.get("term") || "").trim();
  }

  function normalizeTerm(term) {
    return String(term || "").trim().toLowerCase();
  }

  function findTerm(term) {
    const key = normalizeTerm(term);
    if (!key) {
      return null;
    }
    return state.terms.find((t) => {
      if (normalizeTerm(t.term) === key) {
        return true;
      }
      return (t.aliases || []).some((a) => normalizeTerm(a) === key);
    }) || null;
  }

  function termMatchesFilter(t, q) {
    if (!q) {
      return true;
    }
    const blob = [
      t.term,
      t.category,
      ...(t.aliases || []),
      t.definition,
      t.how_it_looks,
      t.gameplay_effect,
      ...(t.visual_signatures || []),
      ...(t.common_failures || []),
      ...(t.debug_checks || [])
    ].join(" ").toLowerCase();
    return blob.includes(q);
  }

  function renderTermCard(term, focused = false) {
    const aliases = (term.aliases || []).map((a) => `<span class="term-chip">${escapeHtml(a)}</span>`).join("");
    const signatures = (term.visual_signatures || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
    const failures = (term.common_failures || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
    const checks = (term.debug_checks || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
    return `
      <article class="term-card${focused ? " is-focused" : ""}">
        <h4>${escapeHtml(term.term)}</h4>
        <p class="term-meta">${escapeHtml(term.category || "Uncategorized")}</p>
        <p>${aliases}</p>
        <p><strong>Definition:</strong> ${escapeHtml(term.definition || "N/A")}</p>
        <p><strong>How It Looks:</strong> ${escapeHtml(term.how_it_looks || "N/A")}</p>
        <p><strong>Gameplay Effect:</strong> ${escapeHtml(term.gameplay_effect || "N/A")}</p>
        ${signatures ? `<p><strong>Visual Signatures</strong></p><ul>${signatures}</ul>` : ""}
        ${failures ? `<p><strong>Common Failures</strong></p><ul>${failures}</ul>` : ""}
        ${checks ? `<p><strong>Debug Checks</strong></p><ul>${checks}</ul>` : ""}
      </article>
    `;
  }

  function renderReferencePanel() {
    const q = state.termFilter.trim().toLowerCase();
    const filtered = state.terms.filter((t) => termMatchesFilter(t, q));
    const focusedTerm = findTerm(state.currentTerm);

    if (focusedTerm) {
      referenceFocusCardEl.innerHTML = renderTermCard(focusedTerm, true);
    } else if (state.currentTerm) {
      referenceFocusCardEl.innerHTML = `<div class="reference-empty">No term matched: <strong>${escapeHtml(state.currentTerm)}</strong></div>`;
    } else {
      referenceFocusCardEl.innerHTML = `<div class="reference-empty">Click a term link in docs or choose one below.</div>`;
    }

    if (!filtered.length) {
      referenceListEl.innerHTML = `<div class="reference-empty">No terms match this filter.</div>`;
      return;
    }
    referenceListEl.innerHTML = filtered
      .map((t) => {
        const href = `#page=${encodeURIComponent(state.currentPage)}&term=${encodeURIComponent(t.term)}`;
        const focused = focusedTerm && normalizeTerm(focusedTerm.term) === normalizeTerm(t.term);
        const rowId = `atlas-row-${normalizeTerm(t.term).replace(/[^a-z0-9]+/g, "-")}`;
        return `
          <a id="${rowId}" class="atlas-row${focused ? " is-focused" : ""}" href="${href}" data-term="${escapeHtml(t.term)}">
            <span class="atlas-row__title">${escapeHtml(t.term)}</span>
            <span class="atlas-row__cat">${escapeHtml(t.category || "Uncategorized")}</span>
            <span class="atlas-row__desc">${escapeHtml(t.definition || "N/A")}</span>
          </a>
        `;
      })
      .join("\n");

    if (focusedTerm) {
      const focusId = `atlas-row-${normalizeTerm(focusedTerm.term).replace(/[^a-z0-9]+/g, "-")}`;
      const el = document.getElementById(focusId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  async function loadTerms() {
    try {
      const res = await fetch("./terms.json", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const payload = await res.json();
      state.terms = Array.isArray(payload?.terms) ? payload.terms : [];
    } catch (_err) {
      state.terms = [];
      referenceFocusCardEl.innerHTML = `<div class="reference-empty">Failed to load terms.json</div>`;
    }
    renderReferencePanel();
  }

  async function loadPage(file) {
    try {
      state.currentPage = file;
      const res = await fetch(`./${file}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const md = await res.text();
      docEl.innerHTML = renderMarkdown(md);
      sourceLinkEl.href = `./${file}`;
      sourceLinkEl.textContent = `Open Source: ${file}`;
      for (const a of pageListEl.querySelectorAll("a")) {
        a.classList.toggle("active", a.dataset.file === file);
      }
      document.title = `${PAGES.find((p) => p.file === file)?.title || file} - VirtueMachine Wiki`;
    } catch (err) {
      docEl.innerHTML = `<p class="error">Failed to load ${file}: ${escapeHtml(String(err.message || err))}</p>`;
    }
  }

  function renderNav(filter = "") {
    const q = filter.trim().toLowerCase();
    const items = !q
      ? PAGES
      : PAGES.filter((p) => p.title.toLowerCase().includes(q) || p.file.toLowerCase().includes(q));
    pageListEl.innerHTML = items
      .map((p) => `<li><a href="#page=${encodeURIComponent(p.file)}" data-file="${p.file}">${escapeHtml(p.title)}</a></li>`)
      .join("\n");
  }

  function onRoute() {
    state.currentTerm = getCurrentTerm();
    renderReferencePanel();
    loadPage(getCurrentPage());
  }

  docEl.addEventListener("click", (evt) => {
    const link = evt.target.closest("a.code-link");
    if (!link) {
      return;
    }
    evt.preventDefault();
    const path = link.getAttribute("data-code-path");
    if (!path) {
      return;
    }
    showCodePath(path);
  });
  if (codeOverlayBackdropEl) {
    codeOverlayBackdropEl.addEventListener("click", closeCodeOverlay);
  }
  if (codeOverlayCloseEl) {
    codeOverlayCloseEl.addEventListener("click", closeCodeOverlay);
  }
  window.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape") {
      closeCodeOverlay();
    }
  });
  window.addEventListener("storage", (evt) => {
    if (evt.key === "vm_theme") {
      applyThemeFromDebugPanel();
    }
  });

  applyThemeFromDebugPanel();
  renderNav();
  loadTerms();
  searchEl.addEventListener("input", () => {
    renderNav(searchEl.value);
    onRoute();
  });
  referenceSearchEl.addEventListener("input", () => {
    state.termFilter = String(referenceSearchEl.value || "");
    renderReferencePanel();
  });
  window.addEventListener("hashchange", onRoute);
  onRoute();
})();
