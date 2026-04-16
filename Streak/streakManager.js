import { doc, setDoc, getDoc, collection, getDocs, updateDoc }
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { db } from "./firebase.js";
import {
  userId, currentStreakName,
  setCurrentStreakName as _setCurrentStreakName,
  setCache, setCurrentStreakDisplayName,
} from "./state.js";
import { setView } from "./ui.js";

// ── Current streak name ──────────────────────────────────────────────────────

export function setCurrentStreakName(newName) {
  _setCurrentStreakName(newName);
  const el = document.getElementById("streakName");
  if (el) el.value = newName;
}

// ── Public toggle / share link ───────────────────────────────────────────────

export async function togglePublic(streakName, value) {
  const streakDoc = doc(db, "users", userId, "streaks", streakName);
  await setDoc(streakDoc, { public: value }, { merge: true });
}

export async function syncPublicCheckbox(streakName) {
  const checkbox = document.getElementById("publicToggle");
  if (!streakName || !userId) return;

  const streakDocRef = doc(db, "users", userId, "streaks", streakName);
  const streakSnap   = await getDoc(streakDocRef);

  checkbox.checked = streakSnap.exists() ? !!streakSnap.data().public : false;
}

// ── Load / switch streak ─────────────────────────────────────────────────────

export async function loadStreak(streakName) {
  if (!userId) return;

  setCurrentStreakName(streakName);
  setCache({});

  const streakDocRef = doc(db, "users", userId, "streaks", streakName);
  const streakSnap   = await getDoc(streakDocRef);
  const checkbox     = document.getElementById("publicToggle");

  if (streakSnap.exists()) {
    const data = streakSnap.data();
    checkbox.checked = !!data.public;
    setCurrentStreakDisplayName(data.displayName || null);
  } else {
    checkbox.checked = false;
  }

  const shareBtn = document.getElementById("shareLinkBtn");
  shareBtn.style.display = checkbox.checked ? "inline-block" : "none";

  const today = new Date();
  setView(today.getFullYear(), today.getMonth());
}

export async function loadStreakList() {
  const select = document.getElementById("streakSelect");
  select.innerHTML = "";

  if (userId === null) return;

  const streaksCol = collection(db, "users", userId, "streaks");
  const snaps      = await getDocs(streaksCol);

  if (snaps.empty) {
    await setDoc(doc(db, "users", userId, "streaks", "default"), { createdAt: Date.now() });
    const opt = document.createElement("option");
    opt.value = opt.textContent = "default";
    select.appendChild(opt);
    if (!currentStreakName) setCurrentStreakName("default");
    return;
  }

  snaps.forEach(docSnap => {
    const name = docSnap.data().displayName || docSnap.id;
    const opt  = document.createElement("option");
    opt.value  = docSnap.id;   // always use the doc ID as the value
    opt.textContent = name;
    select.appendChild(opt);
  });

  if (!currentStreakName) setCurrentStreakName(select.options[0].value);
  select.value = currentStreakName;
}

// ── Create / rename ──────────────────────────────────────────────────────────

export async function createStreak() {
  const name = prompt("Enter a name for your new streak:");
  if (!name) return;

  const safeName = name.trim().replace(/[.#$/[\]]/g, "_");
  if (!safeName) { alert("Invalid streak name"); return; }

  await setDoc(doc(db, "users", userId, "streaks", safeName), { createdAt: Date.now() });
  await loadStreakList();

  document.getElementById("streakSelect").value = safeName;
  setCurrentStreakName(safeName);
  setCache({});

  const t = new Date();
  setView(t.getFullYear(), t.getMonth());
}

export async function renameStreak() {
  const newName  = document.getElementById("streakName").value;
  const streakDoc = doc(db, "users", userId, "streaks", currentStreakName);
  await updateDoc(streakDoc, { displayName: newName });
  await loadStreakList();
}
