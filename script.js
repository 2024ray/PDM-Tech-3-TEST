// script.js
let data = null;

// État
let quizQuestions = [];
let evalExercises = [];
let quizTimer = null;
let evalTimer = null;
let quizTimeRemaining = 20 * 60; // 20 minutes en secondes
let evalTimeRemaining = 90; // 90 secondes
let quizAnswers = {};
let evalAnswers = {};
let quizScore = 0;
let evalScore = 0;

// Utilitaires
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function normalizeText(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Chargement des données
async function loadData() {
  const res = await fetch("questions.json?t=" + Date.now());
  data = await res.json();
  initCours();
  initQuiz();
  initEvaluation();
}

// Initialisation cours
function initCours() {
  const grid = document.getElementById("cours-grid");
  const timeline = document.getElementById("timeline");
  const cours = data.cours;

  // Introduction
  const introCard = document.createElement("article");
  introCard.className = "cours-card card-intro";
  introCard.innerHTML = `
    <h3>${cours.introduction.titre}</h3>
    <p>${cours.introduction.contenu}</p>
  `;
  grid.appendChild(introCard);

  // Sections
  cours.sections.forEach((sec) => {
    const card = document.createElement("article");
    card.className = `cours-card card-${sec.couleur}`;
    card.innerHTML = `
      <h3>${sec.titre}</h3>
      <p>${sec.contenu}</p>
    `;
    grid.appendChild(card);
  });

  // Timeline
  cours.timeline.forEach((step, index) => {
    const item = document.createElement("div");
    item.className = "timeline-item";
    item.innerHTML = `
      <div class="timeline-icon">
        <i class="fa-solid ${step.icone}"></i>
      </div>
      <div class="timeline-content">
        <span class="timeline-step">Étape ${index + 1}</span>
        <h4>${step.etape}</h4>
        <p>${step.description}</p>
      </div>
    `;
    timeline.appendChild(item);
  });
}

// Initialisation quiz
function initQuiz() {
  quizQuestions = shuffle([...data.quizComprehension]);
  const form = document.getElementById("quiz-form");
  form.innerHTML = "";

  quizQuestions.forEach((q, idx) => {
    const block = document.createElement("div");
    block.className = "quiz-question";
    block.dataset.qid = q.id;

    const optionsShuffled = shuffle([...q.options]);

    block.innerHTML = `
      <div class="quiz-question-header">
        <span class="quiz-index">Question ${idx + 1} / ${quizQuestions.length}</span>
        <span class="quiz-points">${q.points} pt${q.points > 1 ? "s" : ""}</span>
      </div>
      <p class="quiz-text">${q.question}</p>
      <div class="quiz-options">
        ${optionsShuffled
          .map((opt, optIndex) => {
            const inputName = `quiz-q-${q.id}`;
            const type = q.type === "choix-multiple" ? "checkbox" : "radio";
            const id = `${inputName}-${optIndex}`;
            return `
              <label class="quiz-option">
                <input type="${type}" name="${inputName}" value="${opt}" id="${id}" />
                <span>${opt}</span>
              </label>
            `;
          })
          .join("")}
      </div>
    `;
    form.appendChild(block);
  });

  updateQuizProgress();
}

// Initialisation évaluation
let currentEvalIndex = 0;

function initEvaluation() {
  evalExercises = shuffle([...data.evaluation]);
  document.getElementById("eval-total").textContent = evalExercises.length;
  currentEvalIndex = 0;
  renderCurrentEval();
}

// Rendu d'un exercice
function renderCurrentEval() {
  const container = document.getElementById("eval-container");
  container.innerHTML = "";
  const ex = evalExercises[currentEvalIndex];
  document.getElementById("eval-current-index").textContent = currentEvalIndex + 1;

  const badgeClass =
    ex.niveau === "Facile"
      ? "badge-level badge-easy"
      : ex.niveau === "Moyen"
      ? "badge-level badge-medium"
      : "badge-level badge-hard";

  const wrapper = document.createElement("div");
  wrapper.className = "eval-exercise";
  wrapper.dataset.eid = ex.id;

  let content = `
    <div class="eval-header-row">
      <span class="${badgeClass}">${ex.niveau}</span>
      <span class="eval-points">${ex.points} pt${ex.points > 1 ? "s" : ""}</span>
    </div>
  `;

  if (ex.type === "tableau-menu") {
    content += `<p class="eval-text">${ex.intitule}</p>`;
    content += `<table class="eval-table"><tbody>`;
    ex.tableau.forEach((row, idx) => {
      content += `
        <tr>
          <td>${row.label}</td>
          <td>
            <select data-row-index="${idx}" class="eval-select">
              <option value="">-- Choisir --</option>
              ${shuffle([...row.options])
                .map((opt) => `<option value="${opt}">${opt}</option>`)
                .join("")}
            </select>
          </td>
        </tr>
      `;
    });
    content += `</tbody></table>`;
  } else if (ex.type === "choix-unique" || ex.type === "choix-multiple") {
    content += `<p class="eval-text">${ex.question}</p>`;
    content += `<div class="eval-options">`;
    const optionsShuffled = shuffle([...ex.options]);
    optionsShuffled.forEach((opt, idx) => {
      const inputName = `eval-${ex.id}`;
      const type = ex.type === "choix-multiple" ? "checkbox" : "radio";
      const id = `${inputName}-${idx}`;
      content += `
        <label class="eval-option">
          <input type="${type}" name="${inputName}" value="${opt}" id="${id}" />
          <span>${opt}</span>
        </label>
      `;
    });
    content += `</div>`;
  } else if (ex.type === "valeur-numerique") {
    content += `<p class="eval-text">${ex.question}</p>`;
    content += `
      <div class="eval-input-row">
        <input type="number" step="any" class="eval-input-number" />
        <span class="eval-unit">${ex.unite}</span>
      </div>
    `;
  } else if (ex.type === "reponse-saisie") {
    content += `<p class="eval-text">${ex.question}</p>`;
    content += `
      <input type="text" class="eval-input-text" placeholder="Votre réponse" />
    `;
  } else if (ex.type === "association") {
    content += `<p class="eval-text">${ex.intitule}</p>`;
    content += `<table class="eval-table"><tbody>`;
    ex.paires.forEach((pair, idx) => {
      content += `
        <tr>
          <td>${pair.gauche}</td>
          <td>
            <select data-pair-index="${idx}" class="eval-select">
              <option value="">-- Associer --</option>
              ${shuffle([...pair.droiteOptions])
                .map((opt) => `<option value="${opt}">${opt}</option>`)
                .join("")}
            </select>
          </td>
        </tr>
      `;
    });
    content += `</tbody></table>`;
  } else if (ex.type === "texte-trous-libre" || ex.type === "texte-trous-liste-unique" || ex.type === "texte-trous-liste-variable") {
    content += `<p class="eval-text">Texte à compléter :</p>`;
    const parts = ex.texte.split("______");
    let htmlTexte = "";
    for (let i = 0; i < parts.length; i++) {
      htmlTexte += `<span>${parts[i]}</span>`;
      if (i < ex.trous.length) {
        const trou = ex.trous[i];
        if (ex.type === "texte-trous-libre") {
          htmlTexte += `<input type="text" class="eval-input-text eval-blank" data-blank-index="${i}" />`;
        } else {
          const options = shuffle([...trou.options]);
          htmlTexte += `
            <select class="eval-select eval-blank" data-blank-index="${i}">
              <option value="">-- Choisir --</option>
              ${options.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
            </select>
          `;
        }
      }
    }
    content += `<div class="eval-text-blanks">${htmlTexte}</div>`;
  }

  wrapper.innerHTML = content;
  container.appendChild(wrapper);

  resetEvalTimer();
}

// Chronomètre quiz
function startQuizTimer() {
  clearInterval(quizTimer);
  quizTimeRemaining = 20 * 60;
  quizTimer = setInterval(() => {
    quizTimeRemaining--;
    if (quizTimeRemaining <= 0) {
      quizTimeRemaining = 0;
      clearInterval(quizTimer);
      alert("Temps du quiz écoulé. Vos réponses vont être enregistrées.");
      computeQuizScore();
    }
    updateQuizTimerDisplay();
  }, 1000);
}

function updateQuizTimerDisplay() {
  const display = document.getElementById("quiz-time-display");
  const minutes = String(Math.floor(quizTimeRemaining / 60)).padStart(2, "0");
  const seconds = String(quizTimeRemaining % 60).padStart(2, "0");
  display.textContent = `${minutes}:${seconds}`;
}

// Chronomètre évaluation
function resetEvalTimer() {
  clearInterval(evalTimer);
  evalTimeRemaining = 90;
  updateEvalTimerDisplay();
  const timerEl = document.getElementById("eval-timer");
  timerEl.classList.remove("warning");

  evalTimer = setInterval(() => {
    evalTimeRemaining--;
    if (evalTimeRemaining <= 10) {
      timerEl.classList.add("warning");
    }
    if (evalTimeRemaining <= 0) {
      evalTimeRemaining = 0;
      clearInterval(evalTimer);
      alert("Temps de l'exercice écoulé. Vous pouvez passer au suivant.");
    }
    updateEvalTimerDisplay();
  }, 1000);
}

function updateEvalTimerDisplay() {
  const display = document.getElementById("eval-time-display");
  const minutes = String(Math.floor(evalTimeRemaining / 60)).padStart(2, "0");
  const seconds = String(evalTimeRemaining % 60).padStart(2, "0");
  display.textContent = `${minutes}:${seconds}`;
}

// Progression quiz
function updateQuizProgress() {
  const progress = document.getElementById("quiz-progress");
  const total = quizQuestions.length;
  const answered = Object.keys(quizAnswers).length;
  const percent = (answered / total) * 100;
  progress.style.width = `${percent}%`;
}

// Collecte réponses quiz
function collectQuizAnswers() {
  quizAnswers = {};
  quizQuestions.forEach((q) => {
    const name = `quiz-q-${q.id}`;
    const inputs = document.querySelectorAll(`input[name="${name}"]`);
    const selected = [];
    inputs.forEach((inp) => {
      if (inp.checked) selected.push(inp.value);
    });
    quizAnswers[q.id] = selected;
  });
  updateQuizProgress();
}

// Correction quiz
function computeQuizScore() {
  collectQuizAnswers();
  quizScore = 0;
  const detailsContainer = document.getElementById("bilan-quiz-list");
  detailsContainer.innerHTML = "";

  quizQuestions.forEach((q, idx) => {
    const user = quizAnswers[q.id] || [];
    const correctOptions = q.bonneReponse.map((index) => q.options[index]);
    const isCorrect =
      user.length === correctOptions.length &&
      user.every((u) => correctOptions.includes(u));

    if (isCorrect) quizScore += q.points;

    const item = document.createElement("div");
    item.className = "bilan-item";
    item.innerHTML = `
      <div class="bilan-item-header">
        <span class="bilan-question-label">Q${idx + 1}</span>
        <span class="bilan-result ${isCorrect ? "ok" : "ko"}">
          ${isCorrect ? "Correct" : "Incorrect"}
        </span>
      </div>
      <p class="bilan-question-text">${q.question}</p>
      <p class="bilan-answer"><strong>Votre réponse :</strong> ${
        user.length ? user.join(", ") : "Aucune"
      }</p>
      <p class="bilan-answer"><strong>Bonne réponse :</strong> ${correctOptions.join(", ")}</p>
    `;
    detailsContainer.appendChild(item);
  });

  updateBilanScores();
}

// Collecte réponses évaluation
function collectCurrentEvalAnswer() {
  const ex = evalExercises[currentEvalIndex];
  const container = document.querySelector(".eval-exercise");
  if (!container) return;

  let answer = null;

  if (ex.type === "tableau-menu") {
    answer = [];
    const selects = container.querySelectorAll(".eval-select");
    selects.forEach((sel) => {
      answer.push(sel.value || "");
    });
  } else if (ex.type === "choix-unique" || ex.type === "choix-multiple") {
    answer = [];
    const inputs = container.querySelectorAll("input");
    inputs.forEach((inp) => {
      if (inp.checked) answer.push(inp.value);
    });
  } else if (ex.type === "valeur-numerique") {
    const inp = container.querySelector(".eval-input-number");
    answer = inp && inp.value !== "" ? parseFloat(inp.value) : null;
  } else if (ex.type === "reponse-saisie") {
    const inp = container.querySelector(".eval-input-text");
    answer = inp ? inp.value : "";
  } else if (ex.type === "association") {
    answer = [];
    const selects = container.querySelectorAll(".eval-select");
    selects.forEach((sel) => {
      answer.push(sel.value || "");
    });
  } else if (
    ex.type === "texte-trous-libre" ||
    ex.type === "texte-trous-liste-unique" ||
    ex.type === "texte-trous-liste-variable"
  ) {
    answer = [];
    const blanks = container.querySelectorAll(".eval-blank");
    blanks.forEach((b) => {
      answer.push(b.value || "");
    });
  }

  evalAnswers[ex.id] = answer;
}

// Correction évaluation
function computeEvalScore() {
  evalScore = 0;
  const detailsContainer = document.getElementById("bilan-eval-list");
  detailsContainer.innerHTML = "";

  evalExercises.forEach((ex, idx) => {
    const user = evalAnswers[ex.id];
    let gained = 0;
    let isCorrect = false;

    if (ex.type === "tableau-menu") {
      if (user && user.length === ex.tableau.length) {
        let allGood = true;
        ex.tableau.forEach((row, i) => {
          if (user[i] !== row.bonneReponse) allGood = false;
        });
        if (allGood) gained = ex.points;
        isCorrect = allGood;
      }
    } else if (ex.type === "choix-unique" || ex.type === "choix-multiple") {
      const correctOptions = ex.bonneReponse.map((index) => ex.options[index]);
      if (user && user.length === correctOptions.length && user.every((u) => correctOptions.includes(u))) {
        gained = ex.points;
        isCorrect = true;
      }
    } else if (ex.type === "valeur-numerique") {
      if (user !== null && user === ex.bonneReponse) {
        gained = ex.points;
        isCorrect = true;
      }
    } else if (ex.type === "reponse-saisie") {
      const normUser = normalizeText(user);
      const normCorrect = normalizeText(ex.bonneReponse);
      if (normUser === normCorrect) {
        gained = ex.points;
        isCorrect = true;
      }
    } else if (ex.type === "association") {
      if (user && user.length === ex.paires.length) {
        let allGood = true;
        ex.paires.forEach((pair, i) => {
          if (user[i] !== pair.bonneReponse) allGood = false;
        });
        if (allGood) gained = ex.points;
        isCorrect = allGood;
      }
    } else if (
      ex.type === "texte-trous-libre" ||
      ex.type === "texte-trous-liste-unique" ||
      ex.type === "texte-trous-liste-variable"
    ) {
      if (user && user.length === ex.trous.length) {
        let allGood = true;
        ex.trous.forEach((trou, i) => {
          const normUser = normalizeText(user[i]);
          const normCorrect = normalizeText(trou.bonneReponse);
          if (normUser !== normCorrect) allGood = false;
        });
        if (allGood) gained = ex.points;
        isCorrect = allGood;
      }
    }

    evalScore += gained;

    const item = document.createElement("div");
    item.className = "bilan-item";
    const label = `E${idx + 1}`;
    let questionText = ex.question || ex.intitule || ex.texte;

    item.innerHTML = `
      <div class="bilan-item-header">
        <span class="bilan-question-label">${label}</span>
        <span class="bilan-result ${isCorrect ? "ok" : "ko"}">
          ${isCorrect ? `Correct (+${gained} pts)` : `Incorrect (+${gained} pts)`}
        </span>
      </div>
      <p class="bilan-question-text">${questionText}</p>
      <p class="bilan-answer"><strong>Votre réponse :</strong> ${
        user == null
          ? "Aucune"
          : Array.isArray(user)
          ? user.join(", ")
          : user.toString()
      }</p>
    `;
    detailsContainer.appendChild(item);
  });

  updateBilanScores();
}

// Bilan global
function updateBilanScores() {
  document.getElementById("bilan-quiz-score").textContent = quizScore;
  document.getElementById("bilan-eval-score").textContent = evalScore;
  const total = quizScore + evalScore;
  document.getElementById("bilan-total-score").textContent = total;

  let mention = "À consolider";
  if (total >= 50) mention = "Excellent";
  else if (total >= 45) mention = "Très bien";
  else if (total >= 35) mention = "Bien";
  else if (total >= 25) mention = "Passable";

  document.getElementById("bilan-mention").textContent = mention;
}

// Navigation
function showSection(id) {
  document.querySelectorAll(".section").forEach((sec) => sec.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

// PDF
function downloadPDF() {
  const element = document.getElementById("bilan-zone");
  const opt = {
    margin: 10,
    filename: `bilan_module2_${new Date().toISOString().replace(/[:.]/g, "-")}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };
  html2pdf().set(opt).from(element).save();
}

// Restart
function restartSession() {
  clearInterval(quizTimer);
  clearInterval(evalTimer);
  quizAnswers = {};
  evalAnswers = {};
  quizScore = 0;
  evalScore = 0;
  document.getElementById("bilan-quiz-list").innerHTML = "";
  document.getElementById("bilan-eval-list").innerHTML = "";
  initQuiz();
  initEvaluation();
  showSection("section-cours");
}

// Événements
document.addEventListener("DOMContentLoaded", () => {
  loadData();

  document.getElementById("start-quiz-btn").addEventListener("click", () => {
    showSection("section-quiz");
    startQuizTimer();
  });

  document.getElementById("submit-quiz-btn").addEventListener("click", () => {
    clearInterval(quizTimer);
    computeQuizScore();
    showSection("section-eval");
    resetEvalTimer();
  });

  document.getElementById("eval-prev-btn").addEventListener("click", () => {
    collectCurrentEvalAnswer();
    if (currentEvalIndex > 0) {
      currentEvalIndex--;
      renderCurrentEval();
    }
  });

  document.getElementById("eval-next-btn").addEventListener("click", () => {
    collectCurrentEvalAnswer();
    if (currentEvalIndex < evalExercises.length - 1) {
      currentEvalIndex++;
      renderCurrentEval();
    } else {
      clearInterval(evalTimer);
      computeEvalScore();
      showSection("section-bilan");
    }
  });

  document.getElementById("download-pdf-btn").addEventListener("click", downloadPDF);

  document.getElementById("restart-btn").addEventListener("click", () => {
    restartSession();
  });

  // Feedback visuel sur sélection
  document.body.addEventListener("change", (e) => {
    if (e.target.matches("input[type='radio'], input[type='checkbox'], select")) {
      const label = e.target.closest("label, td, .eval-text-blanks");
      if (label) {
        label.classList.add("selected");
      }
      updateQuizProgress();
    }
  });
});
