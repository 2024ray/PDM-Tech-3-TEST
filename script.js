
const state = {
  data: null,
  quiz: [],
  practice: [],
  currentQuizIndex: 0,
  currentPracticeIndex: 0,
  quizScore: 0,
  practiceScore: 0,
  quizAnswers: [],
  practiceAnswers: [],
  quizTime: 20 * 60,
  exerciseTime: 90,
  quizTimerId: null,
  exerciseTimerId: null,
  exerciseRemaining: 90,
  quizSubmitted: false,
  practiceSubmitted: false
};

const el = (id) => document.getElementById(id);

const normalize = (text) => (text ?? "")
  .toString()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/\s+/g, " ");

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const scrollToSection = (id) => document.getElementById(id).scrollIntoView({ behavior: "smooth", block: "start" });

const setActiveStep = (target) => {
  document.querySelectorAll(".step").forEach(btn => btn.classList.toggle("active", btn.dataset.target === target));
};

const updateProgress = () => {
  const quizProg = (state.currentQuizIndex / Math.max(state.quiz.length, 1)) * 100;
  const practiceProg = (state.currentPracticeIndex / Math.max(state.practice.length, 1)) * 100;
  el("quizProgress").style.width = `${quizProg}%`;
  el("practiceProgress").style.width = `${practiceProg}%`;
  el("quizMeta").textContent = `Question ${state.currentQuizIndex + 1} / ${state.quiz.length}`;
  el("practiceMeta").textContent = `Exercice ${state.currentPracticeIndex + 1} / ${state.practice.length} — Total atelier : 40 points`;
};

const renderCourse = () => {
  el("courseIntro").textContent = state.data.cours.introduction;
  el("courseGrid").innerHTML = state.data.cours.sections.map((section, i) => `
    <article class="course-card course-card--${i % 5}">
      <h3>${section.titre}</h3>
      <p>${section.contenu}</p>
    </article>
  `).join("");
  const steps = [
    "Introduction au thème et objectifs du module",
    "Analyse du besoin à partir de situations concrètes",
    "Outils méthodologiques : bête à cornes et diagramme pieuvre",
    "Construction du CDCF",
    "Quiz de compréhension",
    "Atelier pratique",
    "Bilan et restitution PDF"
  ];
  el("courseTimeline").innerHTML = steps.map((step, i) => `
    <div class="timeline__item">
      <div class="timeline__dot">${i + 1}</div>
      <div class="timeline__content">${step}</div>
    </div>
  `).join("");
};

const renderQuiz = () => {
  const q = state.quiz[state.currentQuizIndex];
  if (!q) return;
  el("quizContainer").innerHTML = `
    <article class="question-card">
      <h3>${q.question}</h3>
      <div class="choices">
        ${q.choices.map((choice, idx) => `
          <label class="choice">
            <input type="radio" name="quizChoice" value="${idx}" ${state.quizAnswers[state.currentQuizIndex] === idx ? "checked" : ""}>
            <span>${choice}</span>
          </label>
        `).join("")}
      </div>
    </article>
  `;
  updateProgress();
  el("prevQuizBtn").disabled = state.currentQuizIndex === 0;
  el("nextQuizBtn").style.display = state.currentQuizIndex < state.quiz.length - 1 ? "inline-flex" : "none";
  el("validateQuizBtn").style.display = state.currentQuizIndex === state.quiz.length - 1 ? "inline-flex" : "none";
};

