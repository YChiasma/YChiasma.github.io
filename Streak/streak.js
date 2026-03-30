// =====================
// VARIABLES (TOP LEVEL)
// =====================

const urlParams = new URLSearchParams(window.location.search);
const publicUser = urlParams.get("user");
const publicStreak = urlParams.get("streak");

let currentStreakName = "default";
let userId = null;
let cache = {};
let prevStats = { current: 0, longest: 0, total: 0 };
let viewYear, viewMonth;
let publicMode = false;
let guestMode = false;
let startX = null;
let sheetContext = null;

const firebaseConfig = {
  apiKey: "AIzaSyAtlpMxWZ75kX_0c_SooL8lzeFXqOhAZgc",
  authDomain: "streak-eda1a.firebaseapp.com",
  projectId: "streak-eda1a",
};

const sheet = document.getElementById('bottomSheet');
const sheetBackdrop = document.getElementById('sheetBackdrop');
const sheetTitle = document.getElementById('sheetTitle');
const sheetDate = document.getElementById('sheetDate');
const sheetStatus = document.getElementById('sheetStatus');
const sheetAction = document.getElementById('sheetAction');
const publicToggle = document.getElementById("publicToggle");

// =====================
// FUNCTIONS
// =====================

function getOwnerRoot() {
  if (auth.currentUser) return ["users", auth.currentUser.uid];
  return ["guests", adminKey];
}

function markDone() {
  const date = uidDate(new Date());
  isDone(date).then(x => {
    if (!x) toggleDay(date);
  });
}

