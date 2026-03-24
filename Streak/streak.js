// =======================
// DATA LAYER (Firebase only)
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
    const result = {};
    snap.forEach(d => result[d.id] = true);
    return result;
  }

  async function isDone(streak, dateStr) {
    const snap = await getDoc(dayRef(streak, dateStr));
    return snap.exists();
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

  async function getPublicStreak(uid, streak) {
    const ref = doc(db, "users", uid, "streaks", streak);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;
    if (!snap.data().public) return null;

    return snap.data();
  }

  return {
    getMeta,
    updateMeta,
    getDays,
    isDone,
    toggleDay,
    getPublicStreak
  };

})();


// =======================
// STATE LAYER
// =======================

const State = (() => {

  let state = {
    currentStreak: "default",
    displayName: "default",
    public: false,
    cache: {},
    viewYear: null,
    viewMonth: null
  };

  function get() {
    return state;
  }

  function set(partial) {
    state = { ...state, ...partial };
    UI.render();
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

  async function loadPublic(uid, streakName) {
    const meta = await Data.getPublicStreak(uid, streakName);

    if (!meta) return { error: true };

    set({
      currentStreak: streakName,
      displayName: meta.displayName || streakName,
      public: true,
      cache: {}
    });

    await loadMonth(state.viewYear, state.viewMonth);

    return { success: true };
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
    const val = await Data.toggleDay(state.currentStreak, dateStr, exists);

    set({
      cache: { ...state.cache, [dateStr]: val }
    });
  }

  async function markToday() {
    const today = uidDate(new Date());
    const exists = !!state.cache[today];

    if (!exists) {
      await toggleDay(today);
    }
  }

  async function setPublic(value) {
    await Data.updateMeta(state.currentStreak, { public: value });
    set({ public: value });
  }

  async function rename(name) {
    await Data.updateMeta(state.currentStreak, { displayName: name });
    set({ displayName: name });
  }

  return {
    get,
    set,
    loadStreak,
    loadPublic,
    loadMonth,
    toggleDay,
    markToday,
    setPublic,
    rename
  };

})();


// =======================
// UI LAYER (DOM only)
// =======================

const UI = (() => {

  const els = {
    grid: document.getElementById("grid"),
    monthLabel: document.getElementById("monthLabel"),
    publicToggle: document.getElementById("publicToggle"),
    streakName: document.getElementById("streakName"),
    summary: document.getElementById("summaryPill"),
    markDoneBtn: document.getElementById("markDoneBtn")
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

    els.summary.textContent =
      done ? "🔥 Done today" : "⏳ Not done today";

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

    if (els.markDoneBtn) {
      els.markDoneBtn.onclick = () => {
        State.markToday();
      };
    }
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

  // URL params (public view support)
  const params = new URLSearchParams(window.location.search);
  const uidParam = params.get("user");
  const streakParam = params.get("streak");

  if (uidParam && streakParam) {
    const result = await State.loadPublic(uidParam, streakParam);

    if (result?.error) {
      alert("This streak is private or does not exist.");
    }

    return;
  }

  await State.loadStreak("default");
});