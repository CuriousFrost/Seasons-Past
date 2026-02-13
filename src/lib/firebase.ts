import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBLQs0Ixhx1e64nRZABRkl3R3KyQnsJ6WA",
  authDomain: "mtg-commander-game-track-65843.firebaseapp.com",
  projectId: "mtg-commander-game-track-65843",
  storageBucket: "mtg-commander-game-track-65843.firebasestorage.app",
  messagingSenderId: "195800505678",
  appId: "1:195800505678:web:bc5fce3f7322b51383d21f",
  measurementId: "G-J0905P9J9B",
};

const app = initializeApp(firebaseConfig);

export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export default app;