function uidDate(d) {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function setView(y, m) {
  viewYear = y;
  viewMonth = m;
  loadMonthRange(y, m);

  const isToday =
    viewYear === new Date().getFullYear() &&
    viewMonth === new Date().getMonth();

  const sticky = document.getElementById('stickyToday');
  if (sticky) sticky.style.opacity = isToday ? '0.4' : '1';
}

function getMonthInfo(y, m) {
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  return { firstDayIndex: first.getDay(), days: last.getDate() };
}

function streakRef(dateStr) {
  if (!userId) userId = publicUser;
  if (!currentStreakName) setCurrentStreakName(publicStreak);
  return doc(db, "users", userId, "streaks", currentStreakName, "days", dateStr);
}

async function isDone(dateStr) {
  if (dateStr in cache) return cache[dateStr];
  const snap = await getDoc(streakRef(dateStr));
  cache[dateStr] = snap.exists();
  return cache[dateStr];
}

async function toggleDay(dateStr) {
  if (await isDone(dateStr)) {
    await deleteDoc(streakRef(dateStr));
    cache[dateStr] = false;
  } else {
    await setDoc(streakRef(dateStr), { done: true, ts: Date.now() });
    cache[dateStr] = true;
  }
  render();
}

function animateNumber(el, from, to, duration = 500) {
  const start = performance.now();
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  function step(time) {
    let t = Math.min((time - start) / duration, 1);
    el.textContent = Math.floor(from + (to - from) * easeOutCubic(t));
    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

async function render() {
  if (!userId && !publicMode) return;

  const daysGrid = document.getElementById('daysGrid');
  const { firstDayIndex, days } = getMonthInfo(viewYear, viewMonth);

  const monName = new Date(viewYear, viewMonth, 1)
    .toLocaleString(undefined, { month: 'long', year: 'numeric' });

  document.getElementById('monthTitle').textContent = monName;
  document.getElementById('rangeLabel').textContent = `Viewing ${monName}`;

  daysGrid.innerHTML = '';

  for (let i = 0; i < firstDayIndex; i++) {
    const el = document.createElement('div');
    el.className = 'day inactive';
    daysGrid.appendChild(el);
  }

  for (let d = 1; d <= days; d++) {
    const date = new Date(viewYear, viewMonth, d);
    const id = uidDate(date);

    const el = document.createElement('button');
    el.className = 'day';
    el.innerHTML = `<div class="n">${d}</div>`;

    if (cache[id]) el.setAttribute('data-state', 'done');

    if (!publicMode) {
      el.addEventListener('click', async () => {
        const done = !!cache[id];

        if (window.innerWidth <= 720) {
          openSheet({
            streakName: currentStreakDisplayName || currentStreakName,
            dateStr: id,
            done
          });
        } else {
          toggleDay(id);
        }
      });
    }

    daysGrid.appendChild(el);

    if (
      date.getFullYear() === new Date().getFullYear() &&
      date.getMonth() === new Date().getMonth() &&
      d === new Date().getDate()
    ) {
      el.dataset.today = "true";
    }
  }

  updateStats();
  document.getElementById('loadingOverlay').style.display = 'none';
  highlightToday();
  renderSummaryPill();
}

function updateStats() {
  const keys = Object.keys(cache).filter(k => cache[k]).sort();
  const total = keys.length;

  let longest = 0, running = 0, prev = null;

  for (const k of keys) {
    const [y, m, d] = k.split('-').map(Number);
    const dt = new Date(y, m - 1, d);

    if (!prev) running = 1;
    else {
      const diff = (dt - prev) / (1000 * 60 * 60 * 24);
      running = diff === 1 ? running + 1 : 1;
    }

    if (running > longest) longest = running;
    prev = dt;
  }

  let cur = 0;
  let t = new Date();

  while (true) {
    const k = uidDate(t);
    if (cache[k]) {
      cur++;
      t.setDate(t.getDate() - 1);
    } else break;
  }

  animateNumber(document.getElementById('currentStreak'), prevStats.current, cur);
  animateNumber(document.getElementById('longestStreak'), prevStats.longest, longest);
  animateNumber(document.getElementById('totalMarked'), prevStats.total, total);

  prevStats = { current: cur, longest, total };
}

async function loadMonthRange(y, m) {
  if (!userId && !publicMode) return;

  document.getElementById('loadingOverlay').style.display = 'flex';

  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m + 2, 0);

  const streaksCol = !publicMode
    ? collection(db, "users", userId, "streaks", currentStreakName, "days")
    : collection(db, "users", publicUser, "streaks", publicStreak, "days");

  const q = query(
    streaksCol,
    where("ts", ">=", start.getTime()),
    where("ts", "<=", end.getTime())
  );

  const snaps = await getDocs(q);

  snaps.forEach(docSnap => {
    if (docSnap.exists()) cache[docSnap.id] = true;
  });

  render();
}

function highlightToday() {
  const today = new Date();
  if (today.getFullYear() !== viewYear || today.getMonth() !== viewMonth) return;

  const days = document.querySelectorAll('#daysGrid .day');

  days.forEach(day => {
    if (day.textContent == today.getDate().toString()) {
      day.classList.add('pulse');
      day.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => day.classList.remove('pulse'), 400);
    }
  });
}

function setCurrentStreakName(newStreakName) {
  currentStreakName = newStreakName;
  document.getElementById("streakName").value = currentStreakName;
}

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

async function authenticate(user) {
  if (publicStreak) setCurrentStreakName(publicStreak);
  const loginFormDisplay = document.getElementById('loginForm').style.display;
  if (user && !auth.currentUser.isAnonymous) {
    userId = user.uid;
    guestMode = false;
    if (publicUser && publicStreak && publicUser != userId) publicMode = true;
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'inline-block';
    const t = new Date();
    setView(t.getFullYear(), t.getMonth());
    await loadStreakList();
    await loadStreak(currentStreakName);
  } else {
    await signInAnonymously(auth);
    guestMode = true;
    userId = auth.currentUser.uid;
    
    document.getElementById("guestModeMsg").style.display = "block";

    publicMode = false;

    if (publicUser && publicStreak) {
      // Public view mode
      publicMode = true;
      document.getElementById("loginForm").style.display = "none";
      document.getElementById("logoutBtn").style.display = "none";
      document.getElementById("clearBtn").style.display = "none";
      document.getElementById("todayBtn").style.display = "none";
      document.getElementById("publicToggle").disabled = true;
      document.getElementById("shareLinkBtn").style.display = "none";

      loadPublicStreak(publicUser, publicStreak);
    } else {
      const t = new Date();
      setView(t.getFullYear(), t.getMonth());
      await loadStreakList();
      await loadStreak(currentStreakName);
    }



    document.getElementById('loginForm').style.display = loginFormDisplay;
    document.getElementById('logoutBtn').style.display = 'none';
    if ("none" != loginFormDisplay) {
      document.getElementById('email').focus();
    }
  }
}

async function loadStreakList() {
  const select = document.getElementById("streakSelect");
  select.innerHTML = ""; // clear existing

  if (null === userId) return;
  const streaksCol = collection(db, "users", userId, "streaks");
  const snaps = await getDocs(streaksCol);

  if (snaps.empty) {
    // create a default streak if none exist
    await setDoc(doc(db, "users", userId, "streaks", "default"), {
      createdAt: Date.now()
    });
    const opt = document.createElement("option");
    opt.value = "default";
    opt.textContent = "default";
    select.appendChild(opt);
    if (!currentStreakName) setCurrentStreakName("default");
    return;
  }

  snaps.forEach(docSnap => {


    const name = docSnap.data().displayName || docSnap.id;
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  if (!currentStreakName) {
    // pick first streak as active
    setCurrentStreakName(select.options[0].value);
  }
  select.value = currentStreakName;
}

function renderSummaryPill() {
  const pill = document.getElementById("summaryPill");
  if (!pill || window.innerWidth > 720) return;

  const info = getTodayStatusInfo();

  pill.className = `summary-pill ${info.status}`;
  pill.textContent = info.text;
  pill.style.display = "flex";

  pill.onclick = () => {
    const todayStr = uidDate(new Date());
    openSheet({
      streakName: currentStreakDisplayName || currentStreakName,
      dateStr: todayStr,
      done: !!cache[todayStr]
    });
  };
}

// =====================
// EVENT LISTENERS
// =====================

document.getElementById("markDoneBtn").addEventListener("click", markDone);

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

sheetBackdrop.addEventListener('click', closeSheet);

sheetAction.addEventListener('click', async () => {
  if (!sheetContext) return;
  const { dateStr, done } = sheetContext;

  if (done) {
    await deleteDoc(streakRef(dateStr));
    cache[dateStr] = false;
  } else {
    await setDoc(streakRef(dateStr), { done: true, ts: Date.now() });
    cache[dateStr] = true;
  }

  closeSheet();
  render();
});

// =====================
// EVERYTHING ELSE
// =====================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { signInAnonymously, getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

await setPersistence(auth, browserLocalPersistence);

if (publicStreak) setCurrentStreakName(publicStreak);

onAuthStateChanged(auth, authenticate);

await loadStreakList();
const t = new Date();
setView(t.getFullYear(), t.getMonth());