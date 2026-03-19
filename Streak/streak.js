// =======================
// DATA LAYER
// =======================

const Data = (() => {

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
    toggleDay
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
  }

  return {
    render,
    bindEvents
  };

})();

// =======================
// INIT
// =======================

onAuthStateChanged(auth, async (user) => {
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