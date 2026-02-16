function createModal({ 
  title = "Enter Text", 
  buttonText = "Submit", 
  onSubmit = (value) => console.log(value) 
} = {}) {

  // Overlay
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.5)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = 1000;

  // Modal box
  const modal = document.createElement("div");
  modal.style.background = "#fff";
  modal.style.padding = "20px";
  modal.style.borderRadius = "8px";
  modal.style.minWidth = "300px";
  modal.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)";
  modal.style.textAlign = "center";

  // Title
  const heading = document.createElement("h2");
  heading.textContent = title;

  // Input
  const input = document.createElement("input");
  input.type = "text";
  input.style.width = "100%";
  input.style.margin = "15px 0";
  input.style.padding = "10px";
  input.style.fontSize = "16px";

  // Button
  const button = document.createElement("button");
  button.textContent = buttonText;
  button.style.padding = "10px 20px";
  button.style.cursor = "pointer";

  // Close modal helper
  function closeModal() {
    document.body.removeChild(overlay);
  }

  // Button click
  button.addEventListener("click", () => {
    onSubmit(input.value);
    closeModal();
  });

  // Close if clicking outside modal
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // Assemble
  modal.appendChild(heading);
  modal.appendChild(input);
  modal.appendChild(button);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Focus input automatically
  input.focus();
}

document.getElementById("guestMode").addEventListener("click", () => {
  createModal({
    title: "Admin Key (Use the same Admin Key to identify you as the owner of your streaks)",
    buttonText: "Login as guest",
    onSubmit: (value) => alert("You entered: " + value)
  });
});

function markDone() {
  const date = uidDate(new Date());
  isDone(date).then(x => {
   if(!x) toggleDay(date);
  });
}

document.getElementById("markDoneBtn").addEventListener("click", markDone);

const urlParams = new URLSearchParams(window.location.search);
const publicUser = urlParams.get("user");
const publicStreak = urlParams.get("streak");

let currentStreakName = "default"; // or "Running", "Meditation", etc.

