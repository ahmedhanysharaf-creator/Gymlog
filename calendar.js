/* ============================================
   GymLog — Calendar Component (Week & Month)
   ============================================ */

class Calendar {
  constructor(container, onDateClick) {
    this.container = container;
    this.onDateClick = onDateClick;
    const now = new Date();
    this.currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.selectedDate = this.formatDateIso(now);
    this.month = now.getMonth();
    this.year = now.getFullYear();
    // Default to 'week' view as requested
    this.mode = localStorage.getItem('gymlog_cal_view') || 'week';
    this.render();
  }

  setMode(mode) {
    this.mode = mode;
    localStorage.setItem('gymlog_cal_view', mode);
    this.render();
  }

  getWeekStart(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = d.getDay(); // 0 is Sunday
    d.setDate(d.getDate() - day);
    return d;
  }

  formatDateIso(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  formatDateNice(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  render() {
    if (this.mode === 'week') {
      this.renderWeekView();
    } else {
      this.renderMonthView();
    }
  }

  renderWeekView() {
    const today = new Date();
    const todayIso = this.formatDateIso(today);

    const weekStart = this.getWeekStart(this.currentDate);
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weekDays.push(d);
    }

    const weekEnd = weekDays[6];
    const weekDaysIso = weekDays.map(d => this.formatDateIso(d));

    // Ensure selectedDate is valid within current week, defaulting to today or first day
    if (!weekDaysIso.includes(this.selectedDate)) {
      if (weekDaysIso.includes(todayIso)) {
        this.selectedDate = todayIso;
      } else {
        this.selectedDate = weekDaysIso[0];
      }
    }

    const monthNamesShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    let title = '';
    if (weekStart.getFullYear() !== weekEnd.getFullYear()) {
      title = `${monthNamesShort[weekStart.getMonth()]} ${weekStart.getDate()}, ${weekStart.getFullYear()} – ${monthNamesShort[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
    } else if (weekStart.getMonth() !== weekEnd.getMonth()) {
      title = `${monthNamesShort[weekStart.getMonth()]} ${weekStart.getDate()} – ${monthNamesShort[weekEnd.getMonth()]} ${weekEnd.getDate()}`;
    } else {
      title = `${monthNamesShort[weekStart.getMonth()]} ${weekStart.getDate()} – ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
    }

    // Workouts for currently selected day
    const selectedWorkouts = typeof getWorkoutsByDate === 'function' ? getWorkoutsByDate(this.selectedDate) : [];
    const isSelToday = this.selectedDate === todayIso;

    let html = `
      <div class="calendar calendar-week-mode">
        <div class="calendar-header">
          <div class="cal-nav-wrapper">
            <button class="cal-nav" id="cal-prev" aria-label="Previous week">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <h2 class="cal-title">${title}</h2>
            <button class="cal-nav" id="cal-next" aria-label="Next week">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
          <div class="cal-actions">
            <div class="cal-view-toggle">
              <button class="cal-toggle-btn active" id="toggle-week">Week</button>
              <button class="cal-toggle-btn" id="toggle-month">Month</button>
            </div>
          </div>
        </div>

        <!-- 7-Day Week Columns -->
        <div class="week-calendar-grid">
    `;

    weekDays.forEach((d, idx) => {
      const dateIso = this.formatDateIso(d);
      const isToday = dateIso === todayIso;
      const isSelected = dateIso === this.selectedDate;
      const workouts = typeof getWorkoutsByDate === 'function' ? getWorkoutsByDate(dateIso) : [];
      const hasWorkout = workouts.length > 0;

      let intensityClass = '';
      if (workouts.length >= 5) intensityClass = 'intensity-high';
      else if (workouts.length >= 3) intensityClass = 'intensity-med';
      else if (workouts.length >= 1) intensityClass = 'intensity-low';

      let classes = 'cal-week-cell';
      if (isToday) classes += ' today';
      if (isSelected) classes += ' selected';
      if (hasWorkout) classes += ' has-workout ' + intensityClass;

      html += `
        <div class="${classes}" data-date="${dateIso}" role="button" tabindex="0" title="Click to view workouts for ${dayLabels[idx]} ${d.getDate()}">
          <span class="cal-week-day-name">${dayLabels[idx]}</span>
          <span class="cal-week-day-num">${d.getDate()}</span>
          
          <div class="cal-week-cell-workouts">
            ${workouts.length === 0 ? '<span class="cal-rest">Rest</span>' : `
              <div class="cal-day-chips">
                ${workouts.slice(0, 2).map(w => {
                  const label = w.bodyPart === 'warmup' ? 'Warmup' : (w.exercise || 'Workout');
                  return `<span class="cal-chip" title="${this.escapeHtml(label)}">${this.escapeHtml(label)}</span>`;
                }).join('')}
                ${workouts.length > 2 ? `<span class="cal-chip-more">+${workouts.length - 2}</span>` : ''}
              </div>
            `}
          </div>
        </div>
      `;
    });

    html += `
        </div>

        <!-- Selected Day Workouts List (Under the week strip) -->
        <div class="cal-selected-day-container">
          <div class="cal-selected-day-header">
            <div class="cal-selected-day-title">
              <h3>${this.formatDateNice(this.selectedDate)}</h3>
              ${isSelToday ? '<span class="cal-selected-day-badge">Today</span>' : ''}
              ${selectedWorkouts.length > 0 ? `<span class="cal-count-badge">${selectedWorkouts.length} ${selectedWorkouts.length === 1 ? 'exercise' : 'exercises'}</span>` : ''}
            </div>
            <button class="cal-open-day-btn" id="btn-open-selected-day">
              ${selectedWorkouts.length > 0 ? 'Full Day View' : '+ Log Workout'}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          <div class="cal-selected-day-body">
            ${selectedWorkouts.length === 0 ? `
              <div class="cal-empty-workouts" id="btn-empty-add-workout" role="button" tabindex="0">
                <span class="cal-empty-icon">☕</span>
                <p class="cal-empty-text">No workouts logged on this day</p>
                <span class="cal-quick-link">+ Click to log an exercise</span>
              </div>
            ` : `
              <div class="cal-day-workouts-list">
                ${selectedWorkouts.map(w => {
                  const isWarmup = w.bodyPart === 'warmup';
                  const title = isWarmup ? (w.details || 'General Warm-up') : w.exercise;
                  const setsCount = w.sets ? w.sets.length : 0;
                  
                  // Summary string of sets
                  let setsSummary = '';
                  if (w.sets && w.sets.length > 0) {
                    setsSummary = w.sets.map((s, sIdx) => {
                      if (s.distance !== undefined || s.time !== undefined) {
                        const parts = [];
                        if (s.distance) parts.push(`${s.distance}m`);
                        if (s.time) parts.push(`${s.time}s`);
                        return parts.join(' × ');
                      }
                      return `${s.weight}kg × ${s.reps}`;
                    }).slice(0, 3).join(' • ') + (w.sets.length > 3 ? ` (+${w.sets.length - 3} more)` : '');
                  }

                  let subcategoryText = '';
                  if (isWarmup) {
                    subcategoryText = 'Daily General Warm-up';
                  } else {
                    const bp = w.bodyPart === 'upper' ? 'Upper Body' : 'Lower Body';
                    const eq = w.equipmentType === 'machine' ? 'Machine' : 'Free Weight';
                    const cat = w.category ? ` • ${w.category}` : '';
                    subcategoryText = `${bp} • ${eq}${cat}`;
                  }

                  return `
                    <div class="cal-day-workout-card" data-date="${this.selectedDate}" role="button" tabindex="0">
                      <div class="cal-dw-left">
                        <span class="cal-dw-icon">${isWarmup ? '🔥' : '🏋️'}</span>
                        <div class="cal-dw-info">
                          <h4 class="cal-dw-name">${this.escapeHtml(title)}</h4>
                          <p class="cal-dw-sub">${this.escapeHtml(subcategoryText)}</p>
                          ${setsSummary ? `<p class="cal-dw-sets">${this.escapeHtml(setsSummary)}</p>` : ''}
                        </div>
                      </div>
                      <div class="cal-dw-right">
                        ${setsCount > 0 ? `<span class="cal-dw-badge">${setsCount} ${setsCount === 1 ? 'set' : 'sets'}</span>` : ''}
                        <svg class="cal-dw-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachWeekListeners();
  }

  renderMonthView() {
    const workoutDates = typeof getWorkoutDates === 'function' ? getWorkoutDates() : [];
    const monthNames = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    const dayNames = ['S','M','T','W','T','F','S'];

    const firstDayOfWeek = new Date(this.year, this.month, 1).getDay();
    const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
    const today = new Date();

    let html = `
      <div class="calendar calendar-month-mode">
        <div class="calendar-header">
          <div class="cal-nav-wrapper">
            <button class="cal-nav" id="cal-prev" aria-label="Previous month">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <h2 class="cal-title">${monthNames[this.month]} ${this.year}</h2>
            <button class="cal-nav" id="cal-next" aria-label="Next month">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
          <div class="cal-actions">
            <div class="cal-view-toggle">
              <button class="cal-toggle-btn" id="toggle-week">Week</button>
              <button class="cal-toggle-btn active" id="toggle-month">Month</button>
            </div>
          </div>
        </div>
        <div class="calendar-day-names">
          ${dayNames.map(d => `<span>${d}</span>`).join('')}
        </div>
        <div class="calendar-grid">
    `;

    // Empty cells before the first day
    for (let i = 0; i < firstDayOfWeek; i++) {
      html += `<div class="cal-cell empty"></div>`;
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${this.year}-${String(this.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday =
        day === today.getDate() &&
        this.month === today.getMonth() &&
        this.year === today.getFullYear();
      const hasWorkout = workoutDates.includes(dateStr);

      const workoutsOnDay = hasWorkout && typeof getWorkoutsByDate === 'function' ? getWorkoutsByDate(dateStr).length : 0;
      let intensityClass = '';
      if (workoutsOnDay >= 5) intensityClass = 'intensity-high';
      else if (workoutsOnDay >= 3) intensityClass = 'intensity-med';
      else if (workoutsOnDay >= 1) intensityClass = 'intensity-low';

      let classes = 'cal-cell';
      if (isToday) classes += ' today';
      if (hasWorkout) classes += ' has-workout ' + intensityClass;

      html += `
        <div class="${classes}" data-date="${dateStr}" role="button" tabindex="0">
          <span class="cal-day-num">${day}</span>
          ${hasWorkout ? '<span class="cal-dot"></span>' : ''}
        </div>
      `;
    }

    html += `</div></div>`;
    this.container.innerHTML = html;
    this.attachMonthListeners();
  }

  attachWeekListeners() {
    this.container.querySelector('#cal-prev').addEventListener('click', () => this.prev());
    this.container.querySelector('#cal-next').addEventListener('click', () => this.next());
    this.container.querySelector('#toggle-week').addEventListener('click', () => this.setMode('week'));
    this.container.querySelector('#toggle-month').addEventListener('click', () => this.setMode('month'));

    // Clicking a day cell selects it to show its workouts underneath
    this.container.querySelectorAll('.cal-week-cell').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedDate = el.dataset.date;
        this.render();
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectedDate = el.dataset.date;
          this.render();
        }
      });
    });

    // Button to open full Day Detail view
    const btnOpenDay = this.container.querySelector('#btn-open-selected-day');
    if (btnOpenDay) {
      btnOpenDay.addEventListener('click', () => {
        if (this.onDateClick) this.onDateClick(this.selectedDate);
      });
    }

    // Quick add button on empty day
    const btnEmptyAdd = this.container.querySelector('#btn-empty-add-workout');
    if (btnEmptyAdd) {
      btnEmptyAdd.addEventListener('click', () => {
        if (this.onDateClick) this.onDateClick(this.selectedDate);
      });
    }

    // Clicking any workout card opens the day view
    this.container.querySelectorAll('.cal-day-workout-card').forEach(card => {
      card.addEventListener('click', () => {
        if (this.onDateClick) this.onDateClick(this.selectedDate);
      });
    });
  }

  attachMonthListeners() {
    this.container.querySelector('#cal-prev').addEventListener('click', () => this.prev());
    this.container.querySelector('#cal-next').addEventListener('click', () => this.next());
    this.container.querySelector('#toggle-week').addEventListener('click', () => this.setMode('week'));
    this.container.querySelector('#toggle-month').addEventListener('click', () => this.setMode('month'));

    this.container.querySelectorAll('.cal-cell:not(.empty)').forEach(el => {
      el.addEventListener('click', () => {
        if (this.onDateClick) this.onDateClick(el.dataset.date);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (this.onDateClick) this.onDateClick(el.dataset.date);
        }
      });
    });
  }

  prev() {
    if (this.mode === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() - 7);
      this.month = this.currentDate.getMonth();
      this.year = this.currentDate.getFullYear();
    } else {
      this.month--;
      if (this.month < 0) { this.month = 11; this.year--; }
      this.currentDate = new Date(this.year, this.month, 1);
    }
    this.render();
  }

  next() {
    if (this.mode === 'week') {
      this.currentDate.setDate(this.currentDate.getDate() + 7);
      this.month = this.currentDate.getMonth();
      this.year = this.currentDate.getFullYear();
    } else {
      this.month++;
      if (this.month > 11) { this.month = 0; this.year++; }
      this.currentDate = new Date(this.year, this.month, 1);
    }
    this.render();
  }

  refresh() {
    this.render();
  }
}
