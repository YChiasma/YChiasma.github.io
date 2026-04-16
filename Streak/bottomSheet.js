import { deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { cache, setCacheEntry } from "./state.js";
import { streakRef } from "./streakData.js";
import { render } from "./ui.js";

// ── DOM refs ─────────────────────────────────────────────────────────────────

const sheet         = document.getElementById('bottomSheet');
const sheetBackdrop = document.getElementById('sheetBackdrop');
const sheetTitle    = document.getElementById('sheetTitle');
const sheetDate     = document.getElementById('sheetDate');
const sheetStatus   = document.getElementById('sheetStatus');
const sheetAction   = document.getElementById('sheetAction');

let sheetContext = null;

// ── Open / close ─────────────────────────────────────────────────────────────

export function openSheet({ streakName, dateStr, done }) {
  sheetContext = { streakName, dateStr, done };

  sheetTitle.textContent  = streakName;
  sheetDate.textContent   = new Date(dateStr).toDateString();
  sheetStatus.textContent = done ? 'Completed' : 'Not completed';
  sheetStatus.style.color = done ? '#10b981' : '#facc15';
  sheetAction.textContent = done ? 'Undo' : 'Mark done';

  sheetBackdrop.style.display = 'block';
  requestAnimationFrame(() => sheet.classList.add('open'));
}

export function closeSheet() {
  sheet.classList.remove('open');
  sheetBackdrop.style.display = 'none';
  sheetContext = null;
}

// ── Actions ──────────────────────────────────────────────────────────────────

sheetBackdrop.addEventListener('click', closeSheet);

sheetAction.addEventListener('click', async () => {
  if (!sheetContext) return;
  const { dateStr, done } = sheetContext;

  if (done) {
    await deleteDoc(streakRef(dateStr));
    setCacheEntry(dateStr, false);
  } else {
    await setDoc(streakRef(dateStr), { done: true, ts: Date.now() });
    setCacheEntry(dateStr, true);
  }

  closeSheet();
  render();
});
