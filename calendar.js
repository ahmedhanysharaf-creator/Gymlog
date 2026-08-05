/* ============================================
   GymLog — Calendar Component
   ============================================ */

class Calendar {
  constructor(container, onDateClick) {
    this.container = container;
    this.onDateClick = onDateClick;
    const now = new Date();
    this.month = now.getMonth();
    this.year = now.getFullYear();
    this.render();
  }

  render() {
    const workoutDates = getWorkoutDates();
    const monthNames = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    const dayNames = ['S','M','T','W','T','F','S'];

    const firstDayOfWeek = new Date(this.year, this.month, 1).getDay();
    const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
    const today = new Date();

    let html = `
      <div class="calendar">
        <div class="calendar-header">
          <button class="cal-nav" id="cal-prev" aria-label="Previous month">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <h2 class="cal-title">${monthNames[this.month]} ${this.year}</h2>
          <button class="cal-nav" id="cal-next" aria-label="Next month">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
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

      // Count workouts for intensity indicator
      const workoutsOnDay = hasWorkout ? getWorkoutsByDate(dateStr).length : 0;
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

    // Attach listeners
    this.container.querySelector('#cal-prev').addEventListener('click', () => this.prev());
    this.container.querySelector('#cal-next').addEventListener('click', () => this.next());

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
    this.month--;
    if (this.month < 0) { this.month = 11; this.year--; }
    this.render();
  }

  next() {
    this.month++;
    if (this.month > 11) { this.month = 0; this.year++; }
    this.render();
  }

  refresh() {
    this.render();
  }
}