const renderPractice = () => {
  const ex = state.practice[state.currentPracticeIndex];
  if (!ex) return;
  const header = `<div class="exercise-head"><span class="badge">${ex.niveau}</span><span class="points">${ex.points} pts</span></div>`;
  let body = "";
  if (ex.type === "choix-unique") {
    body = `<div class="choices">${ex.choices.map((choice, idx) => `
      <label class="choice">
        <input type="radio" name="exerciseChoice" value="${idx}" ${state.practiceAnswers[state.currentPracticeIndex] === idx ? "checked" : ""}>
        <span>${choice}</span>
      </label>
    `).join("")}</div>`;
  } else if (ex.type === "choix-multiple") {
    const selected = Array.isArray(state.practiceAnswers[state.currentPracticeIndex]) ? state.practiceAnswers[state.currentPracticeIndex] : [];
    body = `<div class="choices">${ex.choices.map((choice, idx) => `
      <label class="choice">
        <input type="checkbox" name="exerciseMulti" value="${idx}" ${selected.includes(idx) ? "checked" : ""}>
        <span>${choice}</span>
      </label>
    `).join("")}</div>`;
  } else if (ex.type === "valeur-numerique" || ex.type === "reponse-saisie") {
    body = `<input class="text-input" id="exerciseInput" type="text" value="${state.practiceAnswers[state.currentPracticeIndex] ?? ""}" placeholder="Votre réponse">`;
  } else if (ex.type === "association") {
    body = `<div class="association">
      ${ex.pairs.map((pair, idx) => `
        <div class="association__row">
          <div class="association__left">${pair.left}</div>
          <select class="select-input" data-assoc="${idx}">
            <option value="">Choisir</option>
            ${ex.pairs.map(p => `<option value="${p.right}" ${state.practiceAnswers[state.currentPracticeIndex]?.[idx] === p.right ? "selected" : ""}>${p.right}</option>`).join("")}
          </select>
        </div>
      `).join("")}
    </div>`;
  } else if (ex.type.startsWith("texte-trous")) {
    body = `<input class="text-input" id="exerciseInput" type="text" value="${state.practiceAnswers[state.currentPracticeIndex] ?? ""}" placeholder="Complétez le texte">`;
  } else if (ex.type === "tableau-menu") {
    body = `<div class="table-box"><table><thead><tr><th>Élément</th><th>Catégorie</th></tr></thead><tbody>
      ${ex.rows.map((row, idx) => `
        <tr>
          <td>${row.label}</td>
          <td>
            <select class="select-input" data-row="${idx}">
              <option value="">Choisir</option>
              ${row.choices.map((choice, cidx) => `<option value="${cidx}" ${state.practiceAnswers[state.currentPracticeIndex]?.[idx] === cidx ? "selected" : ""}>${choice}</option>`).join("")}
            </select>
          </td>
        </tr>
      `).join("")}
    </tbody></table></div>`;
  }
  el("practiceContainer").innerHTML = `
    <article class="exercise-card">
      ${header}
      <h3>${ex.titre}</h3>
      <p>${ex.consigne}</p>
      ${body}
      <div class="exercise-timer-note ${state.exerciseRemaining <= 10 ? "warning" : ""}">Temps restant : <strong>${formatTime(state.exerciseRemaining)}</strong></div>
    </article>
  `;
  updateProgress();
  el("prevPracticeBtn").disabled = state.currentPracticeIndex === 0;
  el("nextPracticeBtn").style.display = state.currentPracticeIndex < state.practice.length - 1 ? "inline-flex" : "none";
  el("validatePracticeBtn").style.display = state.currentPracticeIndex === state.practice.length - 1 ? "inline-flex" : "none";
};

const captureQuizAnswer = () => {
  const selected = document.querySelector('input[name="quizChoice"]:checked');
  if (selected) state.quizAnswers[state.currentQuizIndex] = Number(selected.value);
};

const capturePracticeAnswer = () => {
  const ex = state.practice[state.currentPracticeIndex];
  if (!ex) return;
  if (ex.type === "choix-unique") {
    const selected = document.querySelector('input[name="exerciseChoice"]:checked');
    if (selected) state.practiceAnswers[state.currentPracticeIndex] = Number(selected.value);
  } else if (ex.type === "choix-multiple") {
    const vals = [...document.querySelectorAll('input[name="exerciseMulti"]:checked')].map(x => Number(x.value));
    state.practiceAnswers[state.currentPracticeIndex] = vals;
  } else if (ex.type === "association") {
    const obj = {};
    document.querySelectorAll("select[data-assoc]").forEach(sel => obj[sel.dataset.assoc] = sel.value);
    state.practiceAnswers[state.currentPracticeIndex] = obj;
  } else if (ex.type === "tableau-menu") {
    const obj = {};
    document.querySelectorAll("select[data-row]").forEach(sel => obj[sel.dataset.row] = sel.value === "" ? null : Number(sel.value));
    state.practiceAnswers[state.currentPracticeIndex] = obj;
  } else {
    const input = document.getElementById("exerciseInput");
    if (input) state.practiceAnswers[state.currentPracticeIndex] = input.value;
  }
};

