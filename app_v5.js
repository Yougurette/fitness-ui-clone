const STORAGE_KEY = 'activ-fitness-ui-state-v5';

const state = {
  view: 'home',
  exercises: [],
  plans: [],
  activePlanId: null,
  playerExerciseIndex: 0,
  search: '',
  bodyPart: 'all',
  equipment: 'all',
  workoutHistory: [],
  completionSummary: null,
  showAnnouncement: true,
};

const screens = {
  home: document.querySelector('#screen-home'),
  plan: document.querySelector('#screen-plan'),
  player: document.querySelector('#screen-player'),
  builder: document.querySelector('#screen-builder'),
  analysis: document.querySelector('#screen-analysis'),
  account: document.querySelector('#screen-account'),
};

const navItems = [...document.querySelectorAll('.nav-item')];

const placeholderSvg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Crect width='100%25' height='100%25' fill='%23ddd'/%3E%3C/svg%3E";

function imageFor(ex) {
  return `./gifs_180x180/${ex.gifUrl}`;
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.plans)) state.plans = parsed.plans;
    if (typeof parsed.activePlanId === 'string') state.activePlanId = parsed.activePlanId;
    if (Array.isArray(parsed.workoutHistory)) state.workoutHistory = parsed.workoutHistory;
  } catch (_) {}
}

function saveStorage() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      plans: state.plans,
      activePlanId: state.activePlanId,
      workoutHistory: state.workoutHistory,
    }),
  );
}

function getActivePlan() {
  return state.plans.find((plan) => plan.id === state.activePlanId) || state.plans[0] || null;
}

function getExerciseById(id) {
  return state.exercises.find((ex) => ex.exerciseId === id);
}

function totalPoints() {
  return state.workoutHistory.reduce((sum, entry) => sum + (entry.points || 0), 0);
}

function totalCaloriesFromHistory() {
  return state.workoutHistory.reduce((sum, entry) => sum + (entry.calories || 0), 0);
}

function ensureDefaults() {
  if (!state.plans.length && state.exercises.length) {
    const items = state.exercises.slice(0, 10).map((ex) => ({
      id: ex.exerciseId,
      reps: 12,
      weight: 25,
      sets: [
        { reps: 12, kg: 25, done: false },
        { reps: 12, kg: 20, done: false },
      ],
    }));

    const defaultPlan = {
      id: crypto.randomUUID(),
      title: 'Ganzkörper 2x12 (9-11)',
      note: 'Von meinem Trainer',
      items,
      createdAt: Date.now(),
    };

    state.plans = [defaultPlan];
    state.activePlanId = defaultPlan.id;
  }
}

async function loadExercises() {
  readStorage();
  const response = await fetch('./exercises.json');
  const all = await response.json();
  state.exercises = all.slice(0, 30);
  ensureDefaults();
  saveStorage();
  render();
}

function switchView(view) {
  state.view = view;
  Object.entries(screens).forEach(([name, el]) => el.classList.toggle('active', name === view));
  navItems.forEach((btn) => btn.classList.toggle('active', btn.dataset.target === view));
}

function bindGlobalNav() {
  navItems.forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.target));
  });
}

function renderHome() {
  const plan = getActivePlan();
  const cover = plan ? getExerciseById(plan.items[0]?.id) : state.exercises[0];

  screens.home.innerHTML = `
    <header class="red-header">
      <div class="header-top"><div class="avatar">AS</div></div>
      <h1>Hi Alexandra!</h1>
      <p>Auf die Plätze. Fertig. Workout!</p>
    </header>
    <section class="panel">
      ${state.showAnnouncement ? `
      <article class="card" id="announcement-card">
        <div class="row"><strong>Aktuelles</strong><button class="icon" id="close-announcement">✕</button></div>
        <p class="muted">🕺🏽 Kurs-Check-in erfolgt automatisch beim Betreten des Studios.</p>
      </article>
      ` : ''}
      <div class="section-title"><h3>Deine Trainingspläne</h3><button class="linkish" id="go-builder">Alle ansehen ›</button></div>
      <article class="hero" id="open-plan">
        ${cover ? `<img src="${imageFor(cover)}" alt="plan cover" onerror="this.src='${placeholderSvg}'"/>` : ''}
        <div class="hero-overlay">
          <small>${plan?.note ?? 'Von meinem Trainer'}</small>
          <h4>${plan?.title ?? 'Neuer Plan'}</h4>
          <span>${plan?.items.length ?? 0} Übungen • ${(plan?.items.length ?? 0) * 22} Kcal</span>
        </div>
      </article>
    </section>
  `;

  screens.home.querySelector('#open-plan')?.addEventListener('click', () => {
    switchView('plan');
    renderPlan();
  });

  screens.home.querySelector('#go-builder')?.addEventListener('click', () => {
    switchView('builder');
    renderBuilder();
  });

  screens.home.querySelector('#close-announcement')?.addEventListener('click', () => {
    state.showAnnouncement = false;
    renderHome();
  });
}

