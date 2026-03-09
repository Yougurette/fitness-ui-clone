const STORAGE_KEY = 'activ-fitness-ui-state-v8';

const state = {
  view: 'home',
  exercises: [],
  plans: [],
  activePlanId: null,
  playerExerciseIndex: 0,
  workoutHistory: [],
  completionSummary: null,
  showAnnouncement: true,
  showQuickActions: false,
  courseTab: 'upcoming',
  courseView: 'overview',
  selectedCourseDay: 'Mo 9',
  previousView: 'home',
  planTab: 'workouts',
  planMode: 'overview',
  planSearch: '',
  bodyPart: 'all',
  equipment: 'all',
  muscle: 'all',
  planDraftIds: [],
};

const screens = {
  home: document.querySelector('#screen-home'),
  plan: document.querySelector('#screen-plan'),
  player: document.querySelector('#screen-player'),
  builder: document.querySelector('#screen-builder'),
  analysis: document.querySelector('#screen-analysis'),
  account: document.querySelector('#screen-account'),
  profile: document.querySelector('#screen-profile'),
};

const navItems = [...document.querySelectorAll('.nav-item')];

const placeholderSvg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Crect width='100%25' height='100%25' fill='%23ddd'/%3E%3C/svg%3E";

const courses = [
  { id: 1, day: 'Mo 9', dateLabel: 'Mo., 09. März', time: '17:50', duration: 55, title: "Indoor Cycling 55'", instructor: 'Maria-Lena W.', location: 'ACTIV FITNESS Luzern', spots: 2, booked: false },
  { id: 2, day: 'Mo 9', dateLabel: 'Mo., 09. März', time: '18:10', duration: 55, title: "BODYATTACK® 55'", instructor: 'Fabian M.', location: 'ACTIV FITNESS Luzern', spots: 0, booked: false },
  { id: 3, day: 'Mo 9', dateLabel: 'Mo., 09. März', time: '19:00', duration: 55, title: "Indoor Cycling 55'", instructor: 'Anne-Sophie M.', location: 'ACTIV FITNESS Luzern', spots: 0, booked: true },
  { id: 4, day: 'Di 10', dateLabel: 'Di., 10. März', time: '07:35', duration: 25, title: "CORE® 25'", instructor: 'Sandra K.', location: 'ACTIV FITNESS Luzern', spots: 10, booked: false },
  { id: 5, day: 'Mo 9', dateLabel: 'Mo., 09. März', time: '19:10', duration: 55, title: "BODYPUMP® 55'", instructor: 'Laura M.', location: 'ACTIV FITNESS Luzern', spots: 0, booked: false },
];

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


function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9äöüß ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function exerciseSearchBlob(ex) {
  return normalizeText([
    ex.name,
    ...(ex.bodyParts || []),
    ...(ex.equipments || []),
    ...(ex.targetMuscles || []),
    ...(ex.secondaryMuscles || []),
  ].join(' '));
}

function uniqueSorted(items) {
  return [...new Set(items.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
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
      title: 'Ganzkörper 2x12(9-11) Wdh. im Tempo 2-1-2',
      note: 'Von meinem Trainer',
      items,
      createdAt: Date.now(),
      calories: 305,
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
  if (view !== 'profile') state.previousView = state.view;
  state.view = view;
  Object.entries(screens).forEach(([name, el]) => el.classList.toggle('active', name === view));
  navItems.forEach((btn) => btn.classList.toggle('active', btn.dataset.target === view));
}

function bindGlobalNav() {
  navItems.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.target === 'builder') state.courseView = 'overview';
      switchView(button.dataset.target);
      if (button.dataset.target === 'builder') renderCourses();
      if (button.dataset.target === 'home') renderHome();
    });
  });
}

