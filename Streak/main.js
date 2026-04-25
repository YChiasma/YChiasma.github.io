// main.js — wires up global event listeners and boots the app.
// Import order matters: firebase must be first (sets up auth persistence).

import "./firebase.js";
import "./auth.js";        // registers onAuthStateChanged → authenticate()

import { publicStreak }                             from "./state.js";
import { markDone }                                 from "./streakData.js";
import { setView }                                  from "./ui.js";
import { doc, deleteDoc }                                from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { streakRef }                                from "./streakData.js";
import { cache, setCacheEntry }                     from "./state.js";
import { render }                                   from "./ui.js";
import { setCurrentStreakName, loadStreak, loadStreakList, createStreak, renameStreak, togglePublic, syncPublicCheckbox } from "./streakManager.js";
import { userId, currentStreakName, viewYear, viewMonth } from "./state.js";

// ── Get display name ─────────────────────────────────────────────────────────

    let displayName = undefined;
    
    async function getUserInfo(userId) {
      const userDocRef = doc(db, "users", userId);
      const userSnap = await getDoc(userDocRef);
      if(userSnap.exists()) {
        const data = userSnap.data();
        if(data.displayName) {
          displayName = data.displayName;
          document.getElementById("userDisplayName").textContent = displayName;
        }
      }
    }

getUserInfo(userId);

// ── Mark done button ─────────────────────────────────────────────────────────

document.getElementById("markDoneBtn").addEventListener("click", markDone);

// ── Month navigation ─────────────────────────────────────────────────────────

document.getElementById('prevMonth').addEventListener('click', () => {
  const dt = new Date(viewYear, viewMonth - 1, 1);
  setView(dt.getFullYear(), dt.getMonth());
});

document.getElementById('nextMonth').addEventListener('click', () => {
  const dt = new Date(viewYear, viewMonth + 1, 1);
  setView(dt.getFullYear(), dt.getMonth());
});

document.getElementById('todayBtn').addEventListener('click', () => {
  const t = new Date();
  setView(t.getFullYear(), t.getMonth());
});

document.getElementById('stickyToday').addEventListener('click', () => {
  document.getElementById('todayBtn').click();
});

// ── Clear all ────────────────────────────────────────────────────────────────

document.getElementById('clearBtn').addEventListener('click', async () => {
  if (!confirm('Clear all streaks?')) return;
  for (const k of Object.keys(cache)) {
    if (cache[k]) {
      await deleteDoc(streakRef(k));
      setCacheEntry(k, false);
    }
  }
  render();
});

// ── Streak selector ──────────────────────────────────────────────────────────

document.getElementById('streakSelect').addEventListener('change', e => {
  loadStreak(e.target.value);
});

document.getElementById("newStreakBtn").addEventListener("click", createStreak);
document.getElementById("renameBtn").addEventListener("click",   renameStreak);

// ── Public toggle / share ────────────────────────────────────────────────────

const publicToggle = document.getElementById("publicToggle");

publicToggle.addEventListener("click", () => {
  togglePublic(currentStreakName, publicToggle.checked);
});

publicToggle.addEventListener("change", e => {
  document.getElementById("shareLinkBtn").style.display = e.target.checked ? "inline-block" : "none";
});

document.getElementById("shareLinkBtn").addEventListener("click", async () => {
  const link = `${window.location}?user=${userId}&streak=${encodeURIComponent(currentStreakName)}`;
  await navigator.clipboard.writeText(link);
  alert("Share link copied to clipboard!");
});

// ── Swipe navigation (mobile) ────────────────────────────────────────────────

let startX = null;

document.querySelector(".month-card").addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
});

document.querySelector(".month-card").addEventListener("touchend", e => {
  if (startX === null) return;
  const diff = e.changedTouches[0].clientX - startX;
  if (Math.abs(diff) > 50) {
    diff > 0
      ? document.getElementById("prevMonth").click()
      : document.getElementById("nextMonth").click();
  }
  startX = null;
});

// ── Bootstrap (public streak pre-selection) ──────────────────────────────────

if (publicStreak) setCurrentStreakName(publicStreak);