function renderPlan() {
  const plan = getActivePlan();
  if (!plan) {
    screens.plan.innerHTML = '<div class="panel"><p class="muted">Kein Plan vorhanden.</p></div>';
    return;
  }

  const cover = getExerciseById(plan.items[0]?.id);

  const list = plan.items
    .map((item, index) => {
      const ex = getExerciseById(item.id);
      if (!ex) return '';
      return `
        <article class="exercise-item" data-exercise-index="${index}">
          <img src="${imageFor(ex)}" alt="${ex.name}" loading="lazy" onerror="this.src='${placeholderSvg}'"/>
          <div>
            <h5>${ex.name}</h5>
            <div class="muted">${item.sets.length} Sätze · ${item.reps} Wdh · ${item.weight} kg</div>
          </div>
          <button class="icon" data-remove="${item.id}">✕</button>
        </article>
      `;
    })
    .join('');

  screens.plan.innerHTML = `
    <section class="hero">
      ${cover ? `<img src="${imageFor(cover)}" alt="header" onerror="this.src='${placeholderSvg}'"/>` : ''}
      <div class="hero-overlay"><h2>${plan.title}</h2></div>
    </section>
    <div class="pills">
      <span class="pill">${plan.items.length} Übungen • ${plan.items.length * 22} Kcal</span>
      <span class="pill">${plan.items.length * 28} Aktivitätspunkte</span>
    </div>
    <section>${list}</section>
    <div class="cta-wrap"><button class="cta" id="start-workout">Workout starten</button></div>
  `;

  screens.plan.querySelectorAll('[data-exercise-index]').forEach((row) => {
    row.addEventListener('click', () => {
      state.playerExerciseIndex = Number(row.dataset.exerciseIndex);
      state.completionSummary = null;
      switchView('player');
      renderPlayer();
    });
  });

  screens.plan.querySelectorAll('[data-remove]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      plan.items = plan.items.filter((item) => item.id !== button.dataset.remove);
      saveStorage();
      renderPlan();
      renderHome();
    });
  });

  screens.plan.querySelector('#start-workout')?.addEventListener('click', () => {
    state.playerExerciseIndex = 0;
    state.completionSummary = null;
    switchView('player');
    renderPlayer();
  });
}

