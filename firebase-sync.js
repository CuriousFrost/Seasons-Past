// Firebase Sync Module
// Handles authentication and Firestore sync for cloud backup

import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut as firebaseSignOut
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    writeBatch,
    serverTimestamp
} from 'firebase/firestore';
import { firebaseConfig, FIREBASE_ENABLED } from './firebase-config.js';

class FirebaseSync {
    constructor() {
        this.app = null;
        this.auth = null;
        this.db = null;
        this.user = null;
        this.initialized = false;
        this._authStateListeners = [];
    }

    // Initialize Firebase (only if enabled)
    init() {
        if (!FIREBASE_ENABLED) {
            console.log('Firebase is disabled. Using local storage only.');
            return false;
        }

        try {
            this.app = initializeApp(firebaseConfig);
            this.auth = getAuth(this.app);
            this.db = getFirestore(this.app);
            this.initialized = true;

            // Listen for auth state changes
            onAuthStateChanged(this.auth, (user) => {
                this.user = user;
                this._notifyAuthStateListeners(user);
                if (user) {
                    console.log('Signed in as:', user.email);
                } else {
                    console.log('Signed out');
                }
            });

            return true;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            return false;
        }
    }

    // Check if Firebase is available and user is signed in
    isAvailable() {
        return this.initialized && FIREBASE_ENABLED;
    }

    isSignedIn() {
        return this.isAvailable() && this.user !== null;
    }

    getCurrentUser() {
        return this.user;
    }

    // Auth state listener management
    onAuthStateChange(callback) {
        this._authStateListeners.push(callback);
        // Immediately call with current state
        if (this.initialized) {
            callback(this.user);
        }
        // Return unsubscribe function
        return () => {
            this._authStateListeners = this._authStateListeners.filter(cb => cb !== callback);
        };
    }

    _notifyAuthStateListeners(user) {
        this._authStateListeners.forEach(callback => callback(user));
    }

    // Sign in with Google
    async signInWithGoogle() {
        if (!this.isAvailable()) {
            throw new Error('Firebase is not available');
        }

        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(this.auth, provider);
            return result.user;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    // Sign out
    async signOut() {
        if (!this.isAvailable()) return;

        try {
            await firebaseSignOut(this.auth);
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    // Get user's Firestore document path
    _userDocPath(collectionName) {
        if (!this.user) throw new Error('Not signed in');
        return `users/${this.user.uid}/${collectionName}`;
    }

    // Sync decks to Firestore
    async syncDecksToCloud(decks) {
        if (!this.isSignedIn()) return;

        try {
            const userDocRef = doc(this.db, 'users', this.user.uid);

            // Save decks as a single document (simpler for small data)
            await setDoc(userDocRef, {
                decks: decks,
                lastUpdated: serverTimestamp(),
                email: this.user.email
            }, { merge: true });

            console.log('Decks synced to cloud');
        } catch (error) {
            console.error('Error syncing decks to cloud:', error);
            throw error;
        }
    }

    // Sync games to Firestore
    async syncGamesToCloud(games) {
        if (!this.isSignedIn()) return;

        try {
            const userDocRef = doc(this.db, 'users', this.user.uid);

            await setDoc(userDocRef, {
                games: games,
                lastUpdated: serverTimestamp(),
                email: this.user.email
            }, { merge: true });

            console.log('Games synced to cloud');
        } catch (error) {
            console.error('Error syncing games to cloud:', error);
            throw error;
        }
    }

    // Get decks from Firestore
    async getDecksFromCloud() {
        if (!this.isSignedIn()) return null;

        try {
            const userDocRef = doc(this.db, 'users', this.user.uid);
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                return docSnap.data().decks || [];
            }
            return [];
        } catch (error) {
            console.error('Error getting decks from cloud:', error);
            return null;
        }
    }

    // Get games from Firestore
    async getGamesFromCloud() {
        if (!this.isSignedIn()) return null;

        try {
            const userDocRef = doc(this.db, 'users', this.user.uid);
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                return docSnap.data().games || [];
            }
            return [];
        } catch (error) {
            console.error('Error getting games from cloud:', error);
            return null;
        }
    }

    // Full sync - merge local and cloud data
    async fullSync(localDecks, localGames) {
        if (!this.isSignedIn()) {
            return { decks: localDecks, games: localGames, synced: false };
        }

        try {
            // Get cloud data
            const cloudDecks = await this.getDecksFromCloud() || [];
            const cloudGames = await this.getGamesFromCloud() || [];

            // Merge strategy: combine by ID, prefer newer data
            const mergedDecks = this._mergeById(localDecks, cloudDecks);
            const mergedGames = this._mergeById(localGames, cloudGames);

            // Push merged data back to cloud
            await this.syncDecksToCloud(mergedDecks);
            await this.syncGamesToCloud(mergedGames);

            console.log('Full sync complete');
            return { decks: mergedDecks, games: mergedGames, synced: true };
        } catch (error) {
            console.error('Full sync error:', error);
            return { decks: localDecks, games: localGames, synced: false };
        }
    }

    // Merge arrays by ID, combining unique items
    _mergeById(local, cloud) {
        const merged = new Map();

        // Add all local items
        local.forEach(item => {
            merged.set(item.id, item);
        });

        // Add cloud items (won't overwrite if ID exists)
        cloud.forEach(item => {
            if (!merged.has(item.id)) {
                merged.set(item.id, item);
            }
        });

        return Array.from(merged.values());
    }
}

// Export singleton instance
export const firebaseSync = new FirebaseSync();
