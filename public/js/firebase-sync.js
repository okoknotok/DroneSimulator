import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js';

const config = window.DRONE_FIREBASE_CONFIG || {};
const isConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

let app = null;
let auth = null;
let db = null;
let currentUser = null;

if (isConfigured) {
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    window.dispatchEvent(new CustomEvent('drone-cloud-auth', { detail: { user } }));
  });
}

async function ensureUser() {
  if (!isConfigured) return null;
  if (currentUser) return currentUser;
  const result = await signInAnonymously(auth);
  currentUser = result.user;
  return currentUser;
}

async function signInWithGoogle() {
  if (!isConfigured) return null;
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  currentUser = result.user;
  return currentUser;
}

async function signOutUser() {
  if (!isConfigured) return;
  await signOut(auth);
}

async function saveProgress(progress) {
  const user = await ensureUser();
  if (!user) return;
  await setDoc(doc(db, 'progress', user.uid), {
    userId: user.uid,
    progress,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function saveSubmission(submission) {
  const user = await ensureUser();
  if (!user) return;
  await addDoc(collection(db, 'submissions'), {
    ...submission,
    userId: user.uid,
    createdAt: serverTimestamp(),
  });
}

async function saveMissionProgress(progress) {
  const user = await ensureUser();
  if (!user) return;
  await setDoc(doc(db, 'missionProgress', user.uid), {
    userId: user.uid,
    progress,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function loadMissionProgress() {
  const user = await ensureUser();
  if (!user) return null;
  const snap = await getDoc(doc(db, 'missionProgress', user.uid));
  return snap.exists() ? snap.data().progress || null : null;
}

async function saveMissionLeaderboard(entry) {
  const user = await ensureUser();
  if (!user) return;
  await addDoc(collection(db, 'missionLeaderboard'), {
    ...entry,
    userId: user.uid,
    createdAt: serverTimestamp(),
  });
}

async function getMissionLeaderboard(missionId, max = 8) {
  if (!isConfigured) return [];
  const q = query(
    collection(db, 'missionLeaderboard'),
    orderBy('moves', 'asc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((item) => item.data())
    .filter((item) => !missionId || item.missionId === missionId)
    .slice(0, max);
}

async function saveCustomLevel(level) {
  const user = await ensureUser();
  if (!user) return;
  await addDoc(collection(db, 'customLevels'), {
    ...level,
    ownerId: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

window.DroneCloud = {
  isConfigured,
  get currentUser() { return currentUser; },
  signInWithGoogle,
  signOut: signOutUser,
  saveProgress,
  saveSubmission,
  saveCustomLevel,
  saveMissionProgress,
  loadMissionProgress,
  saveMissionLeaderboard,
  getMissionLeaderboard,
};

window.dispatchEvent(new CustomEvent('drone-cloud-ready', { detail: { isConfigured } }));
