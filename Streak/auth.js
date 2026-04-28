import { signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import { auth } from "./firebase.js";
import {
  publicUser, publicStreak,
  setUserId, userId, setPublicMode, setGuestMode,
} from "./state.js";
import { setCurrentStreakName, loadStreakList, loadStreak } from "./streakManager.js";
import { loadPublicStreak } from "./streakData.js";
import { setView } from "./ui.js";

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

// ── Auth state handler ───────────────────────────────────────────────────────

export async function authenticate(user) {
  if (publicStreak) setCurrentStreakName(publicStreak);

  const loginForm         = document.getElementById('loginForm');
  const loginFormDisplay  = loginForm.style.display;

  if (user && !auth.currentUser.isAnonymous) {
    // Logged-in user
    setUserId(user.uid);
    getUserInfo(userId);
    setGuestMode(false);

    const { userId } = await import("./state.js");
    if (publicUser && publicStreak && publicUser !== userId) setPublicMode(true);

    loginForm.style.display                          = 'none';
    document.getElementById('logoutBtn').style.display = 'inline-block';

    const t = new Date();
    setView(t.getFullYear(), t.getMonth());
    await loadStreakList();

    const { currentStreakName } = await import("./state.js");
    await loadStreak(currentStreakName);

  } else {
    // Anonymous / guest
    await signInAnonymously(auth);
    setGuestMode(true);
    setUserId(auth.currentUser.uid);
    getUserInfo(userId);
    setPublicMode(false);

    document.getElementById("guestModeMsg").style.display = "block";

    await loadStreakList();

    if (publicUser && publicStreak) {
      // Public view mode — read-only
      setPublicMode(true);
      loginForm.style.display                                        = 'none';
      document.getElementById('logoutBtn').style.display             = 'none';
      document.getElementById('clearBtn').style.display              = 'none';
      document.getElementById('todayBtn').style.display              = 'none';
      document.getElementById('markDoneBtn').style.display              = 'none';
      document.getElementById('publicToggle').disabled               = true;
      document.getElementById('shareLinkBtn').style.display          = 'none';

      loadPublicStreak(publicUser, publicStreak);
    } else {
      const t = new Date();
      setView(t.getFullYear(), t.getMonth());

      const { currentStreakName } = await import("./state.js");
      await loadStreak(currentStreakName);
    }

    loginForm.style.display                            = loginFormDisplay;
    document.getElementById('logoutBtn').style.display = 'none';
    if (loginFormDisplay !== 'none') {
      document.getElementById('email').focus();
    }
  }
}

// ── Login form ───────────────────────────────────────────────────────────────

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert("Login failed: " + err.message);
    document.getElementById('password').focus();
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
});

// ── Bootstrap ────────────────────────────────────────────────────────────────

onAuthStateChanged(auth, authenticate);
