const STORAGE_KEY = 'activ-fitness-ui-state-v6';

const state = {
  view: 'home',
  exercises: [],
  plans: [],
  activePlanId: null,
  playerExerciseIndex: 0,
  search: '',
  bodyPart: 'all',
  equipment: 'all',
  muscle: 'all',
  workoutHistory: [],
  completionSummary: null,
  showAnnouncement: true,
  showQuickActions: false,
  previousView: 'home',
  planScreen: 'detail',
  planHubTab: 'verlauf',
  builderMode: 'courses',
  coursesView: 'main',
  courseTab: 'upcoming',
  selectedCourseDay: '',
  selectedCourseDateISO: '',
  courseDays: [],
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

function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function exerciseSearchBlob(ex) {
  return normalizeText(
    [
      ex.name,
      ...(ex.bodyParts || []),
      ...(ex.equipments || []),
      ...(ex.targetMuscles || []),
      ...(ex.secondaryMuscles || []),
    ].join(' '),
  );
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



function initCourseCalendarState() {
  const now = new Date();
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  const mondayOffset = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - mondayOffset);

  const days = [];
  for (let i = 0; i < 8; i += 1) {
    const d = new Date(day);
    d.setDate(day.getDate() + i);
    const label = d.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', '');
    const chip = `${label[0].toUpperCase()}${label.slice(1,2).toLowerCase()} ${d.getDate()}`;
    days.push({
      iso: d.toISOString().slice(0, 10),
      chip,
      title: d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' }),
      dayNum: d.getDate(),
    });
  }

  const todayIso = now.toISOString().slice(0, 10);
  const match = days.find((d) => d.iso === todayIso) || days[0];
  state.courseDays = days;
  state.selectedCourseDay = match.chip;
  state.selectedCourseDateISO = match.iso;
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
  initCourseCalendarState();
  saveStorage();
  render();
}

function switchView(view) {
  if (view !== 'profile') state.previousView = state.view;
  state.view = view;
  Object.entries(screens).forEach(([name, el]) => el.classList.toggle('active', name === view));
  navItems.forEach((btn) => btn.classList.toggle('active', btn.dataset.target === view));
}


function quickSheetMarkup() {
  if (!state.showQuickActions) return '';
  return `
    <div class="sheet-backdrop" id="close-sheet"></div>
    <aside class="quick-sheet">
      <div class="sheet-grabber"></div>
      <h4>Schnellaktionen</h4>
      <button data-action="record"><span class="qa-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="16" cy="4" r="2"/><path d="M10 20l2-5-2-3m2 3 4 3m-5-8 2-2 3 2m-8 2 4-2"/></svg></span>Training erfassen <b>›</b></button>
      <button data-action="courses"><span class="qa-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg></span>Kurse <b>›</b></button>
      <button data-action="history"><span class="qa-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg></span>Trainingsverlauf <b>›</b></button>
      <button data-action="locations"><span class="qa-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11z"/><circle cx="12" cy="10" r="2.4"/></svg></span>Standorte <b>›</b></button>
    </aside>
  `;
}


function syncSheetLock() {
  document.body.classList.toggle('sheet-open', state.showQuickActions);
  Object.values(screens).forEach((screenEl) => {
    screenEl.classList.toggle('sheet-open', state.showQuickActions && screenEl.classList.contains('active'));
  });
}

function rerenderCurrent() {
  if (state.view === 'home') renderHome();
  if (state.view === 'plan') renderPlan();
  if (state.view === 'player') renderPlayer();
  if (state.view === 'builder') renderBuilder();
  if (state.view === 'analysis') renderAnalysis();
  if (state.view === 'account') renderAccount();
  if (state.view === 'profile') renderProfile();
  syncSheetLock();
}

function bindQuickSheet(scope) {
  scope.querySelector('#close-sheet')?.addEventListener('click', () => {
    state.showQuickActions = false;
    rerenderCurrent();
  });
  scope.querySelectorAll('.quick-sheet [data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.showQuickActions = false;
      const action = btn.dataset.action;
      if (action === 'record') {
        state.builderMode = 'workout';
        switchView('builder');
        renderBuilder();
      } else if (action === 'courses') {
        state.builderMode = 'courses';
        state.coursesView = 'main';
        if (!state.courseDays.length) initCourseCalendarState();
        switchView('builder');
        renderBuilder();
      } else if (action === 'history') {
        switchView('analysis');
        renderAnalysis();
      } else {
        switchView('account');
        renderAccount();
      }
    });
  });
}

