---
---
const cursors = [
{%- for f in site.static_files -%}
{%- if f.path contains "/cursors/" and f.extname == ".cur" %}
  "{{ f.name }}",
{%- endif -%}
{%- endfor %}
];

function randomize_cursor() {
  var bodyElement = document.getElementsByTagName("body")[0];
  // one extra slot is a no-op, so sometimes the default cursor stays
  var index = Math.floor(Math.random() * (cursors.length + 1));
  if (index === cursors.length) return;
  bodyElement.style.cursor = `url('/cursors/${cursors[index]}'), auto`;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", randomize_cursor);
} else {
  randomize_cursor();
}
