import { doc, getDoc }                                from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ── Get display name ─────────────────────────────────────────────────────────

    let displayName = undefined;
    
    export async function getUserInfo(userId) {
      console.log(userId);
      const userDocRef = doc(db, "users", userId);
      const userSnap = await getDoc(userDocRef);
      console.log(userSnap);
      if(userSnap.exists()) {
        const data = userSnap.data();
        console.log(data);
        if(data.displayName) {
          console.log(data.displayName);
          displayName = data.displayName;
          document.getElementById("userDisplayName").textContent = displayName;
          console.log("Done.");
        }
      }
    }
