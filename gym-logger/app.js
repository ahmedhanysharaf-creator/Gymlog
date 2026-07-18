/* ============================================
   GymLog — Main Application Logic
   ============================================ */

/* ---------- Application State ---------- */
const state = {
  date: null,
  bodyPart: null,       // 'upper' | 'lower'
  equipmentType: null,  // 'machine' | 'freeweight'
  category: null,       // 'push' | 'pull' | 'core' (upper machine only)
  exercise: null,
  sets: [],             // [{ weight: '', reps: '' }, ...]
  painLevel: 7
};

let calendarInstance = null;

/* ---------- Authentication ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Attach auth UI listeners immediately
  attachAuthListeners();

  // Listen for auth state changes
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      // User is signed in — show loading, init data, then show home
      showView('loading');
      await initDataLayer(user.uid);
      showView('home');
      attachListeners();
      updateUserInfo(user);
    } else {
      // User is signed out — show login
      teardownDataLayer();
      showView('login');
    }
  });
});

function attachAuthListeners() {
  // Google Sign-In button
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
          // Fallback to redirect for mobile or popup-blocked browsers
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

  // Sign-Out button
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
  if (nameEl) {
    nameEl.textContent = user.displayName || user.email || 'User';
  }
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

  // Re-trigger animation
  view.style.animation = 'none';
  view.offsetHeight; // force reflow
  view.style.animation = '';

  view.classList.add('active');

  // View-specific initialization
  switch (name) {
    case 'home':
      initHome();
      break;
    case 'date':
      initDate();
      break;
    case 'body-part':
      updateBreadcrumb('breadcrumb-body-part', [{ label: formatDate(state.date) }]);
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
        { label: 'Machine' }
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

  // Scroll to top
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

/* ---------- Exercises View ---------- */
function initExercises() {
  const searchInput = document.getElementById('search-exercises');
  searchInput.value = '';

  // Build breadcrumb
  const crumbs = [{ label: formatDate(state.date) }];
  crumbs.push({ label: state.bodyPart === 'upper' ? 'Upper Body' : 'Lower Body' });
  crumbs.push({ label: state.equipmentType === 'machine' ? 'Machine' : 'Free Weight' });
  if (state.bodyPart === 'upper' && state.equipmentType === 'machine' && state.category) {
    crumbs.push({ label: capitalize(state.category) });
  }
  updateBreadcrumb('breadcrumb-exercises', crumbs);

  // Title
  let title = 'Exercises';
  if (state.bodyPart === 'upper' && state.equipmentType === 'machine' && state.category) {
    title = capitalize(state.category) + ' Exercises';
  }
  document.getElementById('exercises-title').textContent = title;

  renderExerciseList('');

  // Show/hide add custom button (always visible for free weight, also for machine)
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

  // Attach click handlers
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

  // Build breadcrumb
  const crumbs = [{ label: formatDate(state.date) }];
  crumbs.push({ label: state.bodyPart === 'upper' ? 'Upper Body' : 'Lower Body' });
  crumbs.push({ label: state.equipmentType === 'machine' ? 'Machine' : 'Free Weight' });
  if (state.bodyPart === 'upper' && state.equipmentType === 'machine' && state.category) {
    crumbs.push({ label: capitalize(state.category) });
  }
  crumbs.push({ label: state.exercise });
  updateBreadcrumb('breadcrumb-log', crumbs);

  // Initialize sets (start with 1 empty set)
  state.sets = [{ weight: '', reps: '' }];
  renderSets();

  // Reset pain level
  state.painLevel = 7;
  const slider = document.getElementById('pain-slider');
  slider.value = 7;
  updatePainUI(7);
}