function bindGlobalNav() {
  navItems.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.target === 'builder') {
        state.builderMode = 'courses';
        state.coursesView = 'main';
        if (!state.courseDays.length) initCourseCalendarState();
      }
      switchView(button.dataset.target);
      rerenderCurrent();
    });
  });

  document.querySelector('#app').addEventListener('click', (event) => {
    if (event.target.closest('.avatar')) {
      switchView('profile');
      renderProfile();
    }
  });
}

function renderHome() {
  const plan = getActivePlan();
  const cover = plan ? getExerciseById(plan.items[0]?.id) : state.exercises[0];
  const recent = state.workoutHistory.slice(0, 2);

  const historyRows = recent
    .map((entry) => `
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
    `)
    .join('');

  screens.home.innerHTML = `
    <header class="hero-header red compact-header">
      <div class="status-fake"></div>
      <div class="header-top">
        <button class="avatar">AS</button>
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
      <div class="section-title"><h3>Deine Trainingspläne</h3><button class="linkish" id="go-plan-list">Alle ansehen ›</button></div>
      <article class="hero workout-card" id="open-plan">
        ${cover ? `<img src="${imageFor(cover)}" alt="Planbild" onerror="this.src='${placeholderSvg}'"/>` : ''}
        <div class="hero-overlay"><span class="tag">Von meinem Trainer</span><h4>${plan?.title ?? 'Trainingsplan'}</h4><span>${plan?.items.length ?? 0} Übungen · 305 Kcal</span></div>
      </article>

      <div class="section-title"><h3>Verlauf</h3><button class="linkish" id="open-history">Alle ansehen ›</button></div>
      ${historyRows || '<article class="card"><p class="muted">Noch keine abgeschlossenen Workouts.</p></article>'}

      <div class="cta-wrap"><button class="cta" id="record-training">＋ Training aufzeichnen</button></div>
    </section>
    ${quickSheetMarkup()}
  `;

  screens.home.querySelector('#open-actions')?.addEventListener('click', () => {
    state.showQuickActions = true;
    renderHome();
  });
  screens.home.querySelector('#open-plan')?.addEventListener('click', () => {
    switchView('plan');
    renderPlan();
  });
  screens.home.querySelector('#go-plan-list')?.addEventListener('click', () => {
    state.planScreen = 'overview';
    state.planHubTab = 'verlauf';
    switchView('plan');
    renderPlan();
  });
  screens.home.querySelector('#open-history')?.addEventListener('click', () => {
    switchView('analysis');
    renderAnalysis();
  });
  screens.home.querySelector('#record-training')?.addEventListener('click', () => {
    state.builderMode = 'workout';
    switchView('builder');
    renderBuilder();
  });

  syncSheetLock();
  bindQuickSheet(screens.home);
}

