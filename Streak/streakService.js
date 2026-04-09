import {
  streakDoc,
  streakCollection,
  getDocument,
  setDocument,
  deleteDocument,
  getCollection,
  buildRangeQuery
} from "./firebaseService.js";

let cache = {};

export function resetCache() {
  cache = {};
}

export async function isDone(userId, streakName, dateStr) {
  if (dateStr in cache) return cache[dateStr];

  const snap = await getDocument(streakDoc(userId, streakName, dateStr));
  cache[dateStr] = snap.exists();

  return cache[dateStr];
}

export async function toggleDay(userId, streakName, dateStr) {
  if (await isDone(userId, streakName, dateStr)) {
    await deleteDocument(streakDoc(userId, streakName, dateStr));
    cache[dateStr] = false;
  } else {
    await setDocument(streakDoc(userId, streakName, dateStr), {
      done: true,
      ts: Date.now()
    });
    cache[dateStr] = true;
  }
}

export async function loadMonth(userId, streakName, y, m) {
  const start = new Date(y, m - 1, 1).getTime();
  const end = new Date(y, m + 2, 0).getTime();

  const col = streakCollection(userId, streakName);
  const q = buildRangeQuery(col, start, end);
  const snaps = await getCollection(q);

  snaps.forEach(docSnap => {
    if (docSnap.exists()) cache[docSnap.id] = true;
  });

  return cache;
}
