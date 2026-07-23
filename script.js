
let data = null;
let quizQuestions = [];
let evalQuestions = [];
let quizIndex = 0;
let evalIndex = 0;
let scoreQuiz = 0;
let scoreEval = 0;
let detailsQuiz = [];
let detailsEval = [];
let timerQuiz = null;
let timerEval = null;
let tempsQuizRestant = 20 * 60;

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function formatTemps(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function normaliserTexte(texte, ignorerCasse, ignorerAccents) {
    let t = texte.trim().toLowerCase();
    if (ignorerAccents) t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return t;
}

function remplacerTrous(texte, elements) {
    const parties = texte.split('{{}}');
    let resultat = parties[0];
    for (let i = 0; i < elements.length; i++) {
        resultat += elements[i] + (parties[i + 1] || '');
    }
    return resultat;
}

// ========== CHARGEMENT DES DONNÉES ==========
async function chargerDonnees() {
    try {
        const res = await fetch('questions.json?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
    } catch (e) {
        console.error("Erreur de chargement du JSON:", e);
        return;
    }
    initialiserCours();
    preparerQuiz();
    preparerEval();
}

// ========== INITIALISATION DU COURS (STYLE ÉPURÉ) ==========
function initialiserCours() {
    const icons = [
        "fa-solid fa-bullseye",
        "fa-solid fa-diagram-project",
        "fa-solid fa-file-contract",
        "fa-solid fa-timeline"
    ];

    let html = `
        <div class="cours-intro-box">
            <div class="intro-icon"><i class="fa-solid fa-compass"></i></div>
            <div class="intro-content">
                <strong>Focus du Module 2</strong>
                <p>${data.cours.introduction}</p>
            </div>
        </div>
    `;

    data.cours.sections.forEach((s, index) => {
        const iconClass = icons[index] || "fa-solid fa-bookmark";
        
        if (s.titre.includes("Déroulement")) {
            html += `
                <div class="cours-card full-width">
                    <div class="card-icon"><i class="${iconClass}"></i></div>
                    <div class="card-body">
                        <h3>${s.titre}</h3>
                        <p class="section-desc">${s.contenu}</p>
                        <div class="timeline-container">
                            <div class="timeline-step">
                                <span class="step-num">1</span>
                                <span class="step-title">Introduction</span>
                                <span class="step-desc">Objectifs & Cadre</span>
                            </div>
                            <div class="timeline-step">
                                <span class="step-num">2</span>
                                <span class="step-title">Théorie</span>
                                <span class="step-desc">Cours & CDCF</span>
                            </div>
                            <div class="timeline-step">
                                <span class="step-num">3</span>
                                <span class="step-title">Pratique</span>
                                <span class="step-desc">Cas concrets</span>
                            </div>
                            <div class="timeline-step">
                                <span class="step-num">4</span>
                                <span class="step-title">Restitution</span>
                                <span class="step-desc">Débat & Bilan</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="cours-card">
                    <div class="card-icon"><i class="${iconClass}"></i></div>
                    <div class="card-body">
                        <h3>${s.titre}</h3>
                        <p>${s.contenu}</p>
                    </div>
                </div>
            `;
        }
    });

    $('#contenu-cours').innerHTML = html;
}

// ========== QUIZ (15 QUESTIONS) ==========
function preparerQuiz() {
    quizQuestions = shuffle(data.quizComprehension).map(q => ({ ...q, options: shuffle(q.options) }));
    $('#btn-commencer-quiz').addEventListener('click', demarrerQuiz);
}

function demarrerQuiz() {
    $('#section-cours').classList.add('hidden');
    $('#section-quiz').classList.remove('hidden');
    quizIndex = 0;
    scoreQuiz = 0;
    detailsQuiz = [];
    tempsQuizRestant = 20 * 60;
    afficherQuestionQuiz();
    lancerTimerQuiz();
}

function afficherQuestionQuiz() {
    if (quizIndex >= quizQuestions.length) { terminerQuiz(); return; }
    const q = quizQuestions[quizIndex];
    $('#quiz-progress').textContent = `Question ${quizIndex + 1} / ${quizQuestions.length}`;
    $('#quiz-progress-bar').style.width = `${(quizIndex / quizQuestions.length) * 100}%`;
    $('#quiz-question').innerHTML = `<strong>Q${quizIndex + 1}.</strong> ${q.question}`;
    
    const optDiv = $('#quiz-options');
    optDiv.innerHTML = '';
    q.options.forEach((opt, i) => {
        const div = document.createElement('div');
        div.className = 'option-item';
        div.innerHTML = `<input type="radio" name="quiz-opt" id="qopt${i}" value="${i}"><label for="qopt${i}">${opt.texte}</label>`;
        div.addEventListener('click', () => {
            $$('#quiz-options .option-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            div.querySelector('input').checked = true;
        });
        optDiv.appendChild(div);
    });
    $('#btn-suivant-quiz').classList.remove('hidden');
}

function lancerTimerQuiz() {
    clearInterval(timerQuiz);
    mettreAJourTimerQuiz();
    timerQuiz = setInterval(() => {
        tempsQuizRestant--;
        mettreAJourTimerQuiz();
        if (tempsQuizRestant <= 0) { clearInterval(timerQuiz); terminerQuiz(); }
    }, 1000);
}

function mettreAJourTimerQuiz() {
    const t = $('#quiz-timer');
    t.textContent = `⏱️ ${formatTemps(tempsQuizRestant)}`;
    t.classList.toggle('warning', tempsQuizRestant < 60);
}

$('#btn-suivant-quiz').addEventListener('click', () => {
    const sel = document.querySelector('input[name="quiz-opt"]:checked');
    const q = quizQuestions[quizIndex];
    let bonne = false;
    if (sel) {
        bonne = q.options[parseInt(sel.value)].correct;
        if (bonne) scoreQuiz++;
    }
    detailsQuiz.push({
        question: q.question,
        reponseEleve: sel ? q.options[parseInt(sel.value)].texte : 'Aucune réponse',
        bonneReponse: q.options.find(o => o.correct).texte,
        correct: bonne
    });
    quizIndex++;
    afficherQuestionQuiz();
});

function terminerQuiz() {
    clearInterval(timerQuiz);
    $('#section-quiz').classList.add('hidden');
    $('#section-eval').classList.remove('hidden');
    evalIndex = 0;
    scoreEval = 0;
    detailsEval = [];
    afficherExerciceEval();
}

// ========== ATELIER PRATIQUE / EXERCICES ==========
function preparerEval() {
    evalQuestions = shuffle(data.evaluation);
    $('#btn-suivant-eval').addEventListener('click', () => validerEtSuivantEval());
}

function afficherExerciceEval() {
    if (evalIndex >= evalQuestions.length) { terminerEval(); return; }
    const ex = evalQuestions[evalIndex];
    $('#eval-progress').textContent = `Exercice ${evalIndex + 1} / ${evalQuestions.length}`;
    $('#eval-progress-bar').style.width = `${(evalIndex / evalQuestions.length) * 100}%`;
    
    let badge = ex.niveau === 'Facile' ? '<span class="badge badge-facile">Facile</span>' :
                ex.niveau === 'Moyen' ? '<span class="badge badge-moyen">Moyen</span>' :
                '<span class="badge badge-avance">Avancé</span>';
    
    $('#eval-question').innerHTML = `<strong>${ex.titre}</strong> ${badge}<br><br>${ex.enonce}`;
    const content = $('#eval-content');
    content.innerHTML = '';
    
    const renderers = {
        'tableau-menu': renderTableauMenu,
        'choix-unique': renderChoixUnique,
        'choix-multiple': renderChoixMultiple,
        'valeur-numerique': renderValeurNumerique,
        'reponse-saisie': renderReponseSaisie,
        'association': renderAssociation,
        'texte-trous-libre': renderTexteTrousLibre,
        'texte-trous-liste-unique': renderTexteTrousListeUnique,
        'texte-trous-liste-variable': renderTexteTrousListeVariable
    };
    
    if (renderers[ex.type]) renderers[ex.type](ex, content);
    lancerTimerEval();
}

function lancerTimerEval() {
    clearInterval(timerEval);
    let tempsRestant = 90;
    const t = $('#eval-timer');
    t.textContent = `⏱️ ${formatTemps(tempsRestant)}`;
    t.classList.remove('warning');
    timerEval = setInterval(() => {
        tempsRestant--;
        t.textContent = `⏱️ ${formatTemps(tempsRestant)}`;
        if (tempsRestant < 10) t.classList.add('warning');
        if (tempsRestant <= 0) { clearInterval(timerEval); validerEtSuivantEval(); }
    }, 1000);
}

// Rendu interactif des types d'exercices
function renderTableauMenu(ex, container) {
    const table = document.createElement('table');
    table.className = 'tableau-menu';
    table.innerHTML = `<thead><tr><th>N°</th><th>Énoncé</th><th>Réponse</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    shuffle([...ex.questions]).forEach((q, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="num">${i+1}</td><td>${q.enonce}</td><td></td>`;
        const select = document.createElement('select');
        select.dataset.questionId = q.id;
        select.dataset.pts = q.pts;
        select.innerHTML = '<option value="">-- Choisir --</option>';
        shuffle([...q.options]).forEach(opt => {
            const o = document.createElement('option');
            o.value = opt.texte;
            o.dataset.correct = opt.correct;
            o.textContent = opt.texte;
            select.appendChild(o);
        });
        tr.cells[2].appendChild(select);
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
}

function renderChoixUnique(ex, container) {
    shuffle([...ex.options]).forEach((opt, i) => {
        const div = document.createElement('div');
        div.className = 'option-item';
        div.innerHTML = `<input type="radio" name="choix-unique" id="cu${i}" value="${i}"><label for="cu${i}">${opt.texte}</label>`;
        div.addEventListener('click', () => {
            $$('#eval-content .option-item').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            div.querySelector('input').checked = true;
        });
        container.appendChild(div);
    });
}

function renderChoixMultiple(ex, container) {
    shuffle([...ex.options]).forEach((opt, i) => {
        const div = document.createElement('div');
        div.className = 'option-item';
        div.innerHTML = `<input type="checkbox" id="cm${i}" value="${i}"><label for="cm${i}">${opt.texte}</label>`;
        div.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') div.querySelector('input').checked = !div.querySelector('input').checked;
            div.classList.toggle('selected', div.querySelector('input').checked);
        });
        container.appendChild(div);
    });
}

function renderValeurNumerique(ex, container) {
    container.innerHTML = `<input type="text" class="reponse-saisie-input" id="valeur-numerique-input" placeholder="Saisis ta réponse numérique...">`;
}

function renderReponseSaisie(ex, container) {
    container.innerHTML = `<input type="text" class="reponse-saisie-input" id="reponse-saisie-input" placeholder="Saisis ta réponse...">`;
}

function renderAssociation(ex, container) {
    const div = document.createElement('div');
    div.className = 'association-container';
    const col = document.createElement('div');
    col.className = 'association-colonne';
    col.innerHTML = '<h4>Associe chaque terme à sa correspondance :</h4>';
    const defs = shuffle(ex.associations.map(a => a.definition));
    shuffle([...ex.associations]).forEach(asso => {
        const item = document.createElement('div');
        item.className = 'association-item';
        item.dataset.terme = asso.terme;
        item.dataset.pts = asso.pts;
        let selectHTML = `<strong>${asso.terme}</strong><select><option value="">-- Choisir --</option>`;
        defs.forEach(d => { selectHTML += `<option value="${d}">${d}</option>`; });
        selectHTML += '</select>';
        item.innerHTML = selectHTML;
        col.appendChild(item);
    });
    div.appendChild(col);
    container.appendChild(div);
}

function renderTexteTrousLibre(ex, container) {
    const div = document.createElement('div');
    div.className = 'texte-trous';
    const inputsHTML = ex.trous.map((trou, i) =>
        `<input type="text" data-trou-index="${i}" data-pts="${trou.pts}" placeholder="..." class="trou-input">`
    );
    div.innerHTML = remplacerTrous(ex.texte, inputsHTML);
    container.appendChild(div);
}

function renderTexteTrousListeUnique(ex, container) {
    const div = document.createElement('div');
    div.className = 'texte-trous';
    const selectsHTML = ex.trous.map((trou, i) => {
        let opts = '<option value="">--</option>';
        ex.listeCommune.forEach(item => { opts += `<option value="${item}">${item}</option>`; });
        return `<select data-trou-index="${i}" data-pts="${trou.pts}" class="trou-select">${opts}</select>`;
    });
    div.innerHTML = remplacerTrous(ex.texte, selectsHTML);
    container.appendChild(div);
}

function renderTexteTrousListeVariable(ex, container) {
    const div = document.createElement('div');
    div.className = 'texte-trous';
    const selectsHTML = ex.trous.map((trou, i) => {
        let opts = '<option value="">--</option>';
        trou.liste.forEach(item => { opts += `<option value="${item}">${item}</option>`; });
        return `<select data-trou-index="${i}" data-pts="${trou.pts}" class="trou-select">${opts}</select>`;
    });
    div.innerHTML = remplacerTrous(ex.texte, selectsHTML);
    container.appendChild(div);
}

// ========== VALIDATION DES RÉPONSES ==========
function validerEtSuivantEval() {
    clearInterval(timerEval);
    const ex = evalQuestions[evalIndex];
    let pts = 0;
    const details = { titre: ex.titre, niveau: ex.niveau, questions: [] };

    if (ex.type === 'tableau-menu') {
        $$('#eval-content select').forEach(select => {
            const qId = select.dataset.questionId;
            const qPts = parseFloat(select.dataset.pts);
            const selOpt = select.options[select.selectedIndex];
            const correct = selOpt && selOpt.dataset.correct === 'true';
            if (correct) pts += qPts;
            const qData = ex.questions.find(q => q.id === qId);
            details.questions.push({ enonce: qData.enonce, reponseEleve: select.value || 'Aucune', bonneReponse: qData.options.find(o => o.correct).texte, correct, pts: correct ? qPts : 0 });
        });
    }
    else if (ex.type === 'choix-unique') {
        const sel = document.querySelector('input[name="choix-unique"]:checked');
        if (sel) {
            const opt = ex.options[parseInt(sel.value)];
            if (opt.correct) pts += opt.pts;
            details.questions.push({ enonce: ex.enonce, reponseEleve: opt.texte, bonneReponse: ex.options.find(o => o.correct).texte, correct: opt.correct, pts: opt.correct ? opt.pts : 0 });
        }
    }
    else if (ex.type === 'choix-multiple') {
        $$('#eval-content input[type="checkbox"]').forEach(cb => {
            const opt = ex.options[parseInt(cb.value)];
            const coche = cb.checked;
            if (coche && opt.correct) pts += opt.pts;
            details.questions.push({ enonce: opt.texte, reponseEleve: coche ? 'Coché' : 'Non coché', bonneReponse: opt.correct ? 'Coché' : 'Non coché', correct: coche === opt.correct, pts: (coche && opt.correct) ? opt.pts : 0 });
        });
    }
    else if (ex.type === 'valeur-numerique') {
        const val = ($('#valeur-numerique-input').value || '').replace(/\s/g, '').replace(',', '.');
        const correct = ex.bonnesReponses.some(r => r.replace(/\s/g, '').replace(',', '.') === val);
        if (correct) pts += ex.pts;
        details.questions.push({ enonce: ex.enonce, reponseEleve: val || 'Aucune', bonneReponse: ex.bonnesReponses[0], correct, pts: correct ? ex.pts : 0 });
    }
    else if (ex.type === 'reponse-saisie') {
        const val = normaliserTexte($('#reponse-saisie-input').value || '', ex.ignorerCasse, ex.ignorerAccents);
        const correct = ex.bonnesReponses.some(r => normaliserTexte(r, ex.ignorerCasse, ex.ignorerAccents) === val);
        if (correct) pts += ex.pts;
        details.questions.push({ enonce: ex.enonce, reponseEleve: val || 'Aucune', bonneReponse: ex.bonnesReponses[0], correct, pts: correct ? ex.pts : 0 });
    }
    else if (ex.type === 'association') {
        $$('#eval-content .association-item').forEach(item => {
            const terme = item.dataset.terme;
            const ptsA = parseFloat(item.dataset.pts);
            const val = item.querySelector('select').value;
            const correct = val === ex.associations.find(a => a.terme === terme).definition;
            if (correct) pts += ptsA;
            details.questions.push({ enonce: terme, reponseEleve: val || 'Aucune', bonneReponse: ex.associations.find(a => a.terme === terme).definition, correct, pts: correct ? ptsA : 0 });
        });
    }
    else if (ex.type === 'texte-trous-libre') {
        $$('#eval-content input[data-trou-index]').forEach(input => {
            const idx = parseInt(input.dataset.trouIndex);
            const ptsT = parseFloat(input.dataset.pts);
            const trou = ex.trous[idx];
            const val = normaliserTexte(input.value || '', true, true);
            const correct = trou.bonnesReponses.some(r => normaliserTexte(r, true, true) === val);
            if (correct) pts += ptsT;
            details.questions.push({ enonce: `Trou ${idx+1}`, reponseEleve: input.value || 'Aucune', bonneReponse: trou.bonnesReponses[0], correct, pts: correct ? ptsT : 0 });
        });
    }
    else if (ex.type === 'texte-trous-liste-unique' || ex.type === 'texte-trous-liste-variable') {
        $$('#eval-content select[data-trou-index]').forEach(select => {
            const idx = parseInt(select.dataset.trouIndex);
            const ptsT = parseFloat(select.dataset.pts);
            const trou = ex.trous[idx];
            const val = select.value;
            const correct = val === trou.bonneReponse;
            if (correct) pts += ptsT;
            details.questions.push({ enonce: `Trou ${idx+1}`, reponseEleve: val || 'Aucune', bonneReponse: trou.bonneReponse, correct, pts: correct ? ptsT : 0 });
        });
    }

    scoreEval += pts;
    details.points = Math.round(pts * 10) / 10;
    let totalP = 0;
    if (ex.type === 'tableau-menu') totalP = ex.questions.reduce((s,q) => s+q.pts, 0);
    else if (ex.type === 'association') totalP = ex.associations.reduce((s,a) => s+a.pts, 0);
    else if (ex.trous) totalP = ex.trous.reduce((s,t) => s+t.pts, 0);
    else if (ex.pts) totalP = ex.pts;
    else if (ex.options) totalP = ex.options.reduce((s,o) => s+(o.pts||0), 0);
    details.totalPossible = totalP;
    detailsEval.push(details);
    evalIndex++;
    afficherExerciceEval();
}

function terminerEval() {
    $('#section-eval').classList.add('hidden');
    afficherResultats();
}

// ========== RESULTATS & PDF ==========
function afficherResultats() {
    const zone = $('#pdf-report-area');
    zone.classList.remove('hidden');
    const totalQuiz = quizQuestions.length;
    const totalEval = 40;
    const total = scoreQuiz + scoreEval;
    const mention = total >= 36 ? '🏆 Excellent' : total >= 28 ? '👍 Très bien' : total >= 20 ? '✅ Bien' : total >= 12 ? '📚 À renforcer' : '⚠️ À retravailler';
    
    let html = `<div class="score-final">🎯 Bilan Module 2 : ${total.toFixed(1)} / ${totalQuiz + totalEval} pts<br><small>Théorie/Quiz : ${scoreQuiz}/${totalQuiz} | Pratique/Exercices : ${scoreEval.toFixed(1)}/${totalEval}</small><br><small>${mention}</small></div>`;
    html += `<div class="resultat-section"><h3>📋 Restitution - Partie Théorique (Quiz)</h3>`;
    detailsQuiz.forEach((d, i) => {
        html += `<div class="detail-exercice ${d.correct ? '' : 'erreur'}"><strong>Q${i+1}.</strong> ${d.question}<br>${d.correct ? '✅ Bonne réponse' : `❌ "${d.reponseEleve}" → Attendu : "${d.bonneReponse}"`}</div>`;
    });
    html += `</div><div class="resultat-section"><h3>📝 Restitution - Partie Exercices Pratiques</h3>`;
    detailsEval.forEach(d => {
        const nb = d.questions.filter(q => q.correct).length;
        const ok = nb === d.questions.length;
        html += `<div class="detail-exercice ${ok ? '' : 'erreur'}"><strong>${d.titre}</strong> — ${d.points}/${d.totalPossible} pts (${nb}/${d.questions.length})<br>`;
        d.questions.forEach(q => {
            html += `<div class="detail-question ${q.correct ? 'bonne' : 'mauvaise'}">${q.correct ? '✅' : '❌'} ${q.enonce} — ${q.correct ? q.reponseEleve : `"${q.reponseEleve}" → "${q.bonneReponse}"`}</div>`;
        });
        html += `</div>`;
    });
    html += `</div>`;
    $('#resultats-detail').innerHTML = html;
    zone.scrollIntoView({ behavior: 'smooth' });
}

function genererPDFResultats() {
    const el = $('#pdf-report-area');
    el.classList.remove('hidden');
    el.style.display = 'block';
    setTimeout(() => {
        html2pdf().set({
            margin: [10,10,10,10],
            filename: `Bilan_Module2_Analyse_Du_Besoin_${new Date().toISOString().slice(0,10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 960 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all','css','legacy'] }
        }).from(el).save();
    }, 100);
}

$('#btn-telecharger-pdf').addEventListener('click', genererPDFResultats);
$('#btn-recommencer').addEventListener('click', () => location.reload());
document.addEventListener('DOMContentLoaded', chargerDonnees);