if(publicStreak) setCurrentStreakName(publicStreak);

    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
    import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
    import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

    const firebaseConfig = {
      apiKey: "AIzaSyAtlpMxWZ75kX_0c_SooL8lzeFXqOhAZgc",
      authDomain: "streak-eda1a.firebaseapp.com",
      projectId: "streak-eda1a",
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    // Ensure user stays logged in across tabs/pages
    await setPersistence(auth, browserLocalPersistence);

    let userId = null;
    let cache = {};
    let prevStats = {current:0,longest:0,total:0};

async function loadPublicStreak(uid, streakName) {
  const streakDocRef = doc(db, "users", uid, "streaks", streakName);
  const streakSnap = await getDoc(streakDocRef);
  if (!streakSnap.exists() || !streakSnap.data().public) {
    alert("This streak is private or does not exist.");
    return;
  }

  cache = {};
  const daysCol = collection(db, "users", uid, "streaks", streakName, "days");
  const snaps = await getDocs(daysCol);
  snaps.forEach(docSnap => (cache[docSnap.id] = true));
  const today = new Date();
  setView(today.getFullYear(), today.getMonth());
}

    function uidDate(d){
      const y=d.getFullYear(); const m=(d.getMonth()+1).toString().padStart(2,'0'); const day=d.getDate().toString().padStart(2,'0');
      return `${y}-${m}-${day}`;
    }

    let viewYear, viewMonth;

    function setView(y,m){ viewYear=y; viewMonth=m; loadMonthRange(y,m);
const isToday =
  viewYear === new Date().getFullYear() &&
  viewMonth === new Date().getMonth();

const sticky = document.getElementById('stickyToday');
if (sticky) sticky.style.opacity = isToday ? '0.4' : '1';
 }

    function getMonthInfo(y,m){
      const first=new Date(y,m,1); const last=new Date(y,m+1,0);
      return {firstDayIndex:first.getDay(), days:last.getDate()}
    }

    function streakRef(dateStr) {
      if(!userId) userId = publicUser;
      if(!currentStreakName) setCurrentStreakName(publicStreak);
      return doc(db, "users", userId, "streaks", currentStreakName, "days", dateStr);
    }

    async function isDone(dateStr){ if(dateStr in cache) return cache[dateStr];
      const snap = await getDoc(streakRef(dateStr));
      cache[dateStr] = snap.exists();
      return cache[dateStr];
    }

    async function toggleDay(dateStr){
      if(await isDone(dateStr)){
        await deleteDoc(streakRef(dateStr));
        cache[dateStr]=false;
      } else {
        await setDoc(streakRef(dateStr), {done:true, ts:Date.now()});
        cache[dateStr]=true;
      }
      render();
    }

    function animateNumber(el, from, to, duration=500){
      const start = performance.now();
      const easeOutCubic = t => 1 - Math.pow(1-t,3);
      function step(time){
        let t = Math.min((time-start)/duration,1);
        el.textContent = Math.floor(from + (to-from)*easeOutCubic(t));
        if(t<1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    async function render(){
      if(!userId && !publicMode) return;
      const daysGrid=document.getElementById('daysGrid');
      const {firstDayIndex, days}=getMonthInfo(viewYear, viewMonth);
      const monName=new Date(viewYear,viewMonth,1).toLocaleString(undefined,{month:'long',year:'numeric'});
      document.getElementById('monthTitle').textContent=monName;
      document.getElementById('rangeLabel').textContent=`Viewing ${monName}`;
      daysGrid.innerHTML='';
      for(let i=0;i<firstDayIndex;i++){
        const el=document.createElement('div'); el.className='day inactive'; daysGrid.appendChild(el);
      }
      for(let d=1;d<=days;d++){
        const date=new Date(viewYear,viewMonth,d); const id=uidDate(date);
        const el=document.createElement('button'); el.className='day'; el.innerHTML=`<div class="n">${d}</div>`;
        if(cache[id]) el.setAttribute('data-state','done');
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
        daysGrid.appendChild(el);
      if (
        date.getFullYear() === new Date().getFullYear() &&
        date.getMonth() === new Date().getMonth() &&
        d === new Date().getDate()
      ) {
        el.dataset.today = "true";
      }
      }
      daysGrid.classList.remove('fadeInUp');
      void daysGrid.offsetWidth;
      daysGrid.classList.add('fadeInUp');
      updateStats();
      document.getElementById('loadingOverlay').style.display='none';
      highlightToday();

      renderSummaryPill();

    }

    function updateStats(){
      const keys=Object.keys(cache).filter(k=>cache[k]).sort();
      const total = keys.length;
      let longest=0, running=0, prev=null;
      for(const k of keys){
        const [y,m,d]=k.split('-').map(Number);
        const dt=new Date(y,m-1,d);
        if(!prev) running=1; else{
          const diff=(dt-prev)/(1000*60*60*24);
          if(diff===1) running++; else running=1;
        }
        if(running>longest) longest=running;
        prev=dt;
      }
      let cur=0; let t=new Date();
      while(true){ const k=uidDate(t); if(cache[k]){cur++; t.setDate(t.getDate()-1);} else break; }
      const panel=document.getElementById('statsPanel');
      panel.classList.remove('fadeInUp');
      void panel.offsetWidth;
      panel.classList.add('fadeInUp');
      animateNumber(document.getElementById('currentStreak'), prevStats.current, cur);
      animateNumber(document.getElementById('longestStreak'), prevStats.longest, longest);
      animateNumber(document.getElementById('totalMarked'), prevStats.total, total);
      prevStats={current:cur,longest:longest,total:total};
    }

    async function loadMonthRange(y,m){
      if(!userId && !publicMode) return;
      document.getElementById('loadingOverlay').style.display='flex';
      const start=new Date(y,m-1,1);
      const end=new Date(y,m+2,0);
      let streaksCol = null;
      if(!publicMode)
        streaksCol = collection(db, "users", userId, "streaks", currentStreakName, "days");
      else
        streaksCol = collection(db, "users", publicUser, "streaks", publicStreak, "days");
      const q=query(
        streaksCol,
        where("ts", ">=", start.getTime()),
        where("ts", "<=", end.getTime())
      );
      const snaps=await getDocs(q);
      snaps.forEach(docSnap=>{
        if(docSnap.exists()){
          cache[docSnap.id] = true;
        }
      });
      render();
    }

    function highlightToday(){
      const today = new Date();
      if(today.getFullYear()!==viewYear || today.getMonth()!==viewMonth) return;
      const id = uidDate(today);
      const days = document.querySelectorAll('#daysGrid .day');
      days.forEach(day=>{
        if(day.textContent==today.getDate().toString()){
          day.classList.add('pulse');
          day.scrollIntoView({behavior:'smooth', block:'center'});
          setTimeout(()=>day.classList.remove('pulse'),400);
        }
      });
    }

    document.getElementById('prevMonth').addEventListener('click',()=>{const dt=new Date(viewYear,viewMonth-1,1); setView(dt.getFullYear(),dt.getMonth());});
    document.getElementById('nextMonth').addEventListener('click',()=>{const dt=new Date(viewYear,viewMonth+1,1); setView(dt.getFullYear(),dt.getMonth());});
    document.getElementById('todayBtn').addEventListener('click',()=>{const t=new Date(); setView(t.getFullYear(),t.getMonth());});
    document.getElementById('clearBtn').addEventListener('click',async()=>{if(confirm('Clear all streaks?')){for(const k of Object.keys(cache)){if(cache[k]){await deleteDoc(streakRef(k)); cache[k]=false;}} render();}});

    document.getElementById('logoutBtn').addEventListener('click', async ()=>{
      await signOut(auth);
    });

    document.getElementById('loginForm').addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email=document.getElementById('email').value;
      const password=document.getElementById('password').value;
      try{
        await signInWithEmailAndPassword(auth, email, password);
      } catch(err){
        alert("Login failed: "+err.message);
        document.getElementById('password').focus();
      }
    });

    let publicMode = false;

    onAuthStateChanged(auth, async (user)=>{
      if(publicStreak) setCurrentStreakName(publicStreak);
const loginFormDisplay = document.getElementById('loginForm').style.display;
      if(user){
        userId=user.uid;
        if(publicUser && publicStreak && publicUser != userId) publicMode = true;
        document.getElementById('loginForm').style.display='none';
        document.getElementById('logoutBtn').style.display='inline-block';
        const t=new Date();
        setView(t.getFullYear(), t.getMonth());
await loadStreakList();
await loadStreak(currentStreakName);
      } else {
        userId=null;

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
}



        document.getElementById('loginForm').style.display=loginFormDisplay;
        document.getElementById('logoutBtn').style.display='none';
        document.getElementById('email').focus();
      }
    });

    function setCurrentStreakName(newStreakName) {
      currentStreakName = newStreakName;
      document.getElementById("streakName").value = currentStreakName;
    }

    document.getElementById('streakSelect').addEventListener('change', async e => {
      setCurrentStreakName(e.target.value);
      cache = {};
      const t = new Date();
      setView(t.getFullYear(), t.getMonth());

  // update checkbox
  await syncPublicCheckbox(currentStreakName);
    });

async function loadStreakList() {
  const select = document.getElementById("streakSelect");
  select.innerHTML = ""; // clear existing

  if(null === userId) return;
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
    if(!currentStreakName) setCurrentStreakName("default");
    return;
  }

  snaps.forEach(docSnap => {


    const name = docSnap.data().displayName || docSnap.id;
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });

  if(!currentStreakName) {
    // pick first streak as active
    setCurrentStreakName(select.options[0].value);
  }
  select.value = currentStreakName;
}

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