function renderPlayer() {
  const plan = getActivePlan();
  if (!plan || !plan.items.length) {
    screens.player.innerHTML = '<div class="panel"><p class="muted">Keine Übungen im aktiven Plan.</p></div>';
    return;
  }

  if (state.playerExerciseIndex >= plan.items.length) state.playerExerciseIndex = 0;
  const item = plan.items[state.playerExerciseIndex];
  const ex = getExerciseById(item.id);
  const doneCount = item.sets.filter((set) => set.done).length;

  const completionOverlay = state.completionSummary
    ? `
      <div class="completion-modal">
        <h3>Workout abgeschlossen ✅</h3>
        <p>${state.completionSummary.title}</p>
        <p>${state.completionSummary.exercises} Übungen • ${state.completionSummary.calories} Kcal • ${state.completionSummary.points} Punkte</p>
        <div class="set-actions">
          <button class="small-btn" id="close-summary">Zurück</button>
          <button class="small-btn" id="go-analysis">Analyse ansehen</button>
        </div>
      </div>
    `
    : '';

  screens.player.innerHTML = `
    <header class="player-head"><button class="icon" id="back-plan">←</button><span>Training aufzeichnen</span><button class="icon" id="next-ex">→</button></header>
    <article class="player-card">
      ${ex ? `<img src="${imageFor(ex)}" alt="${ex.name}" onerror="this.src='${placeholderSvg}'"/>` : ''}
      <h3>${ex?.name ?? 'Übung'}</h3>
      <div class="pills" style="padding-inline:0"><span class="pill">${state.playerExerciseIndex + 1}/${plan.items.length}</span><span class="pill">${doneCount}/${item.sets.length} fertig</span></div>
      <div class="table-head"><span>Satz</span><span>Wdh.</span><span>kg</span><span>Fertig</span></div>
      ${item.sets
        .map(
          (set, index) => `
            <div class="set-row">
              <span>${index + 1}</span>
              <input data-reps="${index}" value="${set.reps}" inputmode="numeric" />
              <input data-kg="${index}" value="${set.kg}" inputmode="numeric" />
              <button class="check ${set.done ? 'done' : ''}" data-done="${index}">${set.done ? '✓' : '○'}</button>
            </div>`,
        )
        .join('')}
      <div class="set-actions"><button class="small-btn" id="remove-set">– Satz</button><button class="small-btn" id="add-set">+ Satz</button></div>
      <div class="switch-actions"><button class="small-btn" id="prev-ex">← Vorherige</button><button class="small-btn" id="next-ex-2">Nächste →</button></div>
    </article>
    <div class="cta-wrap"><button class="cta" id="finish">Training abschließen</button></div>
    ${completionOverlay}
  `;

  screens.player.querySelector('#back-plan')?.addEventListener('click', () => switchView('plan'));
  screens.player.querySelector('#next-ex')?.addEventListener('click', nextExercise);
  screens.player.querySelector('#next-ex-2')?.addEventListener('click', nextExercise);
  screens.player.querySelector('#prev-ex')?.addEventListener('click', prevExercise);

  screens.player.querySelectorAll('[data-reps]').forEach((input) => {
    input.addEventListener('input', () => {
      const idx = Number(input.dataset.reps);
      item.sets[idx].reps = Number(input.value) || 0;
      item.reps = item.sets[0]?.reps || item.reps;
      saveStorage();
    });
  });

  screens.player.querySelectorAll('[data-kg]').forEach((input) => {
    input.addEventListener('input', () => {
      const idx = Number(input.dataset.kg);
      item.sets[idx].kg = Number(input.value) || 0;
      item.weight = item.sets[0]?.kg || item.weight;
      saveStorage();
    });
  });

  screens.player.querySelectorAll('[data-done]').forEach((button) => {
    button.addEventListener('click', () => {
      const idx = Number(button.dataset.done);
      item.sets[idx].done = !item.sets[idx].done;
      saveStorage();
      renderPlayer();
      renderAnalysis();
    });
  });

  screens.player.querySelector('#add-set')?.addEventListener('click', () => {
    item.sets.push({ reps: item.reps, kg: item.weight, done: false });
    saveStorage();
    renderPlayer();
  });

  screens.player.querySelector('#remove-set')?.addEventListener('click', () => {
    if (item.sets.length > 1) {
      item.sets.pop();
      saveStorage();
      renderPlayer();
    }
  });

  screens.player.querySelector('#finish')?.addEventListener('click', () => {
    const totalSets = plan.items.reduce((sum, planItem) => sum + planItem.sets.length, 0);
    const doneSets = plan.items.reduce(
      (sum, planItem) => sum + planItem.sets.filter((set) => set.done).length,
      0,
    );
    const calories = plan.items.length * 22;
    const points = doneSets * 12;

    const entry = {
      id: crypto.randomUUID(),
      title: plan.title,
      exercises: plan.items.length,
      calories,
      points,
      doneSets,
      totalSets,
      date: new Date().toISOString(),
    };

    state.workoutHistory.unshift(entry);
    state.workoutHistory = state.workoutHistory.slice(0, 30);
    state.completionSummary = entry;

    plan.items.forEach((planItem) => {
      planItem.sets.forEach((set) => {
        set.done = false;
      });
    });

    saveStorage();
    renderPlayer();
    renderAnalysis();
  });

  screens.player.querySelector('#close-summary')?.addEventListener('click', () => {
    state.completionSummary = null;
    switchView('home');
    renderHome();
  });

  screens.player.querySelector('#go-analysis')?.addEventListener('click', () => {
    state.completionSummary = null;
    switchView('analysis');
    renderAnalysis();
  });
}

function nextExercise() {
  const plan = getActivePlan();
  if (!plan || !plan.items.length) return;
  state.playerExerciseIndex = (state.playerExerciseIndex + 1) % plan.items.length;
  renderPlayer();
}

function prevExercise() {
  const plan = getActivePlan();
  if (!plan || !plan.items.length) return;
  state.playerExerciseIndex = (state.playerExerciseIndex - 1 + plan.items.length) % plan.items.length;
  renderPlayer();
}