function renderSets() {
  const container = document.getElementById('sets-list');
  container.innerHTML = state.sets.map((set, i) => `
    <div class="set-row" data-index="${i}">
      <div class="set-number">${i + 1}</div>
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
      ${state.sets.length > 1 ? `
        <button class="btn-remove-set" data-remove="${i}" aria-label="Remove set">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      ` : ''}
    </div>
  `).join('');

  // Attach listeners for set inputs
  container.querySelectorAll('.set-weight').forEach((input, i) => {
    input.addEventListener('input', () => {
      state.sets[i].weight = input.value;
    });
  });
  container.querySelectorAll('.set-reps').forEach((input, i) => {
    input.addEventListener('input', () => {
      state.sets[i].reps = input.value;
    });
  });
  container.querySelectorAll('.btn-remove-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.remove);
      state.sets.splice(idx, 1);
      renderSets();
    });
  });
}

function updatePainUI(value) {
  const display = document.getElementById('pain-value');
  const feedback = document.getElementById('pain-feedback');
  const slider = document.getElementById('pain-slider');

  display.textContent = value;

  // Determine level
  let level, label;
  if (value <= 4) {
    level = 'level-low';
    label = '🟢 Low effort — could push harder';
  } else if (value <= 6) {
    level = 'level-moderate';
    label = '🟡 Moderate — decent intensity';
  } else if (value <= 8) {
    level = 'level-optimal';
    label = '⚡ Optimal for hypertrophy';
  } else {
    level = 'level-high';
    label = '🔴 High risk — watch for injury';
  }

  // Update classes
  display.className = 'pain-value ' + level;
  feedback.className = 'pain-feedback ' + level;
  feedback.textContent = label;

  // Update slider track color
  const percent = ((value - 1) / 9) * 100;
  const colors = {
    'level-low': '#10b981',
    'level-moderate': '#f59e0b',
    'level-optimal': '#f97316',
    'level-high': '#ef4444'
  };
  const color = colors[level];
  slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, rgba(255,255,255,0.04) ${percent}%, rgba(255,255,255,0.04) 100%)`;

  // Update thumb border color
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

  // Group workouts by bodyPart + equipmentType
  const groups = {};
  workouts.forEach(w => {
    const key = `${w.bodyPart}-${w.equipmentType}`;
    if (!groups[key]) groups[key] = { bodyPart: w.bodyPart, equipmentType: w.equipmentType, items: [] };
    groups[key].items.push(w);
  });

  let html = `
    <div class="day-detail-date">${formatDate(state.date)}</div>
    <div class="day-detail-count">${workouts.length} exercise${workouts.length !== 1 ? 's' : ''} logged</div>
  `;

  for (const key of Object.keys(groups)) {
    const group = groups[key];
    const bodyLabel = group.bodyPart === 'upper' ? 'Upper Body' : 'Lower Body';
    const equipLabel = group.equipmentType === 'machine' ? 'Machine' : 'Free Weight';

    html += `
      <div class="workout-group">
        <div class="workout-group-header">
          <span class="dot"></span>
          ${bodyLabel} — ${equipLabel}
        </div>
    `;

    group.items.forEach(w => {
      const painLevel = w.painLevel || 0;
      let painClass;
      if (painLevel <= 4) painClass = 'level-low';
      else if (painLevel <= 6) painClass = 'level-moderate';
      else if (painLevel <= 8) painClass = 'level-optimal';
      else painClass = 'level-high';

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
          <div class="workout-entry-sets">
            ${(w.sets || []).map((s, i) => `
              <div class="workout-set-line">
                <span class="set-label">Set ${i + 1}</span>
                <span class="set-detail">${s.weight} kg × ${s.reps} reps</span>
              </div>
            `).join('')}
          </div>
          <div class="workout-entry-pain">
            <span class="pain-label">Pain</span>
            <div class="pain-bar">
              ${Array.from({ length: 10 }, (_, i) => `
                <div class="pain-bar-segment ${i < painLevel ? 'filled ' + painClass : ''}"></div>
              `).join('')}
            </div>
            <span style="font-weight:600;font-size:0.8rem;">${painLevel}/10</span>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  container.innerHTML = html;

  // Delete handlers
  container.querySelectorAll('.workout-entry-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (confirm('Delete this exercise log?')) {
        deleteWorkout(id);
        showToast('Exercise deleted', 'toast-success');
        initDayDetail();
        // Refresh calendar if we navigated from home
        if (calendarInstance) calendarInstance.refresh();
      }
    });
  });
}

/* ---------- Event Listeners ---------- */
let listenersAttached = false;

function attachListeners() {
  // Prevent duplicate listeners on re-auth
  if (listenersAttached) return;
  listenersAttached = true;

  // New Workout FAB
  document.getElementById('btn-new-workout').addEventListener('click', () => {
    state.date = getTodayStr();
    showView('date');
  });

  // Back buttons (data-back attribute)
  document.querySelectorAll('.btn-back[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      showView(btn.dataset.back);
    });
  });

  // Back button for exercises (dynamic target)
  document.getElementById('btn-back-exercises').addEventListener('click', () => {
    if (state.bodyPart === 'upper' && state.equipmentType === 'machine') {
      showView('category');
    } else {
      showView('equipment');
    }
  });

  // Date: Today button
  document.getElementById('btn-today').addEventListener('click', () => {
    document.getElementById('input-date').value = getTodayStr();
    state.date = getTodayStr();
  });

  // Date: Continue
  document.getElementById('btn-date-continue').addEventListener('click', () => {
    const val = document.getElementById('input-date').value;
    if (!val) {
      showToast('Please select a date', 'toast-error');
      return;
    }
    state.date = val;
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
      // If upper body + machine → show category. Otherwise → show exercises directly
      if (state.bodyPart === 'upper' && state.equipmentType === 'machine') {
        showView('category');
      } else {
        state.category = null;
        showView('exercises');
      }
    });
  });

  // Category selection
  document.querySelectorAll('[data-category]').forEach(card => {
    card.addEventListener('click', () => {
      state.category = card.dataset.category;
      showView('exercises');
    });
  });

  // Search exercises
  document.getElementById('search-exercises').addEventListener('input', (e) => {
    renderExerciseList(e.target.value);
  });

  // Add custom exercise
  document.getElementById('btn-add-custom').addEventListener('click', () => {
    openModal();
  });

  // Modal: Cancel
  document.getElementById('btn-modal-cancel').addEventListener('click', () => {
    closeModal();
  });

  // Modal: Save
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

  // Modal: Close on overlay click
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Modal: Enter key to save
  document.getElementById('custom-exercise-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-modal-save').click();
    }
  });

  // Add Set
  document.getElementById('btn-add-set').addEventListener('click', () => {
    state.sets.push({ weight: '', reps: '' });
    renderSets();
  });

  // Pain slider
  document.getElementById('pain-slider').addEventListener('input', (e) => {
    state.painLevel = parseInt(e.target.value);
    updatePainUI(state.painLevel);
  });

  // Save Workout
  document.getElementById('btn-save-workout').addEventListener('click', () => {
    // Validate
    const validSets = state.sets.filter(s => s.weight !== '' && s.reps !== '');
    if (validSets.length === 0) {
      showToast('Please enter at least one set', 'toast-error');
      return;
    }

    const workout = {
      date: state.date,
      bodyPart: state.bodyPart,
      equipmentType: state.equipmentType,
      category: state.category,
      exercise: state.exercise,
      sets: validSets.map(s => ({
        weight: parseFloat(s.weight) || 0,
        reps: parseInt(s.reps) || 0
      })),
      painLevel: state.painLevel
    };

    saveWorkout(workout);
    showToast('Workout saved! 💪', 'toast-success');

    // Go back to exercise list so user can log more
    showView('exercises');
  });

  // Add More (Day Detail)
  document.getElementById('btn-add-more').addEventListener('click', () => {
    // Date is already set from the day detail view
    showView('body-part');
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

  // Force reflow to restart animation
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
