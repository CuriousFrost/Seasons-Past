import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "firebase/app-check";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

if (typeof window !== "undefined") {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  // Opt into App Check debug mode in dev so local Firestore/Functions calls
  // work without a real reCAPTCHA score (the token is allow-listed in the
  // Firebase console).
  if (import.meta.env.DEV) {
    // @ts-expect-error - augmented at runtime by Firebase App Check.
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  if (siteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } else if (import.meta.env.PROD) {
    console.warn(
      "VITE_RECAPTCHA_SITE_KEY is not set; App Check is disabled. " +
        "Cloud Functions that enforce App Check will reject requests.",
    );
  }
}

export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
