import {
  auth,
  onAuthStateChanged,
  signInAnonymously
} from "./firebaseService.js";

import {
  toggleDay,
  loadMonth,
  isDone,
  resetCache
} from "./streakService.js";

let userId = null;
let currentStreak = "default";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await signInAnonymously(auth);
    return;
  }

  userId = user.uid;
  init();
});

async function init() {
  await loadMonth(userId, currentStreak, 2026, 3);
  render();
}

async function handleClick(dateStr) {
  await toggleDay(userId, currentStreak, dateStr);
  render();
}

async function render() {
  console.log("Render with cached data");
}

// Example usage:
// handleClick("2026-03-27");
