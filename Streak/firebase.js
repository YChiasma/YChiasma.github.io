import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAtlpMxWZ75kX_0c_SooL8lzeFXqOhAZgc",
  authDomain: "streak-eda1a.firebaseapp.com",
  projectId: "streak-eda1a",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Ensure user stays logged in across tabs/pages
await setPersistence(auth, browserLocalPersistence);
