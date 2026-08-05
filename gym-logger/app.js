/* ============================================
   GymLog — Main Application Logic
   ============================================ */

/* ---------- Application State ---------- */
const state = {
  date: null,
  bodyPart: null,       // 'upper' | 'lower'
  equipmentType: null,  // 'machine' | 'freeweight'
  category: null,       // 'push'|'pull'|'core' OR 'quads'|'hamstrings'|'glutes'|'adductors'|'calves'
  exercise: null,
  sets: [],             // [{ weight: '', reps: '', painLevel: 7 }, ...]
  warmupSets: [],       // [{ weight: '', reps: '' }, ...]
  showWarmup: false,
  selectedWarmups: {}   // { 'Cycling': 10, 'Treadmill': 5 }
};

let calendarInstance = null;
let listenersAttached = false;

/* ---------- Authentication ---------- */
document.addEventListener('DOMContentLoaded', () => {
  attachAuthListeners();

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      showView('loading');
      await initDataLayer(user.uid);
      showView('home');
      attachListeners();
      updateUserInfo(user);
    } else {
      teardownDataLayer();
      showView('login');
    }
  });
});

function attachAuthListeners() {
  const btnGoogle = document.getElementById('btn-google-signin');
  if (btnGoogle) {
    btnGoogle.addEventListener('click', async () => {
      btnGoogle.disabled = true;
      btnGoogle.querySelector('.signin-btn-text').textContent = 'Signing in...';
      try {
        await auth.signInWithPopup(googleProvider);
      } catch (err) {
        console.error('Google sign-in error:', err);
        if (err.code === 'auth/popup-blocked') {
          try {
            await auth.signInWithRedirect(googleProvider);
          } catch (redirectErr) {
            console.error('Redirect sign-in error:', redirectErr);
            showToast('Sign-in failed. Please try again.', 'toast-error');
          }
        } else if (err.code !== 'auth/popup-closed-by-user') {
          showToast('Sign-in failed. Please try again.', 'toast-error');
        }
      } finally {
        btnGoogle.disabled = false;
        btnGoogle.querySelector('.signin-btn-text').textContent = 'Sign in with Google';
      }
    });
  }

  const btnSignOut = document.getElementById('btn-sign-out');
  if (btnSignOut) {
    btnSignOut.addEventListener('click', async () => {
      await auth.signOut();
    });
  }
}

function updateUserInfo(user) {
  const nameEl = document.getElementById('user-display-name');
  const avatarEl = document.getElementById('user-avatar');
  if (nameEl) nameEl.textContent = user.displayName || user.email || 'User';
  if (avatarEl && user.photoURL) {
    avatarEl.src = user.photoURL;
    avatarEl.style.display = 'block';
  } else if (avatarEl) {
    avatarEl.style.display = 'none';
  }
}

/* ---------- View Management ---------- */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById('view-' + name);
  if (!view) return;

  view.style.animation = 'none';
  view.offsetHeight; // force reflow
  view.style.animation = '';
  view.classList.add('active');

  switch (name) {
    case 'home':
      initHome();
      break;
    case 'date':
      initDate();
      break;
    case 'general-warmup':
      initGeneralWarmup();
      break;
    case 'body-part':
      updateBreadcrumb('breadcrumb-body-part', [
        { label: formatDate(state.date) },
        { label: 'Body Part' }
      ]);
      break;
    case 'equipment':
      updateBreadcrumb('breadcrumb-equipment', [
        { label: formatDate(state.date) },
        { label: state.bodyPart === 'upper' ? 'Upper Body' : 'Lower Body' }
      ]);
      break;
    case 'category':
      updateBreadcrumb('breadcrumb-category', [
        { label: formatDate(state.date) },
        { label: 'Upper Body' },
        { label: state.equipmentType === 'machine' ? 'Machine' : 'Free Weight' }
      ]);
      break;
    case 'lower-category':
      updateBreadcrumb('breadcrumb-lower-category', [
        { label: formatDate(state.date) },
        { label: 'Lower Body' },
        { label: state.equipmentType === 'machine' ? 'Machine' : 'Free Weight' }
      ]);
      break;
    case 'exercises':
      initExercises();
      break;
    case 'log':
      initLog();
      break;
    case 'day-detail':
      initDayDetail();
      break;
  }

  window.scrollTo(0, 0);
}