const scoreQuiz = () => {
  state.quizScore = state.quiz.reduce((acc, q, i) => acc + (state.quizAnswers[i] === q.answer ? 1 : 0), 0);
};

const isAnswerMatch = (user, expected) => {
  if (Array.isArray(expected)) {
    if (!Array.isArray(user)) return false;
    const a = [...user].map(Number).sort((x, y) => x - y);
    const b = [...expected].map(Number).sort((x, y) => x - y);
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return normalize(user) === normalize(expected);
};

const scorePractice = () => {
  let total = 0;
  state.practice.forEach((ex, i) => {
    const user = state.practiceAnswers[i];
    let ok = false;
    if (ex.type === "choix-unique") ok = Number(user) === ex.answer;
    else if (ex.type === "choix-multiple") ok = isAnswerMatch(user, ex.answer);
    else if (ex.type === "valeur-numerique") ok = normalize(user) === normalize(ex.answer.toString());
    else if (ex.type === "reponse-saisie") ok = normalize(user) === normalize(ex.answer);
    else if (ex.type === "association") ok = ex.pairs.every((pair, idx) => normalize(user?.[idx]) === normalize(pair.right));
    else if (ex.type === "tableau-menu") ok = ex.rows.every((row, idx) => Number(user?.[idx]) === row.answer);
    else if (ex.type === "texte-trous-libre" || ex.type === "texte-trous-liste-unique") ok = Array.isArray(ex.answer) ? ex.answer.some(a => normalize(user).includes(normalize(a))) : normalize(user).includes(normalize(ex.answer));
    else if (ex.type === "texte-trous-liste-variable") {
      const words = normalize(user).split(" ");
      ok = ex.answer.some(a => words.includes(normalize(a)));
    }
    if (ok) total += ex.points;
  });
  state.practiceScore = total;
};

const mentionFor = (score) => {
  if (score >= 50) return "Excellent";
  if (score >= 45) return "Très bien";
  if (score >= 38) return "Bien";
  if (score >= 28) return "Satisfaisant";
  return "À renforcer";
};

const renderReport = () => {
  const total = state.quizScore + state.practiceScore;
  el("finalScore").textContent = `${total} / 55`;
  el("finalMention").textContent = mentionFor(total);
  const quizDetails = state.quiz.map((q, i) => `<li>${q.question} — ${state.quizAnswers[i] === q.answer ? "Correct" : "Incorrect"}</li>`).join("");
  const practiceDetails = state.practice.map((ex, i) => `<li>${ex.titre} — ${state.practice[i]?.points ?? ex.points} pts : ${i < state.practice.length ? "Corrigé" : ""}</li>`).join("");
  el("reportDetails").innerHTML = `
    <h3>Détail du quiz</h3>
    <p>Score : ${state.quizScore} / 15</p>
    <ul>${quizDetails}</ul>
    <h3>Détail de l'atelier</h3>
    <p>Score : ${state.practiceScore} / 40</p>
    <ul>${practiceDetails}</ul>
  `;
};

const startQuizTimer = () => {
  clearInterval(state.quizTimerId);
  state.quizTimerId = setInterval(() => {
    state.quizTime--;
    el("quizTimer").textContent = formatTime(state.quizTime);
    if (state.quizTime <= 0) {
      clearInterval(state.quizTimerId);
      submitQuiz();
    }
  }, 1000);
};

const startExerciseTimer = () => {
  clearInterval(state.exerciseTimerId);
  state.exerciseRemaining = state.exerciseTime;
  el("exerciseTimer").textContent = formatTime(state.exerciseRemaining);
  state.exerciseTimerId = setInterval(() => {
    state.exerciseRemaining--;
    el("exerciseTimer").textContent = formatTime(state.exerciseRemaining);
    el("exerciseTimer").classList.toggle("warning", state.exerciseRemaining <= 10);
    const note = document.querySelector(".exercise-timer-note");
    if (note) note.classList.toggle("warning", state.exerciseRemaining <= 10);
    if (state.exerciseRemaining <= 0) {
      clearInterval(state.exerciseTimerId);
      capturePracticeAnswer();
      submitPractice();
    }
  }, 1000);
};

const submitQuiz = () => {
  if (state.quizSubmitted) return;
  captureQuizAnswer();
  state.quizSubmitted = true;
  clearInterval(state.quizTimerId);
  scoreQuiz();
  setActiveStep("practiceSection");
  scrollToSection("practiceSection");
};

const submitPractice = () => {
  if (state.practiceSubmitted) return;
  capturePracticeAnswer();
  state.practiceSubmitted = true;
  clearInterval(state.exerciseTimerId);
  scorePractice();
  renderReport();
  setActiveStep("reportSection");
  scrollToSection("reportSection");
};

const loadData = async () => {
  const res = await fetch(`questions.json?t=${Date.now()}`);
  state.data = await res.json();
  state.quiz = shuffle(state.data.quizComprehension);
  state.practice = shuffle(state.data.evaluation);
  state.quizAnswers = new Array(state.quiz.length).fill(null);
  state.practiceAnswers = new Array(state.practice.length).fill(null);
  renderCourse();
  renderQuiz();
  renderPractice();
  startQuizTimer();
  startExerciseTimer();
};

document.addEventListener("change", (e) => {
  if (e.target.matches('input[name="quizChoice"]')) captureQuizAnswer();
  if (e.target.matches('input[name="exerciseChoice"], input[name="exerciseMulti"], select, #exerciseInput')) capturePracticeAnswer();
});

el("startCourseBtn").addEventListener("click", () => scrollToSection("courseSection"));
el("startQuizBtnTop").addEventListener("click", () => scrollToSection("quizSection"));
el("startQuizBtn").addEventListener("click", () => scrollToSection("quizSection"));

document.querySelectorAll(".step").forEach(btn => btn.addEventListener("click", () => {
  setActiveStep(btn.dataset.target);
  scrollToSection(btn.dataset.target);
}));

el("prevQuizBtn").addEventListener("click", () => {
  captureQuizAnswer();
  if (state.currentQuizIndex > 0) {
    state.currentQuizIndex--;
    renderQuiz();
  }
});

el("nextQuizBtn").addEventListener("click", () => {
  captureQuizAnswer();
  if (state.currentQuizIndex < state.quiz.length - 1) {
    state.currentQuizIndex++;
    renderQuiz();
  }
});

el("validateQuizBtn").addEventListener("click", submitQuiz);

el("prevPracticeBtn").addEventListener("click", () => {
  capturePracticeAnswer();
  if (state.currentPracticeIndex > 0) {
    state.currentPracticeIndex--;
    renderPractice();
  }
});

el("nextPracticeBtn").addEventListener("click", () => {
  capturePracticeAnswer();
  if (state.currentPracticeIndex < state.practice.length - 1) {
    state.currentPracticeIndex++;
    renderPractice();
    startExerciseTimer();
  }
});

el("validatePracticeBtn").addEventListener("click", submitPractice);

el("downloadPdfBtn").addEventListener("click", () => {
  const element = document.getElementById("reportCard");
  const opt = {
    margin: 10,
    filename: `bilan-module-2-${new Date().toISOString().replace(/[:.]/g, "-")}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };
  html2pdf().set(opt).from(element).save();
});

el("restartBtn").addEventListener("click", () => {
  clearInterval(state.quizTimerId);
  clearInterval(state.exerciseTimerId);
  state.currentQuizIndex = 0;
  state.currentPracticeIndex = 0;
  state.quizScore = 0;
  state.practiceScore = 0;
  state.quizAnswers = new Array(state.quiz.length).fill(null);
  state.practiceAnswers = new Array(state.practice.length).fill(null);
  state.quizTime = 20 * 60;
  state.exerciseRemaining = 90;
  state.quizSubmitted = false;
  state.practiceSubmitted = false;
  el("quizTimer").textContent = formatTime(state.quizTime);
  el("exerciseTimer").textContent = formatTime(state.exerciseRemaining);
  el("exerciseTimer").classList.remove("warning");
  loadData();
});

loadData();
