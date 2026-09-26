/* ============================================
   GymLog — Calendar Component (Week & Month)
   ============================================ */

class Calendar {
  constructor(container, onDateClick) {
    this.container = container;
    this.onDateClick = onDateClick;
    const now = new Date();
    this.currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

        <div class="week-calendar-grid">
    `;

    weekDays.forEach((d, idx) => {
      const dateIso = this.formatDateIso(d);
      const isToday = dateIso === todayIso;
      const workouts = typeof getWorkoutsByDate === 'function' ? getWorkoutsByDate(dateIso) : [];
      const hasWorkout = workouts.length > 0;

      let intensityClass = '';
      if (workouts.length >= 5) intensityClass = 'intensity-high';
      else if (workouts.length >= 3) intensityClass = 'intensity-med';
      else if (workouts.length >= 1) intensityClass = 'intensity-low';

      let classes = 'cal-week-cell';
      if (isToday) classes += ' today';
      if (hasWorkout) classes += ' has-workout ' + intensityClass;

      html += `
        <div class="${classes}" data-date="${dateIso}" role="button" tabindex="0">
          <span class="cal-week-day-name">${dayLabels[idx]}</span>
          <span class="cal-week-day-num">${d.getDate()}</span>
          <div class="cal-week-status">
            ${hasWorkout ? `<span class="cal-badge">${workouts.length} ${workouts.length === 1 ? 'log' : 'logs'}</span>` : '<span class="cal-rest">Rest</span>'}
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
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

    this.container.querySelectorAll('.cal-week-cell').forEach(el => {
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

  today() {
    const now = new Date();
    this.currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.month = now.getMonth();
    this.year = now.getFullYear();
    this.render();
  }

  refresh() {
    this.render();
  }
}