/* ---------- Home View ---------- */
function initHome() {
  const container = document.getElementById('calendar-container');
  calendarInstance = new Calendar(container, onCalendarDateClick);
}

function onCalendarDateClick(dateStr) {
  state.date = dateStr;
  showView('day-detail');
}

/* ---------- Date View ---------- */
function initDate() {
  const input = document.getElementById('input-date');
  input.value = state.date || getTodayStr();
}

/* ---------- Daily General Warm-up View ---------- */
function initGeneralWarmup() {
  updateBreadcrumb('breadcrumb-general-warmup', [{ label: formatDate(state.date) }]);

  const grid = document.getElementById('warmup-options-grid');
  if (!grid) return;

  // Build combined activities list: defaults + customs
  const defaults = DEFAULT_WARMUP_ACTIVITIES;
  const customs = getCustomWarmups().map(c => ({ icon: '🔥', name: c }));
  const allActivities = [...defaults, ...customs];

  // Load existing warmup if logged today
  if (Object.keys(state.selectedWarmups).length === 0) {
    const workouts = getWorkoutsByDate(state.date);
    const existing = workouts.find(w => w.bodyPart === 'warmup');
    if (existing && existing.details) {
      // Parse details string e.g. "Cycling (10 min), Treadmill (5 min)"
      const parts = existing.details.split(', ');
      parts.forEach(p => {
        const match = p.match(/^(.+?)\s*\((\d+)\s*min\)$/);
        if (match) {
          state.selectedWarmups[match[1]] = parseInt(match[2]);
        } else if (p.trim()) {
          state.selectedWarmups[p.trim()] = 5;
        }
      });
    }
  }

  renderWarmupCards(allActivities, grid);
}

function renderWarmupCards(activities, grid) {
  grid.innerHTML = activities.map(act => {
    const isSelected = state.selectedWarmups.hasOwnProperty(act.name);
    const duration = isSelected ? state.selectedWarmups[act.name] : 5;
    return `
      <div class="warmup-card ${isSelected ? 'selected' : ''}" data-name="${escapeAttr(act.name)}">
        <div class="warmup-card-icon">${act.icon}</div>
        <div class="warmup-card-text">${escapeHtml(act.name)}</div>
        ${isSelected ? `
          <div class="warmup-duration-picker" onclick="event.stopPropagation()">
            <label>Duration:</label>
            <input type="number" class="warmup-duration-input" data-activity="${escapeAttr(act.name)}" value="${duration}" min="1" max="180">
            <span>min</span>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // Card click toggle
  grid.querySelectorAll('.warmup-card').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.name;
      if (state.selectedWarmups.hasOwnProperty(name)) {
        delete state.selectedWarmups[name];
      } else {
        state.selectedWarmups[name] = 5; // default 5 minutes
      }
      renderWarmupCards(activities, grid);
    });
  });

  // Duration input listener
  grid.querySelectorAll('.warmup-duration-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const name = input.dataset.activity;
      const val = parseInt(e.target.value) || 5;
      state.selectedWarmups[name] = val;
    });
    input.addEventListener('input', (e) => {
      const name = input.dataset.activity;
      const val = parseInt(e.target.value) || 5;
      state.selectedWarmups[name] = val;
    });
  });
}