function renderPlan() {
  const plan = getActivePlan();
  if (!plan) {
    screens.plan.innerHTML = '<div class="panel"><p class="muted">Kein Plan vorhanden.</p></div>';
    return;
  }

  if (state.planScreen === 'overview') {
    const cover = getExerciseById(plan.items[0]?.id);
    screens.plan.innerHTML = `
      <header class="plan-overview-head">
        <button class="icon" id="back-home">←</button>
        <h2>Verlauf</h2>
        <button class="icon" id="open-builder-plus">＋</button>
      </header>
      <section class="plan-overview-tabs">
        <button class="${state.planHubTab === 'workouts' ? 'active' : ''}" data-tab="workouts">WORKOUTS</button>
        <button class="${state.planHubTab === 'verlauf' ? 'active' : ''}" data-tab="verlauf">VERLAUF</button>
      </section>
      ${state.planHubTab === 'workouts' ? `
        <section class="panel" style="margin-top:0;border-radius:0;padding-top:14px;">
          <div class="section-title"><h3>Von meinem Trainer</h3><button class="linkish">Alle ansehen ›</button></div>
          <article class="hero workout-card" id="open-plan-detail">
            ${cover ? `<img src="${imageFor(cover)}" alt="Planbild" onerror="this.src='${placeholderSvg}'"/>` : ''}
            <div class="hero-overlay"><h4>${plan.title}</h4><span>${plan.items.length} Übungen · 305 Kcal</span></div>
          </article>
          <article class="card create-own-plan">
            <h4>Erstelle deinen eigenen Trainingsplan</h4>
            <p class="muted">Erstelle deinen eigenen Trainingsplan mit über 1.000 Übungen aus unserer Bibliothek.</p>
            <button class="create-own-btn" id="open-builder-create">＋ Anlegen</button>
          </article>
        </section>
      ` : `
        <section class="empty-history-screen">
          <div class="week-row"><button>‹</button><strong>9. März - 15. März 2026</strong><button>›</button></div>
          <div class="empty-icon"></div>
          <h3>Noch keine Workouts</h3>
          <p>Hast du dir eine Pause gegönnt? Wenn ein Training fehlt, kannst du es hier ganz einfach nachtragen.</p>
          <button class="cta" id="open-builder-record">＋ Training aufzeichnen</button>
        </section>
      `}
    `;

    screens.plan.querySelector('#back-home')?.addEventListener('click', () => {
      state.planScreen = 'detail';
      switchView('home');
      renderHome();
    });
    screens.plan.querySelector('#open-builder-plus')?.addEventListener('click', () => {
      state.builderMode = 'workout';
      switchView('builder');
      renderBuilder();
    });
    screens.plan.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.planHubTab = btn.dataset.tab;
        renderPlan();
      });
    });
    screens.plan.querySelector('#open-plan-detail')?.addEventListener('click', () => {
      state.planScreen = 'detail';
      renderPlan();
    });
    screens.plan.querySelector('#open-builder-create')?.addEventListener('click', () => {
      state.builderMode = 'workout';
      switchView('builder');
      renderBuilder();
    });
    screens.plan.querySelector('#open-builder-record')?.addEventListener('click', () => {
      state.builderMode = 'workout';
      switchView('builder');
      renderBuilder();
    });
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


function courseCard(course, compact = false) {
  const badge = course.spots > 0 ? `${course.spots} freie Plätze` : 'Voll';
  const badgeClass = course.spots > 2 ? 'ok' : course.spots > 0 ? 'warn' : 'full';
  return `
    <article class="course-card ${compact ? 'compact' : ''}">
      <div class="row course-top"><span>🗓 ${course.dateLabel} um ${course.time}</span><span class="availability ${badgeClass}">${badge}</span></div>
      <div class="availability-track"><span class="availability-bar ${badgeClass}"></span></div>
      <h4>${course.title}</h4>
      <p>${course.duration} min mit ${course.instructor}</p>
      <p>${course.location}</p>
    </article>
  `;
}