function renderHome() {
  const plan = getActivePlan();
  const cover = plan ? getExerciseById(plan.items[0]?.id) : state.exercises[0];
  const recent = state.workoutHistory.slice(0, 2);

  const historyCards = recent
    .map(
      (entry) => `
      <article class="card history-row-card">
        <div class="history-row-head">${new Date(entry.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })}</div>
        <div class="history-row">
          <img src="${cover ? imageFor(cover) : placeholderSvg}" alt="history" onerror="this.src='${placeholderSvg}'"/>
          <div>
            <h4>${entry.title}</h4>
            <p>${entry.exercises} Übungen · ${entry.calories} Kcal</p>
            <span class="points-pill">${entry.points} Aktivitätspunkte</span>
          </div>
        </div>
      </article>
    `,
    )
    .join('');

  screens.home.innerHTML = `
    <header class="hero-header red compact-header">
      <div class="status-fake"></div>
      <div class="header-top">
        <button class="avatar" id="open-profile">AS</button>
        <button class="plus-btn" id="open-actions">+</button>
      </div>
      <div class="hero-title-wrap">
        <div>
          <h1>Hi Alexandra!</h1>
          <p>Verbessere dich selbst, das geschieht nicht von alleine!</p>
        </div>
        <div class="logo-mark">ACTIV<br/><span>FITNESS</span></div>
      </div>
    </header>

    <section class="panel">
      ${state.showAnnouncement ? `
      <article class="card notice-card">
        <div class="row"><strong>Aktuelles</strong><button class="icon" id="close-announcement">✕</button></div>
        <p class="muted">Kurs-Check-in erfolgt automatisch via App.</p>
      </article>` : ''}

      <div class="section-title">
        <h3>Deine Trainingspläne</h3>
        <button class="linkish" id="go-plan-list">Alle ansehen ›</button>
      </div>

      <article class="hero workout-card" id="open-plan">
        ${cover ? `<img src="${imageFor(cover)}" alt="Planbild" onerror="this.src='${placeholderSvg}'" />` : ''}
        <div class="hero-overlay">
          <span class="tag">${plan?.note ?? 'Von meinem Trainer'}</span>
          <h4>${plan?.title ?? 'Trainingsplan'}</h4>
          <span>${plan?.items.length ?? 0} Übungen · ${plan?.calories ?? 0} Kcal</span>
        </div>
      </article>

      <div class="row new-plan-row">
        <button class="small-btn" id="new-plan">Neuer Plan</button>
        <button class="small-btn" id="save-plan-home">Plan speichern</button>
      </div>

      <div class="section-title">
        <h3>Verlauf</h3>
        <button class="linkish" id="open-history">Alle ansehen ›</button>
      </div>

      ${historyCards || '<article class="card"><p class="muted">Noch keine abgeschlossenen Workouts.</p></article>'}

      <div class="cta-wrap"><button class="cta" id="record-training">＋ Training aufzeichnen</button></div>
    </section>

    ${state.showQuickActions ? `<div class="sheet-backdrop" id="close-sheet"></div>
      <aside class="quick-sheet"><h4>Schnellzugriff</h4><button data-action="record">Training erfassen <span>›</span></button><button data-action="courses">Kurse <span>›</span></button><button data-action="history">Trainingsverlauf <span>›</span></button><button data-action="locations">Standorte <span>›</span></button></aside>` : ''}
  `;

  screens.home.querySelector('#open-profile')?.addEventListener('click', () => {
    switchView('profile');
    renderProfile();
  });
  screens.home.querySelector('#close-announcement')?.addEventListener('click', () => {
    state.showAnnouncement = false;
    renderHome();
  });
  screens.home.querySelector('#open-actions')?.addEventListener('click', () => {
    state.showQuickActions = true;
    renderHome();
  });
  screens.home.querySelector('#close-sheet')?.addEventListener('click', () => {
    state.showQuickActions = false;
    renderHome();
  });
  screens.home.querySelectorAll('.quick-sheet [data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.showQuickActions = false;
      const action = btn.dataset.action;
      if (action === 'record') {
        state.planMode = 'builder';
        switchView('plan');
        renderPlan();
      } else if (action === 'courses') {
        state.courseView = 'overview';
        switchView('builder');
        renderCourses();
      } else if (action === 'history') {
        switchView('analysis');
        renderAnalysis();
      } else {
        switchView('account');
        renderAccount();
      }
    });
  });
  screens.home.querySelector('#open-plan')?.addEventListener('click', () => {
    switchView('plan');
    renderPlan();
  });
  screens.home.querySelector('#go-plan-list')?.addEventListener('click', () => {
    switchView('plan');
    renderPlan();
  });
  screens.home.querySelector('#open-history')?.addEventListener('click', () => {
    switchView('analysis');
    renderAnalysis();
  });
  screens.home.querySelector('#record-training')?.addEventListener('click', () => {
    state.planMode = 'builder';
    switchView('plan');
    renderPlan();
  });
  screens.home.querySelector('#new-plan')?.addEventListener('click', () => {
    const newPlan = { id: crypto.randomUUID(), title: `Neuer Plan ${state.plans.length + 1}`, note: 'Selbst erstellt', items: [], createdAt: Date.now(), calories: 220 };
    state.plans.unshift(newPlan);
    state.activePlanId = newPlan.id;
    saveStorage();
    renderHome();
  });
  screens.home.querySelector('#save-plan-home')?.addEventListener('click', saveStorage);
}

