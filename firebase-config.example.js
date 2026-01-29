// Firebase Configuration Example
//
// To enable cloud sync:
// 1. Create a Firebase project at https://console.firebase.google.com/
// 2. Enable Authentication (Google sign-in provider)
// 3. Enable Firestore Database (start in test mode)
// 4. Add a web app and copy your config below
// 5. Copy this file to firebase-config.js and fill in your values
//
// Get config from: Firebase Console -> Project Settings -> Your Apps -> Web App

export const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Auto-enables when apiKey is set
export const FIREBASE_ENABLED = firebaseConfig.apiKey !== "" && firebaseConfig.apiKey !== "YOUR_API_KEY";
