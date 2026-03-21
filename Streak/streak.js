// =======================
// DATA LAYER
// =======================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { linkWithCredential, signInAnonymously, getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const Data = (() => {

  const firebaseConfig = {
    apiKey: "AIzaSyAtlpMxWZ75kX_0c_SooL8lzeFXqOhAZgc",
    authDomain: "streak-eda1a.firebaseapp.com",
    projectId: "streak-eda1a",
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  function uid() {
    return auth.currentUser?.uid;
  }

  function streakRef(streak) {
    return doc(db, "users", uid(), "streaks", streak);
  }

  function dayRef(streak, dateStr) {
    return doc(db, "users", uid(), "streaks", streak, "days", dateStr);
  }

  async function getStreaks() {
    const snap = await getDocs(collection(db, "users", uid(), "streaks"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function createStreak(name) {
    await setDoc(streakRef(name), { createdAt: Date.now() });
  }

  async function getMeta(streak) {
    const snap = await getDoc(streakRef(streak));
    return snap.exists() ? snap.data() : {};
  }

  async function updateMeta(streak, data) {
    await setDoc(streakRef(streak), data, { merge: true });
  }

  async function getDays(streak, start, end) {
    const q = query(
      collection(db, "users", uid(), "streaks", streak, "days"),
      where("ts", ">=", start),
      where("ts", "<=", end)
    );

    const snap = await getDocs(q);
    const out = {};
    snap.forEach(d => out[d.id] = true);
    return out;
  }

  async function toggleDay(streak, dateStr, exists) {
    if (exists) {
      await deleteDoc(dayRef(streak, dateStr));
      return false;
    } else {
      await setDoc(dayRef(streak, dateStr), {
        done: true,
        ts: Date.now()
      });
      return true;
    }
  }

  return {
    getStreaks,
    createStreak,
    getMeta,
    updateMeta,
    getDays,
    toggleDay,
    auth
  };

})();

// =======================
// STATE LAYER
// =======================

const State = (() => {

  let state = {
    currentStreak: null,
    displayName: "",
    public: false,
    cache: {},
    viewYear: null,
    viewMonth: null
  };

  function set(partial) {
    state = { ...state, ...partial };
    UI.render();
  }

  function get() {
    return state;
  }

  async function loadStreak(name) {
    const meta = await Data.getMeta(name);

    set({
      currentStreak: name,
      displayName: meta.displayName || name,
      public: !!meta.public,
      cache: {}
    });

    await loadMonth(state.viewYear, state.viewMonth);
  }

  async function loadMonth(year, month) {
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 0).getTime();

    const days = await Data.getDays(state.currentStreak, start, end);

    set({
      cache: { ...state.cache, ...days },
      viewYear: year,
      viewMonth: month
    });
  }

  async function toggleDay(dateStr) {
    const exists = !!state.cache[dateStr];
    const newVal = await Data.toggleDay(state.currentStreak, dateStr, exists);

    set({
      cache: { ...state.cache, [dateStr]: newVal }
    });
  }

  async function setPublic(value) {
    await Data.updateMeta(state.currentStreak, { public: value });
    set({ public: value });
  }

  async function rename(displayName) {
    await Data.updateMeta(state.currentStreak, { displayName });
    set({ displayName });
  }

  return {
    get,
    set,
    loadStreak,
    loadMonth,
    toggleDay,
    setPublic,
    rename
  };

})();

// =======================
// UI LAYER
// =======================

const UI = (() => {

  const els = {
    grid: document.getElementById("grid"),
    monthLabel: document.getElementById("monthLabel"),
    publicToggle: document.getElementById("publicToggle"),
    streakName: document.getElementById("streakName"),
    summary: document.getElementById("summaryPill")
  };

  function render() {
    renderHeader();
    renderCalendar();
    renderSummary();
  }

  function renderHeader() {
    const s = State.get();

    els.monthLabel.textContent =
      `${s.viewYear}-${String(s.viewMonth + 1).padStart(2, "0")}`;

    els.publicToggle.checked = s.public;
    els.streakName.value = s.displayName;
  }

  function renderCalendar() {
    const s = State.get();
    const first = new Date(s.viewYear, s.viewMonth, 1);
    const last = new Date(s.viewYear, s.viewMonth + 1, 0);

    els.grid.innerHTML = "";

    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(s.viewYear, s.viewMonth, d);
      const id = uidDate(date);

      const el = document.createElement("div");
      el.className = "day";
      el.textContent = d;

      if (s.cache[id]) el.classList.add("done");

      el.onclick = () => State.toggleDay(id);

      els.grid.appendChild(el);
    }
  }

  function renderSummary() {
    const s = State.get();
    if (!els.summary) return;

    const today = uidDate(new Date());
    const done = !!s.cache[today];

    els.summary.textContent = done
      ? "🔥 Done today"
      : "⏳ Not done today";

    els.summary.className =
      "summary-pill " + (done ? "done" : "undone");
  }

  function bindEvents() {
    document.getElementById("prevMonth").onclick = () => {
      const s = State.get();
      const d = new Date(s.viewYear, s.viewMonth - 1);
      State.loadMonth(d.getFullYear(), d.getMonth());
    };

    document.getElementById("nextMonth").onclick = () => {
      const s = State.get();
      const d = new Date(s.viewYear, s.viewMonth + 1);
      State.loadMonth(d.getFullYear(), d.getMonth());
    };

    els.publicToggle.onchange = (e) => {
      State.setPublic(e.target.checked);
    };

    document.getElementById("renameBtn").onclick = () => {
      State.rename(els.streakName.value);
    };

document.getElementById("markDoneBtn").addEventListener("click", markDone);
document.getElementById('prevMonth').addEventListener('click', () => { const dt = new Date(viewYear, viewMonth - 1, 1); setView(dt.getFullYear(), dt.getMonth()); });
document.getElementById('nextMonth').addEventListener('click', () => { const dt = new Date(viewYear, viewMonth + 1, 1); setView(dt.getFullYear(), dt.getMonth()); });
document.getElementById('todayBtn').addEventListener('click', () => { const t = new Date(); setView(t.getFullYear(), t.getMonth()); });
document.getElementById('clearBtn').addEventListener('click', async () => { if (confirm('Clear all streaks?')) { for (const k of Object.keys(cache)) { if (cache[k]) { await deleteDoc(streakRef(k)); cache[k] = false; } } render(); } });

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert("Login failed: " + err.message);
    document.getElementById('password').focus();
  }
});


