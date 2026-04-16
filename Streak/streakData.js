import { doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs }
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { db } from "./firebase.js";
import {
  userId, publicUser, publicStreak,
  currentStreakName, publicMode,
  cache, setCacheEntry, setCache,
} from "./state.js";
import { render } from "./ui.js";

// ── Reference helpers ───────────────────────────────────────────────────────

export function streakRef(dateStr) {
  const uid  = userId ?? publicUser;
  const name = currentStreakName ?? publicStreak;
  return doc(db, "users", uid, "streaks", name, "days", dateStr);
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function isDone(dateStr) {
  if (dateStr in cache) return cache[dateStr];
  const snap = await getDoc(streakRef(dateStr));
  setCacheEntry(dateStr, snap.exists());
  return cache[dateStr];
}

// ── Write ────────────────────────────────────────────────────────────────────

export async function toggleDay(dateStr) {
  if (await isDone(dateStr)) {
    await deleteDoc(streakRef(dateStr));
    setCacheEntry(dateStr, false);
  } else {
    await setDoc(streakRef(dateStr), { done: true, ts: Date.now() });
    setCacheEntry(dateStr, true);
  }
  render();
}

export async function markDone() {
  const { uidDate } = await import("./dateUtils.js");
  const date = uidDate(new Date());
  const done = await isDone(date);
  if (!done) toggleDay(date);
}

// ── Bulk load ────────────────────────────────────────────────────────────────

export async function loadMonthRange(y, m) {
  if (!userId && !publicMode) return;

  document.getElementById('loadingOverlay').style.display = 'flex';

  const start = new Date(y, m - 1, 1);
  const end   = new Date(y, m + 2, 0);

  const streaksCol = publicMode
    ? collection(db, "users", publicUser, "streaks", publicStreak, "days")
    : collection(db, "users", userId,     "streaks", currentStreakName, "days");

  const q     = query(streaksCol, where("ts", ">=", start.getTime()), where("ts", "<=", end.getTime()));
  const snaps = await getDocs(q);
  snaps.forEach(docSnap => { if (docSnap.exists()) setCacheEntry(docSnap.id, true); });

  render();
}

export async function loadPublicStreak(uid, streakName) {
  const streakDocRef = doc(db, "users", uid, "streaks", streakName);
  const streakSnap   = await getDoc(streakDocRef);

  if (!streakSnap.exists() || !streakSnap.data().public) {
    alert("This streak is private or does not exist.");
    return;
  }

  setCache({});
  const daysCol = collection(db, "users", uid, "streaks", streakName, "days");
  const snaps   = await getDocs(daysCol);
  snaps.forEach(docSnap => setCacheEntry(docSnap.id, true));

  const today = new Date();
  const { setView } = await import("./ui.js");
  setView(today.getFullYear(), today.getMonth());
}