await loadStreakList();
const t = new Date();
setView(t.getFullYear(), t.getMonth());

document.getElementById("renameBtn").addEventListener("click", e => {
  const newStreakName = document.getElementById("streakName").value;
  const streakDoc = doc(db, "users", userId, "streaks", currentStreakName);
  updateDoc(streakDoc, { displayName: newStreakName });
  loadStreakList();
});

async function togglePublic(streakName, value) {
  const streakDoc = doc(db, "users", userId, "streaks", streakName);
  await setDoc(streakDoc, { public: value }, { merge: true });


}

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



async function syncPublicCheckbox(streakName) {
  const checkbox = document.getElementById("publicToggle");
  if (!streakName || !userId) return;

  const streakDocRef = doc(db, "users", userId, "streaks", streakName);
  const streakSnap = await getDoc(streakDocRef);

  if (streakSnap.exists()) {
    const data = streakSnap.data();
    checkbox.checked = !!data.public;  // set checkbox state
  } else {
    checkbox.checked = false; // default to private if no doc
  }
}

async function loadStreak(streakName) {
  if (!userId) return;

  setCurrentStreakName(streakName);
  cache = {};

  // 🔹 Sync public toggle
  const checkbox = document.getElementById("publicToggle");
  const streakDocRef = doc(db, "users", userId, "streaks", streakName);
  const streakSnap = await getDoc(streakDocRef);
  if (streakSnap.exists()) {
    checkbox.checked = !!streakSnap.data().public;
  } else {
    checkbox.checked = false;
  }

const shareBtn = document.getElementById("shareLinkBtn");
if (checkbox.checked) {
  shareBtn.style.display = "inline-block";
} else {
  shareBtn.style.display = "none";
}

  // 🔹 Refresh the calendar
  const today = new Date();
  setView(today.getFullYear(), today.getMonth());
}

document.getElementById('streakSelect').addEventListener('change', e => {
  loadStreak(e.target.value);
});

// left/right swipe

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




function getTodayStatusInfo() {
  const today = new Date();
  const todayStr = uidDate(today);

  if (cache[todayStr]) {
    return {
      status: "done",
      text: "🔥 Streak active · Done today"
    };
  }

  // Find last done day
  const doneDays = Object.keys(cache)
    .filter(k => cache[k])
    .sort();

  if (!doneDays.length) {
    return {
      status: "undone",
      text: "⏳ Not done today"
    };
  }

  const last = new Date(doneDays[doneDays.length - 1]);
  const diff = Math.floor((today - last) / (1000 * 60 * 60 * 24));

  if (diff === 1) {
    return {
      status: "undone",
      text: "⏳ Not done today"
    };
  }

  return {
    status: "broken",
    text: `💔 Streak broken · ${diff} days ago`
  };
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