document.getElementById('streakSelect').addEventListener('change', async e => {
  setCurrentStreakName(e.target.value);
  cache = {};
  const t = new Date();
  setView(t.getFullYear(), t.getMonth());

  // update checkbox
  await syncPublicCheckbox(currentStreakName);
});


document.getElementById("newStreakBtn").addEventListener("click", async () => {
  const name = prompt("Enter a name for your new streak:");
  if (!name) return;

  const safeName = name.trim().replace(/[.#$/[\]]/g, "_");
  if (!safeName) return alert("Invalid streak name");

  const streakDoc = doc(db, "users", userId, "streaks", safeName);
  await setDoc(streakDoc, { createdAt: Date.now() });

  // refresh list
  await loadStreakList();

  // select new streak
  document.getElementById("streakSelect").value = safeName;
  setCurrentStreakName(safeName);
  cache = {};
  const t = new Date();
  setView(t.getFullYear(), t.getMonth());
});


document.getElementById("renameBtn").addEventListener("click", e => {
  const newStreakName = document.getElementById("streakName").value;
  const streakDoc = doc(db, "users", userId, "streaks", currentStreakName);
  updateDoc(streakDoc, { displayName: newStreakName });
  loadStreakList();
});

const publicToggle = document.getElementById("publicToggle");
publicToggle.addEventListener("click", async () => {
  togglePublic(currentStreakName, publicToggle.checked);
});

publicToggle.addEventListener("change", async (e) => {
  // Toggle share link visibility
  document.getElementById("shareLinkBtn").style.display = e.target.checked ? "inline-block" : "none";
});

document.getElementById("shareLinkBtn").addEventListener("click", async () => {
  const link = `${window.location.origin}?user=${userId}&streak=${encodeURIComponent(currentStreakName)}`;
  await navigator.clipboard.writeText(link);
  alert("Share link copied to clipboard!");
});


document.getElementById('streakSelect').addEventListener('change', e => {
  loadStreak(e.target.value);
});


document.getElementById('stickyToday')
  .addEventListener('click', () => {
    document.getElementById('todayBtn').click();
  });



const sheet = document.getElementById('bottomSheet');
const sheetBackdrop = document.getElementById('sheetBackdrop');
const sheetTitle = document.getElementById('sheetTitle');
const sheetDate = document.getElementById('sheetDate');
const sheetStatus = document.getElementById('sheetStatus');
const sheetAction = document.getElementById('sheetAction');

let sheetContext = null;

function openSheet({ streakName, dateStr, done }) {
  sheetContext = { streakName, dateStr, done };

  sheetTitle.textContent = streakName;
  sheetDate.textContent = new Date(dateStr).toDateString();

  sheetStatus.textContent = done ? 'Completed' : 'Not completed';
  sheetStatus.style.color = done ? '#10b981' : '#facc15';

  sheetAction.textContent = done ? 'Undo' : 'Mark done';

  sheetBackdrop.style.display = 'block';
  requestAnimationFrame(() => sheet.classList.add('open'));
}

function closeSheet() {
  sheet.classList.remove('open');
  sheetBackdrop.style.display = 'none';
  sheetContext = null;
}

sheetBackdrop.addEventListener('click', closeSheet);

sheetAction.addEventListener('click', async () => {
  if (!sheetContext) return;

  const { dateStr, done } = sheetContext;

  if (done) {
    await deleteDoc(streakRef(dateStr));
    cache[dateStr] = false;
  } else {
    await setDoc(streakRef(dateStr), {
      done: true,
      ts: Date.now()
    });
    cache[dateStr] = true;
  }

  closeSheet();
  render();
});








  }

  return {
    render,
    bindEvents
  };

})();

// =======================
// INIT
// =======================

onAuthStateChanged(Data.auth, async (user) => {
  if (!user) return;

  const today = new Date();

  State.set({
    viewYear: today.getFullYear(),
    viewMonth: today.getMonth()
  });

  UI.bindEvents();

  const streaks = await Data.getStreaks();

  if (streaks.length) {
    await State.loadStreak(streaks[0].id);
  }
});