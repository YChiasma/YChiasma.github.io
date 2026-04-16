import {
  userId, publicMode,
  viewYear, viewMonth, setViewYear, setViewMonth,
  cache, prevStats, setPrevStats,
  currentStreakName, currentStreakDisplayName,
} from "./state.js";
import { uidDate, getMonthInfo } from "./dateUtils.js";
import { toggleDay } from "./streakData.js";
import { loadMonthRange } from "./streakData.js";
import { openSheet } from "./bottomSheet.js";

// ── Number animation ─────────────────────────────────────────────────────────

export function animateNumber(el, from, to, duration = 500) {
  const start        = performance.now();
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  function step(time) {
    const t = Math.min((time - start) / duration, 1);
    el.textContent = Math.floor(from + (to - from) * easeOutCubic(t));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── View / navigation ────────────────────────────────────────────────────────

export function setView(y, m) {
  setViewYear(y);
  setViewMonth(m);
  loadMonthRange(y, m);

  const isToday  = y === new Date().getFullYear() && m === new Date().getMonth();
  const sticky   = document.getElementById('stickyToday');
  if (sticky) sticky.style.opacity = isToday ? '0.4' : '1';
}

// ── Stats panel ──────────────────────────────────────────────────────────────

export function updateStats() {
  const keys    = Object.keys(cache).filter(k => cache[k]).sort();
  const total   = keys.length;
  let longest   = 0, running = 0, prev = null;

  for (const k of keys) {
    const [y, m, d] = k.split('-').map(Number);
    const dt        = new Date(y, m - 1, d);
    if (!prev) {
      running = 1;
    } else {
      const diff = (dt - prev) / (1000 * 60 * 60 * 24);
      running    = diff === 1 ? running + 1 : 1;
    }
    if (running > longest) longest = running;
    prev = dt;
  }

  let cur = 0, t = new Date();
  while (cache[uidDate(t)]) { cur++; t.setDate(t.getDate() - 1); }

  const panel = document.getElementById('statsPanel');
  panel.classList.remove('fadeInUp');
  void panel.offsetWidth;
  panel.classList.add('fadeInUp');

  animateNumber(document.getElementById('currentStreak'), prevStats.current, cur);
  animateNumber(document.getElementById('longestStreak'), prevStats.longest, longest);
  animateNumber(document.getElementById('totalMarked'),   prevStats.total,   total);
  setPrevStats({ current: cur, longest, total });
}

// ── Today highlight ──────────────────────────────────────────────────────────

export function highlightToday() {
  const today = new Date();
  if (today.getFullYear() !== viewYear || today.getMonth() !== viewMonth) return;

  document.querySelectorAll('#daysGrid .day').forEach(day => {
    if (day.textContent == today.getDate().toString()) {
      day.classList.add('pulse');
      day.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => day.classList.remove('pulse'), 400);
    }
  });
}

// ── Summary pill (mobile) ────────────────────────────────────────────────────

export function getTodayStatusInfo() {
  const todayStr = uidDate(new Date());

  if (cache[todayStr]) return { status: "done",   text: "🔥 Streak active · Done today" };

  const doneDays = Object.keys(cache).filter(k => cache[k]).sort();
  if (!doneDays.length) return { status: "undone", text: "⏳ Not done today" };

  const last = new Date(doneDays[doneDays.length - 1]);
  const diff = Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));

  return diff === 1
    ? { status: "undone", text: "⏳ Not done today" }
    : { status: "broken", text: `💔 Streak broken · ${diff} days ago` };
}

export function renderSummaryPill() {
  const pill = document.getElementById("summaryPill");
  if (!pill || window.innerWidth > 720) return;

  const info      = getTodayStatusInfo();
  pill.className  = `summary-pill ${info.status}`;
  pill.textContent = info.text;
  pill.style.display = "flex";

  pill.onclick = () => {
    const todayStr = uidDate(new Date());
    openSheet({
      streakName: currentStreakDisplayName || currentStreakName,
      dateStr:    todayStr,
      done:       !!cache[todayStr],
    });
  };
}

// ── Main render ──────────────────────────────────────────────────────────────

export async function render() {
  if (!userId && !publicMode) return;

  const daysGrid = document.getElementById('daysGrid');
  const { firstDayIndex, days } = getMonthInfo(viewYear, viewMonth);
  const monName = new Date(viewYear, viewMonth, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  document.getElementById('monthTitle').textContent  = monName;
  document.getElementById('rangeLabel').textContent  = `Viewing ${monName}`;
  daysGrid.innerHTML = '';

  // Blank cells before the first day
  for (let i = 0; i < firstDayIndex; i++) {
    const el = document.createElement('div');
    el.className = 'day inactive';
    daysGrid.appendChild(el);
  }

  const today = new Date();

  for (let d = 1; d <= days; d++) {
    const date = new Date(viewYear, viewMonth, d);
    const id   = uidDate(date);
    const el   = document.createElement('button');
    el.className = 'day';
    el.innerHTML = `<div class="n">${d}</div>`;

    if (cache[id]) el.setAttribute('data-state', 'done');

    if (!publicMode) {
      el.addEventListener('click', () => {
        const done = !!cache[id];
        if (window.innerWidth <= 720) {
          openSheet({ streakName: currentStreakDisplayName || currentStreakName, dateStr: id, done });
        } else {
          toggleDay(id);
        }
      });
    }

    if (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth()    === today.getMonth()    &&
      d                  === today.getDate()
    ) {
      el.dataset.today = "true";
    }

    daysGrid.appendChild(el);
  }

  daysGrid.classList.remove('fadeInUp');
  void daysGrid.offsetWidth;
  daysGrid.classList.add('fadeInUp');

  updateStats();
  document.getElementById('loadingOverlay').style.display = 'none';
  highlightToday();
  renderSummaryPill();
}
