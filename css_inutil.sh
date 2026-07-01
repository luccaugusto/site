#!/bin/bash
#
# css_inutil.sh — encontra seletores de classe/id provavelmente MORTOS no CSS.
#
# Para cada arquivo .css do site, extrai todo seletor de classe (.foo) e id
# (#foo) e procura qualquer referência a esse nome no código-fonte (HTML, JS,
# Markdown, YAML, JSON) — não só nos HTML, porque muitas classes são ligadas
# via JavaScript (classList/className) ou montadas em templates Liquid.
#
# ATENÇÃO: nomes montados dinamicamente escapam da busca textual. Ex.:
#   `br-door--${dir}`  →  .br-door--left / --right / --ahead / --back
#   `gram-arrow--${d}` →  .gram-arrow--prev / --next
# Esses aparecem como "não utilizada" mas ESTÃO em uso. SEMPRE confira cada
# candidato à mão (grep pelo prefixo no JS) antes de apagar.
#
# Uso: ./css_inutil.sh

set -euo pipefail
cd "$(dirname "$0")"

python3 - <<'PY'
import os, re

ROOT = os.getcwd()
EXCLUDE_DIRS = {".git", "_site", "docs", "node_modules", "cursors"}
USAGE_EXT = {".html", ".md", ".js", ".mjs", ".yml", ".yaml", ".json", ".xml", ".liquid", ".svg"}

# Descobre todos os CSS (fora de _site) dinamicamente.
css_files = []
for dp, dn, fn in os.walk(ROOT):
    dn[:] = [d for d in dn if d not in EXCLUDE_DIRS and not d.startswith(".")]
    for f in fn:
        if f.endswith(".css"):
            css_files.append(os.path.relpath(os.path.join(dp, f), ROOT))
css_files.sort()

def selectors(css):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    classes, ids, buf = set(), set(), []
    for ch in css:
        if ch == "{":
            sel = "".join(buf).strip(); buf = []
            if not sel.startswith("@"):
                classes |= {m.group(1) for m in re.finditer(r"\.(-?[A-Za-z_][\w-]*)", sel)}
                ids |= {m.group(1) for m in re.finditer(r"#(-?[A-Za-z_][\w-]*)", sel)}
        elif ch == "}":
            buf = []
        else:
            buf.append(ch)
    return classes, ids

# Lê o corpus de uso uma única vez.
corpus = {}
for dp, dn, fn in os.walk(ROOT):
    dn[:] = [d for d in dn if d not in EXCLUDE_DIRS and not d.startswith(".")]
    for f in fn:
        if os.path.splitext(f)[1].lower() in USAGE_EXT:
            rel = os.path.relpath(os.path.join(dp, f), ROOT)
            if rel in css_files:
                continue
            try:
                corpus[rel] = open(os.path.join(dp, f), encoding="utf-8", errors="ignore").read()
            except Exception:
                pass

total = 0
for css in css_files:
    classes, ids = selectors(open(os.path.join(ROOT, css), encoding="utf-8", errors="ignore").read())
    dead = []
    for name in sorted(classes) + sorted(ids):
        pat = re.compile(r"(?<![\w-])" + re.escape(name) + r"(?![\w-])")
        if not any(pat.search(t) for t in corpus.values()):
            dead.append(("." if name in classes else "#") + name)
    print(f"\n=== {css} ({len(classes)} classes, {len(ids)} ids) ===")
    if dead:
        total += len(dead)
        for d in dead:
            print(f"  {d} — não utilizada")
    else:
        print("  (nenhuma classe/id morta encontrada)")

print(f"\n{total} candidato(s). Confira dinâmicos (BEM `--modificador`) antes de apagar.")
PY