function renderCoursesSection() {
  if (state.coursesView === 'calendar') {
    const days = state.courseDays.length ? state.courseDays : [{ chip: state.selectedCourseDay, iso: state.selectedCourseDateISO, title: state.selectedCourseDay }];
    const filtered = courses.filter((c) => c.day === state.selectedCourseDay);
    const calendarCourses = filtered.length ? filtered : courses.filter((c) => !c.booked).slice(0, 4);
    screens.builder.innerHTML = `
      <header class="white-header"><button class="icon" id="back-courses">←</button><h2>Einen Kurs finden</h2></header>
      <section class="panel calendar-panel">
        <div class="chips-scroll">
          <button class="chip chip-solid">⚙ Filter</button><button class="chip">Alle Kurse</button><button class="chip">Heimstudio</button><button class="chip">Alle Kategorien</button>
        </div>
        <div class="days-scroll">
          ${days.map((d) => {
            const [wd, num] = d.chip.split(' ');
            return `<button class="day-chip ${d.chip === state.selectedCourseDay ? 'active' : ''}" data-day="${d.chip}" data-iso="${d.iso}"><span>${wd}</span><strong>${num}</strong>${d.chip === state.selectedCourseDay ? '<i></i>' : ''}</button>`;
          }).join('')}
        </div>
        <h3 class="date-title">${(days.find((d) => d.chip === state.selectedCourseDay)?.title || state.selectedCourseDay)}</h3>
        <div>${calendarCourses.map((c) => courseCard(c)).join('')}</div>
      </section>
    `;

    screens.builder.querySelector('#back-courses')?.addEventListener('click', () => {
      state.coursesView = 'main';
      renderCoursesSection();
    });
    screens.builder.querySelectorAll('[data-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedCourseDay = btn.dataset.day;
        state.selectedCourseDateISO = btn.dataset.iso || state.selectedCourseDateISO;
        renderCoursesSection();
      });
    });
    return;
  }

  const shown = courses.filter((c) => (state.courseTab === 'booked' ? c.booked : !c.booked));
  screens.builder.innerHTML = `
    <header class="hero-header red compact-header courses-top">
      <div class="status-fake"></div>
      <div class="header-top"><button class="avatar">AS</button><button class="plus-btn" id="open-actions-builder">+</button></div>
    </header>
    <section class="panel">
      <div class="section-title"><h3>Kurse</h3><button class="linkish" id="open-calendar">Alle ansehen ›</button></div><p class="muted courses-current-date">${new Date().toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
      <div class="tabs courses-tabs">
        <button class="tab ${state.courseTab === 'upcoming' ? 'active' : ''}" data-tab="upcoming">Bevorstehend</button>
        <button class="tab ${state.courseTab === 'booked' ? 'active' : ''}" data-tab="booked">Gebucht</button>
      </div>
      <div>${shown.map((c) => courseCard(c, true)).join('')}</div>
      <article class="course-banner">@HOME</article>
    </section>
    ${quickSheetMarkup()}
  `;

  screens.builder.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.courseTab = btn.dataset.tab;
      renderCoursesSection();
    });
  });
  screens.builder.querySelector('#open-calendar')?.addEventListener('click', () => {
    state.coursesView = 'calendar';
    renderCoursesSection();
  });
  screens.builder.querySelector('#open-actions-builder')?.addEventListener('click', () => {
    state.showQuickActions = true;
    renderCoursesSection();
  });
  syncSheetLock();
  bindQuickSheet(screens.builder);
}