function renderBuilder() {
  const plan = getActivePlan();
  if (!plan) return;

  const bodyParts = ['all', ...new Set(state.exercises.flatMap((ex) => ex.bodyParts || []))];
  const equipments = ['all', ...new Set(state.exercises.flatMap((ex) => ex.equipments || []))];

  const pool = state.exercises.filter((ex) => {
    const inPlan = plan.items.some((item) => item.id === ex.exerciseId);
    const bySearch = ex.name.toLowerCase().includes(state.search.toLowerCase());
    const byBody = state.bodyPart === 'all' || (ex.bodyParts || []).includes(state.bodyPart);
    const byEq = state.equipment === 'all' || (ex.equipments || []).includes(state.equipment);
    return !inPlan && bySearch && byBody && byEq;
  });

  const planSwitch = state.plans
    .map(
      (p) =>
        `<option value="${p.id}" ${p.id === state.activePlanId ? 'selected' : ''}>${p.title} (${p.items.length})</option>`,
    )
    .join('');

  const builderList = plan.items
    .map((item, index) => {
      const ex = getExerciseById(item.id);
      if (!ex) return '';
      return `
        <article class="exercise-item">
          <img src="${imageFor(ex)}" alt="${ex.name}" loading="lazy" onerror="this.src='${placeholderSvg}'"/>
          <div><h5>${ex.name}</h5><div class="muted">${item.sets.length} Sätze</div></div>
          <div class="row">
            <button class="icon" data-up="${index}">↑</button>
            <button class="icon" data-down="${index}">↓</button>
          </div>
        </article>
      `;
    })
    .join('');

  const library = pool
    .slice(0, 18)
    .map(
      (ex) => `
      <article class="exercise-item">
        <img src="${imageFor(ex)}" alt="${ex.name}" loading="lazy" onerror="this.src='${placeholderSvg}'"/>
        <div><h5>${ex.name}</h5><div class="muted">${ex.bodyParts?.[0] ?? '-'} · ${ex.equipments?.[0] ?? '-'}</div></div>
        <button class="icon" data-add="${ex.exerciseId}">＋</button>
      </article>
    `,
    )
    .join('');

  screens.builder.innerHTML = `
    <header class="red-header">
      <div class="header-top"><div class="avatar">AS</div><button class="plus-btn" id="create-plan">+</button></div>
      <h1>Workout Builder</h1>
      <p>Stelle dein Training interaktiv zusammen.</p>
    </header>
    <section class="panel">
      <article class="card">
        <div class="row"><strong>Aktiver Plan</strong><select id="plan-switch" class="plan-select">${planSwitch}</select></div>
        <div class="controls controls-builder">
          <input id="search" placeholder="Suche Übung..." value="${state.search}" />
          <select id="body-filter">${bodyParts
            .map((part) => `<option value="${part}" ${part === state.bodyPart ? 'selected' : ''}>${part === 'all' ? 'Body Part' : part}</option>`)
            .join('')}</select>
          <select id="equipment-filter">${equipments
            .map((eq) => `<option value="${eq}" ${eq === state.equipment ? 'selected' : ''}>${eq === 'all' ? 'Equipment' : eq}</option>`)
            .join('')}</select>
          <button class="small-btn" id="run-search">Suchen</button>
        </div>
      </article>

      <article class="card">
        <div class="row"><strong>Suchergebnisse</strong><span class="muted">${pool.length} Treffer</span></div>
        ${library || '<p class="muted">Keine Treffer.</p>'}
      </article>

      <article class="card">
        <div class="row"><strong>Plan Reihenfolge</strong><span class="muted">${plan.items.length} Übungen</span></div>
        ${builderList || '<p class="muted">Keine Übungen im Plan.</p>'}
      </article>

      <div class="cta-wrap" style="padding-inline:0"><button class="cta" id="save-plan">Plan speichern</button></div>
    </section>
  `;

  screens.builder.querySelector('#plan-switch')?.addEventListener('change', (e) => {
    state.activePlanId = e.target.value;
    saveStorage();
    renderBuilder();
    renderHome();
    renderPlan();
  });

  screens.builder.querySelector('#search')?.addEventListener('input', (e) => {
    state.search = e.target.value;
  });

  screens.builder.querySelector('#search')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      renderBuilder();
    }
  });

  screens.builder.querySelector('#body-filter')?.addEventListener('change', (e) => {
    state.bodyPart = e.target.value;
    renderBuilder();
  });

  screens.builder.querySelector('#equipment-filter')?.addEventListener('change', (e) => {
    state.equipment = e.target.value;
    renderBuilder();
  });

  screens.builder.querySelector('#run-search')?.addEventListener('click', () => {
    renderBuilder();
  });

  screens.builder.querySelectorAll('[data-add]').forEach((button) => {
    button.addEventListener('click', () => {
      const ex = getExerciseById(button.dataset.add);
      if (!ex) return;
      plan.items.push({
        id: ex.exerciseId,
        reps: 12,
        weight: 20,
        sets: [
          { reps: 12, kg: 20, done: false },
          { reps: 12, kg: 20, done: false },
        ],
      });
      saveStorage();
      renderBuilder();
      renderHome();
      renderPlan();
    });
  });

  screens.builder.querySelectorAll('[data-up]').forEach((button) => {
    button.addEventListener('click', () => {
      const idx = Number(button.dataset.up);
      if (idx <= 0) return;
      [plan.items[idx - 1], plan.items[idx]] = [plan.items[idx], plan.items[idx - 1]];
      saveStorage();
      renderBuilder();
      renderHome();
      renderPlan();
    });
  });

  screens.builder.querySelectorAll('[data-down]').forEach((button) => {
    button.addEventListener('click', () => {
      const idx = Number(button.dataset.down);
      if (idx >= plan.items.length - 1) return;
      [plan.items[idx + 1], plan.items[idx]] = [plan.items[idx], plan.items[idx + 1]];
      saveStorage();
      renderBuilder();
      renderHome();
      renderPlan();
    });
  });

  screens.builder.querySelector('#save-plan')?.addEventListener('click', () => {
    saveStorage();
    switchView('home');
    renderHome();
  });

  screens.builder.querySelector('#create-plan')?.addEventListener('click', () => {
    const newPlan = {
      id: crypto.randomUUID(),
      title: `Neuer Plan ${state.plans.length + 1}`,
      note: 'Selbst erstellt',
      items: [],
      createdAt: Date.now(),
    };
    state.plans.unshift(newPlan);
    state.activePlanId = newPlan.id;
    saveStorage();
    renderBuilder();
    renderHome();
    renderPlan();
  });
}