function renderPlan() {
  const plan = getActivePlan();
  const cover = plan ? getExerciseById(plan.items[0]?.id) : state.exercises[0];

  if (!plan) {
    screens.plan.innerHTML = '<div class="panel"><p class="muted">Kein Plan vorhanden.</p></div>';
    return;
  }

  if (state.planMode === 'detail') {
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
        </article>
      `;
      })
      .join('');

    screens.plan.innerHTML = `
      <header class="white-header"><button class="icon" id="back-plan-overview">←</button><h2>Workout</h2><button class="icon"> </button></header>
      <section class="hero">${cover ? `<img src="${imageFor(cover)}" alt="header" onerror="this.src='${placeholderSvg}'"/>` : ''}<div class="hero-overlay"><h2>${plan.title}</h2></div></section>
      <div class="pills"><span class="pill">${plan.items.length} Übungen • ${plan.calories ?? 305} Kcal</span><span class="pill">${plan.items.length * 28} Aktivitätspunkte</span></div>
      <section>${list || '<p class="muted" style="padding:12px 16px">Plan ist leer.</p>'}</section>
      <div class="cta-wrap"><button class="cta" id="start-workout">Workout starten</button></div>
    `;

    screens.plan.querySelector('#back-plan-overview')?.addEventListener('click', () => {
      state.planMode = 'overview';
      renderPlan();
    });
    screens.plan.querySelectorAll('[data-exercise-index]').forEach((row) => {
      row.addEventListener('click', () => {
        state.playerExerciseIndex = Number(row.dataset.exerciseIndex);
        state.completionSummary = null;
        switchView('player');
        renderPlayer();
      });
    });
    screens.plan.querySelector('#start-workout')?.addEventListener('click', () => {
      state.playerExerciseIndex = 0;
      state.completionSummary = null;
      switchView('player');
      renderPlayer();
    });
    return;
  }

  if (state.planMode === 'builder') {
    const query = normalizeText(state.planSearch);
    const tokens = query ? query.split(' ').filter(Boolean) : [];
    const byBody = (ex) => state.bodyPart === 'all' || (ex.bodyParts || []).includes(state.bodyPart);
    const byEquipment = (ex) => state.equipment === 'all' || (ex.equipments || []).includes(state.equipment);
    const byMuscle = (ex) =>
      state.muscle === 'all' || [...(ex.targetMuscles || []), ...(ex.secondaryMuscles || [])].includes(state.muscle);
    const inSearch = (ex) => {
      if (!tokens.length) return true;
      const blob = exerciseSearchBlob(ex);
      return tokens.every((t) => blob.includes(t));
    };

    const preliminary = state.exercises.filter((ex) => inSearch(ex) && byBody(ex) && byEquipment(ex) && byMuscle(ex));
    const bodyParts = uniqueSorted(preliminary.flatMap((ex) => ex.bodyParts || []));
    const equipments = uniqueSorted(preliminary.flatMap((ex) => ex.equipments || []));
    const muscles = uniqueSorted(preliminary.flatMap((ex) => [...(ex.targetMuscles || []), ...(ex.secondaryMuscles || [])]));

    const filtered = preliminary.slice(0, 24);
    const draftRows = state.planDraftIds
      .map((id) => {
        const ex = getExerciseById(id);
        if (!ex) return '';
        return `<article class="exercise-item selected"><img src="${imageFor(ex)}" alt="${ex.name}" onerror="this.src='${placeholderSvg}'"/><div><h5>${ex.name}</h5><div class="muted">${ex.bodyParts?.[0] ?? '-'} · ${ex.equipments?.[0] ?? '-'}</div></div><button class="icon" data-remove-id="${id}">✕</button></article>`;
      })
      .join('');

    screens.plan.innerHTML = `
      <header class="white-header"><button class="icon" id="back-plan-overview">←</button><h2>Trainingsplan erstellen</h2><button class="icon" id="reset-builder">↺</button></header>
      <section class="panel">
        <div class="controls controls-builder">
          <input id="plan-search" placeholder="Übung suchen" value="${state.planSearch}" />
          <select id="body-filter"><option value="all">Body Part</option>${bodyParts.map((part)=>`<option value="${part}" ${part===state.bodyPart?'selected':''}>${part}</option>`).join('')}</select>
          <select id="equipment-filter"><option value="all">Equipment</option>${equipments.map((eq)=>`<option value="${eq}" ${eq===state.equipment?'selected':''}>${eq}</option>`).join('')}</select>
          <select id="muscle-filter"><option value="all">Muscle</option>${muscles.map((m)=>`<option value="${m}" ${m===state.muscle?'selected':''}>${m}</option>`).join('')}</select>
        </div>
        <div class="section-title"><h3>Suchergebnisse</h3><span class="muted">${filtered.length}</span></div>
        <div>${filtered
          .map((ex) => `<article class="exercise-item"><img src="${imageFor(ex)}" alt="${ex.name}" onerror="this.src='${placeholderSvg}'"/><div><h5>${ex.name}</h5><div class="muted">${ex.bodyParts?.[0] ?? '-'} · ${ex.equipments?.[0] ?? '-'}</div></div><button class="icon" data-add-id="${ex.exerciseId}">+</button></article>`)
          .join('')}</div>
        <div class="section-title"><h3>Neuer Plan</h3><span class="muted">${state.planDraftIds.length} Übungen</span></div>
        <div>${draftRows || '<article class="card"><p class="muted">Noch keine Übungen ausgewählt.</p></article>'}</div>
        <div class="cta-wrap"><button class="cta" id="save-new-plan">Plan anlegen</button></div>
      </section>
    `;

    screens.plan.querySelector('#back-plan-overview')?.addEventListener('click', () => {
      state.planMode = 'overview';
      renderPlan();
    });
    screens.plan.querySelector('#reset-builder')?.addEventListener('click', () => {
      state.planSearch = '';
      state.bodyPart = 'all';
      state.equipment = 'all';
      state.muscle = 'all';
      state.planDraftIds = [];
      renderPlan();
    });
    screens.plan.querySelector('#plan-search')?.addEventListener('input', (e) => {
      state.planSearch = e.target.value;
      renderPlan();
    });
    screens.plan.querySelector('#body-filter')?.addEventListener('change', (e) => {
      state.bodyPart = e.target.value;
      renderPlan();
    });
    screens.plan.querySelector('#equipment-filter')?.addEventListener('change', (e) => {
      state.equipment = e.target.value;
      renderPlan();
    });
    screens.plan.querySelector('#muscle-filter')?.addEventListener('change', (e) => {
      state.muscle = e.target.value;
      renderPlan();
    });
    screens.plan.querySelectorAll('[data-add-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.addId;
        if (!state.planDraftIds.includes(id)) state.planDraftIds.push(id);
        renderPlan();
      });
    });
    screens.plan.querySelectorAll('[data-remove-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.planDraftIds = state.planDraftIds.filter((id) => id !== btn.dataset.removeId);
        renderPlan();
      });
    });
    screens.plan.querySelector('#save-new-plan')?.addEventListener('click', () => {
      if (!state.planDraftIds.length) return;
      const items = state.planDraftIds.map((id) => ({
        id,
        reps: 12,
        weight: 20,
        sets: [
          { reps: 12, kg: 20, done: false },
          { reps: 10, kg: 20, done: false },
        ],
      }));
      const newPlan = {
        id: crypto.randomUUID(),
        title: `Eigener Plan ${state.plans.length + 1}`,
        note: 'Selbst erstellt',
        items,
        createdAt: Date.now(),
        calories: items.length * 22,
      };
      state.plans.unshift(newPlan);
      state.activePlanId = newPlan.id;
      state.planDraftIds = [];
      state.planMode = 'overview';
      saveStorage();
      renderHome();
      renderPlan();
    });
    return;
  }

  const historyRows = state.workoutHistory
    .slice(0, 5)
    .map((entry) => `<article class="card history-item"><div class="row"><strong>${entry.title}</strong><span class="muted">${new Date(entry.date).toLocaleDateString('de-DE')}</span></div><p class="muted">${entry.exercises} Übungen · ${entry.calories} Kcal · ${entry.points} Punkte</p></article>`)
    .join('');

  screens.plan.innerHTML = `
    <header class="white-header workouts-head"><button class="icon" id="back-home-from-plan">←</button><h2>Workouts</h2><button class="plus-btn plus-plan" id="open-actions-plan">+</button></header>
    <section class="panel workouts-overview">
      <div class="tabs workouts-tabs">
        <button class="tab ${state.planTab === 'workouts' ? 'active' : ''}" data-plan-tab="workouts">WORKOUTS</button>
        <button class="tab ${state.planTab === 'history' ? 'active' : ''}" data-plan-tab="history">VERLAUF</button>
      </div>

      ${state.planTab === 'workouts' ? `
      <div class="section-title"><h3>Von meinem Trainer</h3><button class="linkish" id="go-plan-list">Alle ansehen ›</button></div>
      <article class="hero workout-card" id="open-plan-detail">${cover ? `<img src="${imageFor(cover)}" alt="Planbild" onerror="this.src='${placeholderSvg}'"/>` : ''}<div class="hero-overlay"><h4>${plan.title}</h4><span>${plan.items.length} Übungen · ${plan.calories ?? 305} Kcal</span></div></article>
      <article class="card create-plan-card"><h4>Erstelle deinen eigenen Trainingsplan</h4><p class="muted">Erstelle deinen eigenen Trainingsplan mit über 1.000 Übungen aus unserer Bibliothek.</p><button class="create-btn" id="open-plan-builder">+ Anlegen</button></article>
      ` : `<div>${historyRows || '<article class="card"><p class="muted">Noch keine Einträge.</p></article>'}</div>`}
    </section>

    ${state.showQuickActions ? `<div class="sheet-backdrop" id="close-sheet-plan"></div><aside class="quick-sheet"><h4>Schnellaktionen</h4><button data-action="record">Training erfassen <span>›</span></button><button data-action="courses">Kurse <span>›</span></button><button data-action="history">Trainingsverlauf <span>›</span></button><button data-action="locations">Standorte <span>›</span></button></aside>` : ''}
  `;

  screens.plan.querySelector('#back-home-from-plan')?.addEventListener('click', () => {
    switchView('home');
    renderHome();
  });
  screens.plan.querySelector('#open-actions-plan')?.addEventListener('click', () => {
    state.showQuickActions = true;
    renderPlan();
  });
  screens.plan.querySelector('#close-sheet-plan')?.addEventListener('click', () => {
    state.showQuickActions = false;
    renderPlan();
  });
  screens.plan.querySelectorAll('.quick-sheet [data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.showQuickActions = false;
      const action = btn.dataset.action;
      if (action === 'record') {
        state.planMode = 'builder';
        switchView('plan');
        renderPlan();
      } else if (action === 'courses') {
        state.courseView = 'overview';
        switchView('builder');
        renderCourses();
      } else if (action === 'history') {
        switchView('analysis');
        renderAnalysis();
      } else {
        switchView('account');
        renderAccount();
      }
    });
  });
  screens.plan.querySelectorAll('[data-plan-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.planTab = btn.dataset.planTab;
      renderPlan();
    });
  });
  screens.plan.querySelector('#go-plan-list')?.addEventListener('click', () => {
    state.planMode = 'detail';
    renderPlan();
  });
  screens.plan.querySelector('#open-plan-detail')?.addEventListener('click', () => {
    state.planMode = 'detail';
    renderPlan();
  });
  screens.plan.querySelector('#open-plan-builder')?.addEventListener('click', () => {
    state.planMode = 'builder';
    state.planSearch = '';
    state.bodyPart = 'all';
    state.equipment = 'all';
    state.muscle = 'all';
    state.planDraftIds = [];
    renderPlan();
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
        <div class="set-actions"><button class="small-btn" id="close-summary">Zurück</button><button class="small-btn" id="go-analysis">Analyse ansehen</button></div>
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
        .map((set, index) => `
          <div class="set-row">
            <span>${index + 1}</span>
            <input data-reps="${index}" value="${set.reps}" inputmode="numeric" />
            <input data-kg="${index}" value="${set.kg}" inputmode="numeric" />
            <button class="check ${set.done ? 'done' : ''}" data-done="${index}">${set.done ? '✓' : '○'}</button>
          </div>`)
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
    const totalSets = plan.items.reduce((sum, p) => sum + p.sets.length, 0);
    const doneSets = plan.items.reduce((sum, p) => sum + p.sets.filter((set) => set.done).length, 0);
    const entry = {
      id: crypto.randomUUID(),
      title: plan.title,
      exercises: plan.items.length,
      calories: plan.calories ?? 305,
      points: doneSets * 12,
      doneSets,
      totalSets,
      date: new Date().toISOString(),
    };
    state.workoutHistory.unshift(entry);
    state.workoutHistory = state.workoutHistory.slice(0, 30);
    state.completionSummary = entry;
    plan.items.forEach((p) => p.sets.forEach((set) => (set.done = false)));
    saveStorage();
    renderPlayer();
    renderHome();
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
  if (!plan?.items.length) return;
  state.playerExerciseIndex = (state.playerExerciseIndex + 1) % plan.items.length;
  renderPlayer();
}

function prevExercise() {
  const plan = getActivePlan();
  if (!plan?.items.length) return;
  state.playerExerciseIndex = (state.playerExerciseIndex - 1 + plan.items.length) % plan.items.length;
  renderPlayer();
}

function courseCard(course, compact = false) {
  const badge = course.spots > 0 ? `${course.spots} freie Plätze` : 'Voll';
  const badgeClass = course.spots > 2 ? 'ok' : course.spots > 0 ? 'warn' : 'full';
  return `
    <article class="course-card ${compact ? 'compact' : ''}">
      <div class="row course-top"><span class="meta-line">⏱ ${course.time} • ${course.duration} min</span><span class="availability ${badgeClass}">${badge}</span></div>
      <div class="availability-track"><span class="availability-bar ${badgeClass}"></span></div>
      <h4>${course.title}</h4>
      <p>mit ${course.instructor}</p>
      <p>${course.location}</p>
    </article>
  `;
}

function renderCourses() {
  if (state.courseView === 'calendar') {
    const days = ['Mo 9', 'Di 10', 'Mi 11', 'Do 12', 'Fr 13', 'Sa 14', 'So 15', 'Mo 16'];
    const filtered = courses.filter((c) => c.day === state.selectedCourseDay);
    screens.builder.innerHTML = `
      <header class="white-header"><button class="icon" id="back-courses">←</button><h2>Einen Kurs finden</h2></header>
      <section class="panel calendar-panel">
        <div class="chips-scroll">
          <button class="chip chip-solid">⚙ Filter</button><button class="chip">Alle Kurse</button><button class="chip">Heimstudio</button><button class="chip">Alle Kategorien</button>
        </div>
        <div class="days-scroll">
          ${days.map((d) => {
            const [wd, num] = d.split(' ');
            return `<button class="day-chip ${d === state.selectedCourseDay ? 'active' : ''}" data-day="${d}"><span>${wd}</span><strong>${num}</strong>${d === state.selectedCourseDay ? '<i></i>' : ''}</button>`;
          }).join('')}
        </div>
        <h3 class="date-title">${state.selectedCourseDay.replace(' ', ', ')}. März</h3>
        <div>${filtered.map((c) => courseCard(c)).join('')}</div>
      </section>
    `;
    screens.builder.querySelector('#back-courses')?.addEventListener('click', () => {
      state.courseView = 'overview';
      renderCourses();
    });
    screens.builder.querySelectorAll('[data-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedCourseDay = btn.dataset.day;
        renderCourses();
      });
    });
    return;
  }

  const shown = courses.filter((c) => (state.courseTab === 'booked' ? c.booked : !c.booked));
  screens.builder.innerHTML = `
    <header class="hero-header red compact-header courses-top">
      <div class="status-fake"></div>
      <div class="header-top"><button class="avatar" id="open-profile-courses">AS</button><button class="plus-btn" id="open-actions-courses">+</button></div>
    </header>
    <section class="panel">
      <div class="section-title"><h3>Kurse</h3><button class="linkish" id="open-calendar">Alle ansehen ›</button></div>
      <div class="tabs">
        <button class="tab ${state.courseTab === 'upcoming' ? 'active' : ''}" data-tab="upcoming">Bevorstehend</button>
        <button class="tab ${state.courseTab === 'booked' ? 'active' : ''}" data-tab="booked">Gebucht</button>
      </div>
      <div>${shown.map((c) => courseCard(c, true)).join('')}</div>
      <article class="course-banner">@HOME</article>
    </section>
  `;

  screens.builder.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.courseTab = btn.dataset.tab;
      renderCourses();
    });
  });
  screens.builder.querySelector('#open-profile-courses')?.addEventListener('click', () => {
    switchView('profile');
    renderProfile();
  });
  screens.builder.querySelector('#open-calendar')?.addEventListener('click', () => {
    state.courseView = 'calendar';
    renderCourses();
  });
  screens.builder.querySelector('#open-actions-courses')?.addEventListener('click', () => {
    state.showQuickActions = true;
    switchView('home');
    renderHome();
  });
}

function renderAnalysis() {
  const points = totalPoints();
  const target = 800;
  const pct = Math.max(8, Math.min(96, Math.round((points / target) * 100)));
  const remaining = Math.max(0, target - points);
  const daysLeft = 16;

  const historyList = state.workoutHistory
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
    <header class="hero-header red compact-header">
      <div class="status-fake"></div>
      <div class="header-top"><div class="avatar">AS</div><button class="plus-btn" id="analysis-actions">+</button></div>
    </header>
    <section class="panel">
      <div class="section-title"><h3>Ranking</h3></div>
      <article class="card ranking-card">
        <div><strong>März Ranking</strong><div class="rank-pill">noch 22 Tage</div></div>
        <div class="rank-avatars"><span>AS</span><span>GV</span><span>99+</span></div>
      </article>

      <div class="section-title"><h3>Aktivitätslevel</h3></div>
      <article class="card activity-card">
        <div class="activity-top">
          <div><div class="muted">Aktuelles Level</div><strong>Level 1: Holz</strong></div>
          <div><div class="muted">Punkte bis zum nächsten Level</div><strong>${remaining}</strong></div>
        </div>
        <div class="progress-ring big" style="--pct:${pct}%">
          <span><b>${points}</b><small>Aktivitätspunkte</small><small>${daysLeft} Tage verbleibend</small></span>
        </div>
      </article>

      <div class="section-title"><h3>Analyse</h3></div>
      ${historyList || '<article class="card"><p class="muted">Noch keine History.</p></article>'}
    </section>
  `;

  screens.analysis.querySelector('#analysis-actions')?.addEventListener('click', () => {
    state.showQuickActions = true;
    switchView('home');
    renderHome();
  });
}

function renderAccount() {
  screens.account.innerHTML = `
    <header class="hero-header red"><div class="header-top"><div class="avatar">AS</div></div></header>
    <section class="panel">
      <article class="card" style="background:linear-gradient(120deg,#ff1218,#ff5a5f);color:#fff"><strong>Zum ACTIV FITNESS Memberbereich</strong></article>
      <article class="card"><div class="row"><strong>Deals</strong><button class="linkish">Alle ansehen ›</button></div><p class="muted">10% auf Supplements · Gutschein: MoveFit10</p></article>
    </section>
  `;
}


function renderProfile() {
  screens.profile.innerHTML = `
    <header class="white-header profile-nav"><button class="icon" id="profile-back">←</button><h2>Mein Profil</h2><button class="icon">🔔</button></header>
    <section class="panel profile-panel">
      <article class="profile-hero">
        <div class="profile-avatar">AS</div>
        <h3>Alexandra Schibli</h3>
        <p>ACTIV FITNESS Luzern</p>
      </article>
      <article class="card profile-menu">
        <button class="profile-row"><span>👤</span><span>Mein Profil</span><b>›</b></button>
        <button class="profile-row"><span>ℹ️</span><span>App-Informationen</span><b>›</b></button>
        <button class="profile-row"><span>❓</span><span>Hilfe mit der App</span><b>›</b></button>
        <button class="profile-row"><span>⌚</span><span>Fitnesstracker anbinden</span><b>›</b></button>
        <button class="profile-row"><span>💬</span><span>Feedback geben</span><b>›</b></button>
      </article>
      <div class="profile-logout-wrap"><button class="profile-logout">🟧 ABMELDEN</button></div>
    </section>
  `;

  screens.profile.querySelector('#profile-back')?.addEventListener('click', () => {
    const backTo = state.previousView === 'profile' ? 'home' : state.previousView;
    switchView(backTo);
    if (backTo === 'home') renderHome();
    if (backTo === 'builder') renderCourses();
    if (backTo === 'analysis') renderAnalysis();
    if (backTo === 'account') renderAccount();
    if (backTo === 'plan') renderPlan();
    if (backTo === 'player') renderPlayer();
  });
}

function render() {
  renderHome();
  renderPlan();
  renderPlayer();
  renderCourses();
  renderAnalysis();
  renderAccount();
  renderProfile();
  switchView(state.view);
}

bindGlobalNav();
loadExercises().catch((error) => {
  console.error(error);
  screens.home.innerHTML = '<div class="panel"><p class="muted">Dataset konnte nicht geladen werden.</p></div>';
});
