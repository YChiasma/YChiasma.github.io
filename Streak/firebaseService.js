import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, deleteDoc,
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  signInAnonymously, getAuth, onAuthStateChanged,
  setPersistence, browserLocalPersistence,
  signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "streak-eda1a.firebaseapp.com",
  projectId: "streak-eda1a",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

await setPersistence(auth, browserLocalPersistence);

export { db, auth };
export {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut
};

export function streakDoc(userId, streakName, dateStr) {
  return doc(db, "users", userId, "streaks", streakName, "days", dateStr);
}

export function streakCollection(userId, streakName) {
  return collection(db, "users", userId, "streaks", streakName, "days");
}

export async function getDocument(ref) {
  return await getDoc(ref);
}

export async function setDocument(ref, data, options) {
  return await setDoc(ref, data, options);
}

export async function deleteDocument(ref) {
  return await deleteDoc(ref);
}

export async function getCollection(q) {
  return await getDocs(q);
}

export function buildRangeQuery(col, start, end) {
  return query(col, where("ts", ">=", start), where("ts", "<=", end));
}
