---
---
function piada() {
  const piadas = {{ site.data.piadas | jsonify }};
  const pPiada = document.getElementById("p-piada");
  if (pPiada) {
    pPiada.innerHTML = piadas[Math.floor(Math.random() * 100) % piadas.length];
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", piada);
} else {
  piada();
}