function saveGeneralWarmup(details) {
  if (!currentUid) return;

  const workouts = getWorkoutsByDate(state.date);
  const existing = workouts.find(w => w.bodyPart === 'warmup');

  const workoutData = {
    date: state.date,
    bodyPart: 'warmup',
    equipmentType: 'cardio',
    category: null,
    exercise: 'General Warm-up',
    sets: [],
    details: details,
    createdAt: existing ? (existing.createdAt || new Date().toISOString()) : new Date().toISOString()
  };

  if (existing) {
    workoutData.id = existing.id;
    db.collection('users').doc(currentUid).collection('workouts').doc(existing.id)
      .set(workoutData)
      .catch(err => console.error('Update general warmup error:', err));

    const idx = workoutsCache.findIndex(w => w.id === existing.id);
    if (idx !== -1) workoutsCache[idx] = workoutData;
  } else {
    saveWorkout(workoutData);
  }
}

/* ---------- Exercises View ---------- */
function initExercises() {
  const searchInput = document.getElementById('search-exercises');
  searchInput.value = '';

  const crumbs = [{ label: formatDate(state.date) }];
  crumbs.push({ label: state.bodyPart === 'upper' ? 'Upper Body' : 'Lower Body' });
  crumbs.push({ label: state.equipmentType === 'machine' ? 'Machine' : 'Free Weight' });
  if (state.category) crumbs.push({ label: capitalize(state.category) });
  updateBreadcrumb('breadcrumb-exercises', crumbs);

  let title = 'Exercises';
  if (state.category) title = capitalize(state.category) + ' Exercises';
  document.getElementById('exercises-title').textContent = title;

  renderExerciseList('');
  document.getElementById('btn-add-custom').style.display = 'flex';
}