function renderAnalysis() {
  const doneSets = state.workoutHistory.reduce((sum, entry) => sum + (entry.doneSets || 0), 0);
  const allSets = state.workoutHistory.reduce((sum, entry) => sum + (entry.totalSets || 0), 0) || 1;
  const pct = Math.min(100, Math.round((doneSets / allSets) * 100));

  const historyList = state.workoutHistory
    .slice(0, 8)
    .map(
      (entry) => `
      <article class="card history-item">
        <div class="row"><strong>${entry.title}</strong><span class="muted">${new Date(entry.date).toLocaleDateString('de-DE')}</span></div>
        <p class="muted">${entry.exercises} Übungen · ${entry.calories} Kcal · ${entry.points} Punkte</p>
      </article>
    `,
    )
    .join('');

  screens.analysis.innerHTML = `
    <header class="red-header"><div class="header-top"><div class="avatar">AS</div></div></header>
    <section class="panel">
      <article class="card"><strong>Aktivitätslevel</strong><p class="muted">Gesamtpunkte: ${totalPoints()} · Kalorien: ${totalCaloriesFromHistory()}</p></article>
      <article class="card">
        <div class="progress-ring" style="--pct:${pct}%"><span>${totalPoints()}</span></div>
        <p class="muted" style="text-align:center">${pct}% erledigte Sets aus allen abgeschlossenen Workouts.</p>
      </article>
      <div class="section-title"><h3>History</h3></div>
      ${historyList || '<article class="card"><p class="muted">Noch keine abgeschlossenen Workouts.</p></article>'}
    </section>
  `;
}

function renderAccount() {
  screens.account.innerHTML = `
    <header class="red-header"><div class="header-top"><div class="avatar">AS</div></div></header>
    <section class="panel">
      <article class="card" style="background:linear-gradient(120deg,#ff1218,#ff5a5f);color:#fff"><strong>Zum ACTIV FITNESS Memberbereich</strong></article>
      <article class="card"><div class="row"><strong>Deals</strong><button class="linkish">Alle ansehen ›</button></div><p class="muted">10% auf Supplements · Gutschein: MoveFit10</p><button class="small-btn">Zum Deal</button></article>
    </section>
  `;
}

function render() {
  renderHome();
  renderPlan();
  renderPlayer();
  renderBuilder();
  renderAnalysis();
  renderAccount();
  switchView(state.view);
}

bindGlobalNav();
loadExercises().catch((error) => {
  console.error(error);
  screens.home.innerHTML = '<div class="panel"><p class="muted">Dataset konnte nicht geladen werden.</p></div>';
});
