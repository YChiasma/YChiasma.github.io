import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ── Get display name ─────────────────────────────────────────────────────────

let displayName = undefined;

export async function getUserInfo(userId) {
  const userDocRef = doc(db, "users", userId);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    console.log(data);
    if (data.displayName) {
      console.log(data.displayName);
      displayName = data.displayName;
      document.getElementById("userDisplayName").textContent = displayName;
      console.log("Done.");
    }
  }
}

function setDisplayName(newName) {
  displayName = newName;
  const userDisplayName = document.getElementById("userDisplayName");
  userDisplayName.innerHTML = "";
  userDisplayName.textContent = displayName;
  changeNameButton.style.display = "";
  saveNameButton.style.display = "none";
  const userRef = doc(db, "users", currentUser.uid);
  setDoc(userRef, { displayName: displayName });
}


const changeNameButton = document.getElementById("changeName");
const saveNameButton = document.getElementById("saveName");
let textField = null;

saveNameButton.addEventListener("click", () => {
  setDisplayName(textField.value);
});

changeNameButton.addEventListener("click", () => {
  textField = document.createElement("input");
  textField.value = displayName;
  const userDisplayName = document.getElementById("userDisplayName");
  userDisplayName.textContent = "";
  userDisplayName.appendChild(textField);
  textField.select();
  textField.addEventListener("keyup", (e) => {
    if ("Enter" == e.key) {
      setDisplayName(textField.value);
    }
  });
  changeNameButton.style.display = "none";
  saveNameButton.style.display = "";
});