function renderExerciseList(query) {
  const list = document.getElementById('exercise-list');
  const exercises = getExercises(state.bodyPart, state.equipmentType, state.category);
  const customs = getCustomExercises();
  const customKey = getCustomKey(state.bodyPart, state.equipmentType, state.category);
  const customList = customs[customKey] || [];
  const q = query.toLowerCase().trim();

  const filtered = exercises.filter(ex => ex.toLowerCase().includes(q));

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <h3>No exercises found</h3>
        <p>Try a different search or add a custom exercise.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map(ex => {
    const isCustom = customList.includes(ex);
    return `
      <div class="exercise-item ${isCustom ? 'custom-exercise' : ''}" data-exercise="${escapeAttr(ex)}">
        <div class="ex-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${isCustom
              ? '<path d="M12 5v14M5 12h14"/>'
              : '<path d="M6.5 6.5h11M6.5 17.5h11"/><path d="M4 10V4h3v16H4v-6"/><path d="M20 10V4h-3v16h3v-6"/>'
            }
          </svg>
        </div>
        <span class="ex-name">${escapeHtml(ex)}</span>
        <svg class="ex-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.exercise-item').forEach(el => {
    el.addEventListener('click', () => {
      state.exercise = el.dataset.exercise;
      showView('log');
    });
  });
}

/* ---------- Log View ---------- */
function initLog() {
  document.getElementById('log-exercise-name').textContent = state.exercise;

  const crumbs = [{ label: formatDate(state.date) }];
  crumbs.push({ label: state.bodyPart === 'upper' ? 'Upper Body' : 'Lower Body' });
  crumbs.push({ label: state.equipmentType === 'machine' ? 'Machine' : 'Free Weight' });
  if (state.category) crumbs.push({ label: capitalize(state.category) });
  crumbs.push({ label: state.exercise });
  updateBreadcrumb('breadcrumb-log', crumbs);

  state.sets = [{ weight: '', reps: '', painLevel: 7 }];
  state.warmupSets = [];
  state.showWarmup = false;
  renderWarmupSection();
  renderSets();
}

function renderWarmupSection() {
  const toggle = document.getElementById('warmup-toggle');
  const content = document.getElementById('warmup-content');
  toggle.checked = state.showWarmup;
  content.style.display = state.showWarmup ? 'block' : 'none';
  if (!state.showWarmup) return;
  renderWarmupSets();
}

function renderWarmupSets() {
  const container = document.getElementById('warmup-sets-list');
  if (!container) return;

  container.innerHTML = state.warmupSets.map((set, i) => `
    <div class="warmup-set-row" data-index="${i}">
      <div class="set-number warmup-number">${i + 1}</div>
      <div class="set-inputs">
        <div class="input-group">
          <label>Weight (kg)</label>
          <input type="number" class="warmup-weight" value="${set.weight}" placeholder="0" min="0" step="0.5" inputmode="decimal">
        </div>
        <div class="input-group">
          <label>Reps</label>
          <input type="number" class="warmup-reps" value="${set.reps}" placeholder="0" min="0" inputmode="numeric">
        </div>
      </div>
      ${state.warmupSets.length > 1 ? `
        <button class="btn-remove-set btn-remove-warmup" data-remove="${i}" aria-label="Remove warm-up set">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      ` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.warmup-weight').forEach((input, i) => {
    input.addEventListener('input', () => { state.warmupSets[i].weight = input.value; });
  });
  container.querySelectorAll('.warmup-reps').forEach((input, i) => {
    input.addEventListener('input', () => { state.warmupSets[i].reps = input.value; });
  });
  container.querySelectorAll('.btn-remove-warmup').forEach(btn => {
    btn.addEventListener('click', () => {
      state.warmupSets.splice(parseInt(btn.dataset.remove), 1);
      renderWarmupSets();
    });
  });
}

function renderSets() {
  const container = document.getElementById('sets-list');
  container.innerHTML = state.sets.map((set, i) => {
    const painVal = set.painLevel || 7;
    const painInfo = getPainInfo(painVal);
    return `
      <div class="set-card" data-index="${i}">
        <div class="set-card-header">
          <div class="set-number">${i + 1}</div>
          ${state.sets.length > 1 ? `
            <button class="btn-remove-set" data-remove="${i}" aria-label="Remove set">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          ` : ''}
        </div>
        <div class="set-inputs">
          <div class="input-group">
            <label>Weight (kg)</label>
            <input type="number" class="set-weight" value="${set.weight}" placeholder="0" min="0" step="0.5" inputmode="decimal">
          </div>
          <div class="input-group">
            <label>Reps</label>
            <input type="number" class="set-reps" value="${set.reps}" placeholder="0" min="0" inputmode="numeric">
          </div>
        </div>
        <div class="set-pain-container">
          <div class="set-pain-header">
            <span class="set-pain-label">Effort / Pain Scale</span>
            <span class="set-pain-value ${painInfo.level}">${painVal}</span>
          </div>
          <input type="range" class="pain-slider set-pain-slider" min="1" max="10" value="${painVal}" data-set="${i}">
          <div class="set-pain-feedback ${painInfo.level}">${painInfo.label}</div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.set-weight').forEach((input, i) => {
    input.addEventListener('input', () => { state.sets[i].weight = input.value; });
  });
  container.querySelectorAll('.set-reps').forEach((input, i) => {
    input.addEventListener('input', () => { state.sets[i].reps = input.value; });
  });
  container.querySelectorAll('.btn-remove-set:not(.btn-remove-warmup)').forEach(btn => {
    btn.addEventListener('click', () => {
      state.sets.splice(parseInt(btn.dataset.remove), 1);
      renderSets();
    });
  });

  container.querySelectorAll('.set-pain-slider').forEach(slider => {
    updateSetPainSliderTrack(slider, parseInt(slider.value));
    slider.addEventListener('input', (e) => {
      const idx = parseInt(slider.dataset.set);
      const val = parseInt(e.target.value);
      state.sets[idx].painLevel = val;
      const info = getPainInfo(val);
      const card = slider.closest('.set-card');
      card.querySelector('.set-pain-value').textContent = val;
      card.querySelector('.set-pain-value').className = 'set-pain-value ' + info.level;
      card.querySelector('.set-pain-feedback').textContent = info.label;
      card.querySelector('.set-pain-feedback').className = 'set-pain-feedback ' + info.level;
      updateSetPainSliderTrack(slider, val);
    });
  });
}

function getPainInfo(value) {
  if (value <= 4) return { level: 'level-low', label: '🟢 Low effort' };
  if (value <= 6) return { level: 'level-moderate', label: '🟡 Moderate' };
  if (value <= 8) return { level: 'level-optimal', label: '⚡ Optimal' };
  return { level: 'level-high', label: '🔴 High risk' };
}

function updateSetPainSliderTrack(slider, value) {
  const percent = ((value - 1) / 9) * 100;
  const colors = {
    'level-low': '#10b981', 'level-moderate': '#f59e0b',
    'level-optimal': '#f97316', 'level-high': '#ef4444'
  };
  const info = getPainInfo(value);
  const color = colors[info.level];
  slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, rgba(255,255,255,0.04) ${percent}%, rgba(255,255,255,0.04) 100%)`;
  slider.style.setProperty('--thumb-color', color);
}

/* ---------- Day Detail View ---------- */
function initDayDetail() {
  const container = document.getElementById('day-detail-content');
  const workouts = getWorkoutsByDate(state.date);

  if (workouts.length === 0) {
    container.innerHTML = `
      <div class="day-detail-date">${formatDate(state.date)}</div>
      <div class="day-detail-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <h3>No workouts logged</h3>
        <p>Start logging your training for this day.</p>
      </div>
    `;
    return;
  }

  const generalWarmupWorkout = workouts.find(w => w.bodyPart === 'warmup');
  const strengthWorkouts = workouts.filter(w => w.bodyPart !== 'warmup');

  const groups = {};
  strengthWorkouts.forEach(w => {
    const key = `${w.bodyPart}-${w.equipmentType}-${w.category || 'all'}`;
    if (!groups[key]) groups[key] = { bodyPart: w.bodyPart, equipmentType: w.equipmentType, category: w.category, items: [] };
    groups[key].items.push(w);
  });

  let html = `
    <div class="day-detail-date">${formatDate(state.date)}</div>
    <div class="day-detail-count">${workouts.length} item${workouts.length !== 1 ? 's' : ''} logged</div>
  `;

  if (generalWarmupWorkout) {
    html += `
      <div class="general-warmup-detail-card">
        <div class="general-warmup-detail-header">
          <div class="title-with-icon">
            <span class="warmup-fire">🔥</span>
            <span class="warmup-title-text">Daily Warm-up</span>
          </div>
          <button class="workout-entry-delete" data-id="${generalWarmupWorkout.id}" aria-label="Delete warm-up">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
        <div class="general-warmup-detail-content">
          ${escapeHtml(generalWarmupWorkout.details)}
        </div>
      </div>
    `;
  }

  for (const key of Object.keys(groups)) {
    const group = groups[key];
    const bodyLabel = group.bodyPart === 'upper' ? 'Upper Body' : 'Lower Body';
    const equipLabel = group.equipmentType === 'machine' ? 'Machine' : 'Free Weight';
    const catLabel = group.category ? ` (${capitalize(group.category)})` : '';

    html += `
      <div class="workout-group">
        <div class="workout-group-header">
          <span class="dot"></span>
          ${bodyLabel} — ${equipLabel}${catLabel}
        </div>
    `;

    group.items.forEach(w => {
      const hasPerSetPain = w.sets && w.sets.length > 0 && w.sets[0].painLevel !== undefined;

      html += `
        <div class="workout-entry">
          <div class="workout-entry-header">
            <span class="workout-entry-name">${escapeHtml(w.exercise)}</span>
            <button class="workout-entry-delete" data-id="${w.id}" aria-label="Delete workout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
          ${(w.warmupSets && w.warmupSets.length > 0) ? `
            <div class="workout-entry-warmup">
              <span class="warmup-tag">🔥 Warm-up</span>
              ${w.warmupSets.map((s, i) => `
                <div class="workout-set-line warmup-line">
                  <div class="workout-set-info">
                    <span class="set-label">W${i + 1}</span>
                    <span class="set-detail">${s.weight} kg × ${s.reps} reps</span>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
          <div class="workout-entry-sets">
            ${(w.sets || []).map((s, i) => {
              const setPain = hasPerSetPain ? (s.painLevel || 7) : (w.painLevel || 7);
              let painClass;
              if (setPain <= 4) painClass = 'level-low';
              else if (setPain <= 6) painClass = 'level-moderate';
              else if (setPain <= 8) painClass = 'level-optimal';
              else painClass = 'level-high';
              return `
              <div class="workout-set-line">
                <div class="workout-set-info">
                  <span class="set-label">Set ${i + 1}</span>
                  <span class="set-detail">${s.weight} kg × ${s.reps} reps</span>
                </div>
                <div class="workout-set-pain">
                  <div class="pain-bar pain-bar-mini">
                    ${Array.from({ length: 10 }, (_, j) => `
                      <div class="pain-bar-segment ${j < setPain ? 'filled ' + painClass : ''}"></div>
                    `).join('')}
                  </div>
                  <span class="set-pain-score ${painClass}">${setPain}</span>
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  container.innerHTML = html;

  container.querySelectorAll('.workout-entry-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      deleteWorkout(id);
      initDayDetail();
      showToast('Deleted', 'toast-neutral');
    });
  });
}

/* ---------- Event Listeners ---------- */
function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  document.getElementById('btn-new-workout').addEventListener('click', () => {
    state.date = getTodayStr();
    state.selectedWarmups = {};
    showView('date');
  });

  document.querySelectorAll('.btn-back[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      showView(btn.dataset.back);
    });
  });

  document.getElementById('btn-back-exercises').addEventListener('click', () => {
    if (state.bodyPart === 'upper') {
      showView('category');
    } else {
      showView('lower-category');
    }
  });

  document.getElementById('btn-today').addEventListener('click', () => {
    document.getElementById('input-date').value = getTodayStr();
    state.date = getTodayStr();
  });

  document.getElementById('btn-date-continue').addEventListener('click', () => {
    const val = document.getElementById('input-date').value;
    if (!val) {
      showToast('Please select a date', 'toast-error');
      return;
    }
    state.date = val;
    state.selectedWarmups = {};
    showView('general-warmup');
  });

  // Add Custom Warmup Activity
  document.getElementById('btn-add-custom-warmup').addEventListener('click', () => {
    const input = document.getElementById('input-custom-warmup');
    const name = input.value.trim();
    if (!name) {
      showToast('Please enter an activity name', 'toast-error');
      return;
    }
    const added = addCustomWarmup(name);
    if (added) {
      showToast('Warm-up activity added! 🔥', 'toast-success');
      input.value = '';
      state.selectedWarmups[name] = 5; // select it by default
      initGeneralWarmup();
    } else {
      showToast('Activity already exists', 'toast-error');
    }
  });

  // General Warm-up: Save & Continue
  document.getElementById('btn-warmup-continue').addEventListener('click', () => {
    const keys = Object.keys(state.selectedWarmups);
    if (keys.length > 0) {
      const formatted = keys.map(k => `${k} (${state.selectedWarmups[k]} min)`).join(', ');
      saveGeneralWarmup(formatted);
      showToast('Daily warm-up saved! 🔥', 'toast-success');
    }
    showView('body-part');
  });

  document.getElementById('btn-warmup-skip').addEventListener('click', () => {
    showView('body-part');
  });

  // Body Part selection
  document.querySelectorAll('[data-body]').forEach(card => {
    card.addEventListener('click', () => {
      state.bodyPart = card.dataset.body;
      showView('equipment');
    });
  });

  // Equipment Type selection
  document.querySelectorAll('[data-equip]').forEach(card => {
    card.addEventListener('click', () => {
      state.equipmentType = card.dataset.equip;
      if (state.bodyPart === 'upper') {
        showView('category');
      } else {
        showView('lower-category');
      }
    });
  });

  // Upper Category selection (Push / Pull / Core)
  document.querySelectorAll('[data-category]').forEach(card => {
    card.addEventListener('click', () => {
      state.category = card.dataset.category;
      showView('exercises');
    });
  });

  // Lower Category selection (Quads / Hamstrings / Glutes / Adductors / Calves)
  document.querySelectorAll('[data-lower-category]').forEach(card => {
    card.addEventListener('click', () => {
      state.category = card.dataset.lowerCategory;
      showView('exercises');
    });
  });

  document.getElementById('search-exercises').addEventListener('input', (e) => {
    renderExerciseList(e.target.value);
  });

  document.getElementById('btn-add-custom').addEventListener('click', () => {
    openModal();
  });

  document.getElementById('btn-modal-cancel').addEventListener('click', () => {
    closeModal();
  });

  document.getElementById('btn-modal-save').addEventListener('click', () => {
    const input = document.getElementById('custom-exercise-input');
    const name = input.value.trim();
    if (!name) {
      showToast('Please enter an exercise name', 'toast-error');
      return;
    }
    const key = getCustomKey(state.bodyPart, state.equipmentType, state.category);
    const added = addCustomExercise(key, name);
    if (added) {
      showToast('Exercise added!', 'toast-success');
      closeModal();
      renderExerciseList(document.getElementById('search-exercises').value);
    } else {
      showToast('Exercise already exists', 'toast-error');
    }
  });

  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.getElementById('custom-exercise-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-modal-save').click();
    }
  });

  document.getElementById('btn-add-set').addEventListener('click', () => {
    state.sets.push({ weight: '', reps: '', painLevel: 7 });
    renderSets();
  });

  document.getElementById('warmup-toggle').addEventListener('change', (e) => {
    state.showWarmup = e.target.checked;
    const content = document.getElementById('warmup-content');
    content.style.display = state.showWarmup ? 'block' : 'none';
    if (state.showWarmup && state.warmupSets.length === 0) {
      state.warmupSets.push({ weight: '', reps: '' });
    }
    renderWarmupSets();
  });

  document.getElementById('btn-add-warmup-set').addEventListener('click', () => {
    state.warmupSets.push({ weight: '', reps: '' });
    renderWarmupSets();
  });

  document.getElementById('btn-save-workout').addEventListener('click', () => {
    const validSets = state.sets.filter(s => s.weight !== '' && s.reps !== '');
    if (validSets.length === 0) {
      showToast('Please enter at least one set', 'toast-error');
      return;
    }

    const validWarmups = state.warmupSets.filter(s => s.weight !== '' && s.reps !== '');

    const workout = {
      date: state.date,
      bodyPart: state.bodyPart,
      equipmentType: state.equipmentType,
      category: state.category,
      exercise: state.exercise,
      warmupSets: validWarmups.map(s => ({
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps) || 0
      })),
      sets: validSets.map(s => ({
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps) || 0,
        painLevel: s.painLevel || 7
      }))
    };

    saveWorkout(workout);
    showToast('Workout saved! 💪', 'toast-success');
    showView('exercises');
  });

  // Day Detail: Add More Exercises -> Start from Daily Warmup
  document.getElementById('btn-add-more').addEventListener('click', () => {
    state.selectedWarmups = {};
    showView('general-warmup');
  });
}

/* ---------- Breadcrumb ---------- */
function updateBreadcrumb(elementId, crumbs) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = crumbs.map((c, i) => {
    const sep = i < crumbs.length - 1 ? '<span class="sep">›</span>' : '';
    return `<span>${escapeHtml(c.label)}</span>${sep}`;
  }).join('');
}

/* ---------- Modal ---------- */
function openModal() {
  const overlay = document.getElementById('modal-overlay');
  const input = document.getElementById('custom-exercise-input');
  overlay.classList.remove('hidden');
  input.value = '';
  setTimeout(() => input.focus(), 100);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

/* ---------- Toast ---------- */
let toastTimeout = null;
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  toast.offsetHeight;
  toast.classList.add('visible');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2500);
}

/* ---------- Utility ---------- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
