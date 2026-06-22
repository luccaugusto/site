// Clone today's workout card to the top of the treino page so it's front and center.
// The "Semana" cards below stay the single source of truth;
// this just mirrors the one matching the local
// weekday (and shows a rest note on weekends, which have no session).
(() => {
  const root = document.getElementById("treino-hoje");
  const week = document.querySelector(".treino .week");
  if (!root || !week) return;

  const NAMES = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  const dia = new Date().getDay(); // 0=Domingo .. 6=Sábado (viewer's local day)

  const title = document.createElement("h2");
  title.textContent = `Hoje — ${NAMES[dia]}`;
  root.appendChild(title);

  const card = week.querySelector(`.card[data-dia="${dia}"]`);
  if (card) {
    const clone = card.cloneNode(true);
    clone.removeAttribute("data-dia");
    root.appendChild(clone);
  } else {
    const rest = document.createElement("article");
    rest.className = "card";
    rest.innerHTML =
      '<div class="card-body"><p>Dia de descanso — sem treino marcado hoje. ' +
      "Aproveita pra recuperar, alongar ou fazer um cardio leve.</p></div>";
    root.appendChild(rest);
  }
})();