function renderBuilder() {
  if (state.builderMode === "courses") {
    renderCoursesSection();
    return;
  }

  const plan = getActivePlan();
  if (!plan) return;

  const query = normalizeText(state.search);
  const queryTokens = query ? query.split(' ') : [];

  const allMuscles = uniqueSorted(
    state.exercises.flatMap((ex) => [...(ex.targetMuscles || []), ...(ex.secondaryMuscles || [])]),
  );

  const bySearch = (ex) => {
    if (!queryTokens.length) return true;
    const blob = exerciseSearchBlob(ex);
    return queryTokens.every((token) => blob.includes(token));
  };

  const byBody = (ex) => state.bodyPart === 'all' || (ex.bodyParts || []).includes(state.bodyPart);
  const byEquipment = (ex) => state.equipment === 'all' || (ex.equipments || []).includes(state.equipment);
  const byMuscle = (ex) =>
    state.muscle === 'all' ||
    [...(ex.targetMuscles || []), ...(ex.secondaryMuscles || [])].includes(state.muscle);

  const inPlan = (ex) => plan.items.some((item) => item.id === ex.exerciseId);

  const filteredPool = state.exercises.filter(
    (ex) => !inPlan(ex) && bySearch(ex) && byBody(ex) && byEquipment(ex) && byMuscle(ex),
  );

  const bodyParts = uniqueSorted(
    state.exercises
      .filter((ex) => !inPlan(ex) && bySearch(ex) && byEquipment(ex) && byMuscle(ex))
      .flatMap((ex) => ex.bodyParts || []),
  );

  const equipments = uniqueSorted(
    state.exercises
      .filter((ex) => !inPlan(ex) && bySearch(ex) && byBody(ex) && byMuscle(ex))
      .flatMap((ex) => ex.equipments || []),
  );

  const muscles = uniqueSorted(
    state.exercises
      .filter((ex) => !inPlan(ex) && bySearch(ex) && byBody(ex) && byEquipment(ex))
      .flatMap((ex) => [...(ex.targetMuscles || []), ...(ex.secondaryMuscles || [])]),
  );

  if (state.bodyPart !== 'all' && !bodyParts.includes(state.bodyPart)) state.bodyPart = 'all';
  if (state.equipment !== 'all' && !equipments.includes(state.equipment)) state.equipment = 'all';
  if (state.muscle !== 'all' && !muscles.includes(state.muscle)) state.muscle = 'all';

  const pool = state.exercises.filter(
    (ex) => !inPlan(ex) && bySearch(ex) && byBody(ex) && byEquipment(ex) && byMuscle(ex),
  );

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
    .slice(0, 24)
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
      <div class="header-top"><button class="avatar">AS</button><button class="plus-btn" id="open-actions-builder">+</button></div>
      <h1>Workout Builder</h1>
      <p>Stelle dein Training interaktiv zusammen.</p>
    </header>
    <section class="panel">
      <article class="card">
        <div class="row"><strong>Aktiver Plan</strong><select id="plan-switch" class="plan-select">${planSwitch}</select></div>
        <div class="controls controls-builder">
          <input id="search" placeholder="Suche Übung, Equipment, Muscle..." value="${state.search}" />
          <select id="body-filter"><option value="all">Body Part</option>${bodyParts
            .map((part) => `<option value="${part}" ${part === state.bodyPart ? 'selected' : ''}>${part}</option>`)
            .join('')}</select>
          <select id="equipment-filter"><option value="all">Equipment</option>${equipments
            .map((eq) => `<option value="${eq}" ${eq === state.equipment ? 'selected' : ''}>${eq}</option>`)
            .join('')}</select>
          <select id="muscle-filter"><option value="all">Muscle</option>${muscles
            .map((m) => `<option value="${m}" ${m === state.muscle ? 'selected' : ''}>${m}</option>`)
            .join('')}</select>
          <button class="small-btn" id="run-search">Suchen</button>
          <button class="small-btn" id="reset-filters">Reset</button>
        </div>
      </article>

      <article class="card">
        <div class="row"><strong>Suchergebnisse</strong><span class="muted">${pool.length} Treffer</span></div>
        ${library || '<p class="muted">Keine Treffer. Filter zurücksetzen oder anderen Suchbegriff eingeben.</p>'}
      </article>

      <article class="card">
        <div class="row"><strong>Plan Reihenfolge</strong><span class="muted">${plan.items.length} Übungen</span></div>
        ${builderList || '<p class="muted">Keine Übungen im Plan.</p>'}
      </article>

      <div class="cta-wrap" style="padding-inline:0"><button class="cta" id="save-plan">Plan speichern</button></div>
    </section>
    ${quickSheetMarkup()}
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

  screens.builder.querySelector('#muscle-filter')?.addEventListener('change', (e) => {
    state.muscle = e.target.value;
    renderBuilder();
  });

  screens.builder.querySelector('#run-search')?.addEventListener('click', () => {
    renderBuilder();
  });

  screens.builder.querySelector('#reset-filters')?.addEventListener('click', () => {
    state.search = '';
    state.bodyPart = 'all';
    state.equipment = 'all';
    state.muscle = 'all';
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

  screens.builder.querySelector('#open-actions-builder')?.addEventListener('click', () => {
    state.showQuickActions = true;
    renderBuilder();
  });

  syncSheetLock();
  bindQuickSheet(screens.builder);
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
    <header class="hero-header red compact-header"><div class="status-fake"></div><div class="header-top"><button class="avatar">AS</button><button class="plus-btn" id="open-actions-analysis">+</button></div></header>
    <section class="panel">
      <article class="card"><strong>Aktivitätslevel</strong><p class="muted">Gesamtpunkte: ${totalPoints()} · Kalorien: ${totalCaloriesFromHistory()}</p></article>
      <article class="card">
        <div class="progress-ring" style="--pct:${pct}%"><span>${totalPoints()}</span></div>
        <p class="muted" style="text-align:center">${pct}% erledigte Sets aus allen abgeschlossenen Workouts.</p>
      </article>
      <div class="section-title"><h3>History</h3></div>
      ${historyList || '<article class="card"><p class="muted">Noch keine abgeschlossenen Workouts.</p></article>'}
    </section>
    ${quickSheetMarkup()}
  `;

  screens.analysis.querySelector('#open-actions-analysis')?.addEventListener('click', () => {
    state.showQuickActions = true;
    renderAnalysis();
  });
  syncSheetLock();
  bindQuickSheet(screens.analysis);
}

function renderAccount() {
  screens.account.innerHTML = `
    <header class="hero-header red compact-header"><div class="status-fake"></div><div class="header-top"><button class="avatar">AS</button><button class="plus-btn" id="open-actions-account">+</button></div></header>
    <section class="panel">
      <article class="card" style="background:linear-gradient(120deg,#ff1218,#ff5a5f);color:#fff"><strong>Zum ACTIV FITNESS Memberbereich</strong></article>
      <article class="card"><div class="row"><strong>Deals</strong><button class="linkish">Alle ansehen ›</button></div><p class="muted">10% auf Supplements · Gutschein: MoveFit10</p><button class="small-btn">Zum Deal</button></article>
    </section>
    ${quickSheetMarkup()}
  `;

  screens.account.querySelector('#open-actions-account')?.addEventListener('click', () => {
    state.showQuickActions = true;
    renderAccount();
  });
  syncSheetLock();
  bindQuickSheet(screens.account);
}

function renderProfile() {
  screens.profile.innerHTML = `
    <header class="profile-nav profile-nav-accurate">
      <button class="icon profile-top-icon" id="profile-back" aria-label="Zurück">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>
      </button>
      <h2>Mein Profil</h2>
      <button class="icon profile-top-icon" aria-label="Benachrichtigungen">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 17H5l2-2v-5a5 5 0 0 1 10 0v5l2 2h-4"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>
      </button>
    </header>
    <section class="profile-hero-wrap profile-hero-accurate">
      <div class="profile-avatar">AS</div>
      <h3>Alexandra Schibli</h3>
      <p>ACTIV FITNESS Luzern</p>
    </section>
    <section class="profile-list profile-list-accurate">
      <button class="profile-item">
        <span class="profile-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M4 20a8 8 0 0 1 16 0"/><path d="m18 6 2 2m0-2-2 2"/></svg></span>
        <b>Mein Profil</b><i>›</i>
      </button>
      <div class="profile-sub">App Account bearbeiten</div>
      <button class="profile-item">
        <span class="profile-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z"/></svg></span>
        <b>App-Informationen</b><i>›</i>
      </button>
      <button class="profile-item">
        <span class="profile-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 6h14v9H9l-4 3V6z"/></svg></span>
        <b>Hilfe mit der App</b><i>›</i>
      </button>
      <button class="profile-item">
        <span class="profile-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg></span>
        <b>Fitnesstracker anbinden</b><i>›</i>
      </button>
      <button class="profile-item">
        <span class="profile-menu-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 6h14v9H9l-4 3V6z"/></svg></span>
        <b>Feedback geben</b><i>›</i>
      </button>
    </section>
    <div class="logout-wrap"><button class="logout-btn"><span class="logout-mark">M</span><span class="logout-sep"></span>ABMELDEN</button></div>
  `;

  screens.profile.querySelector('#profile-back')?.addEventListener('click', () => {
    const target = state.previousView === 'profile' ? 'home' : state.previousView;
    switchView(target);
    rerenderCurrent();
  });
  syncSheetLock();
}

function render() {
  renderHome();
  renderPlan();
  renderPlayer();
  renderBuilder();
  renderAnalysis();
  renderAccount();
  renderProfile();
  switchView(state.view);
  syncSheetLock();
}

bindGlobalNav();
loadExercises().catch((error) => {
  console.error(error);
  screens.home.innerHTML = '<div class="panel"><p class="muted">Dataset konnte nicht geladen werden.</p></div>';
});
