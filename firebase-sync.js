// Firebase Sync Module
// Handles authentication and Firestore sync for cloud backup
// Uses Firebase from CDN (loaded in index.html)

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

        // Check if Firebase SDK is loaded (from CDN)
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK not loaded. Cloud sync unavailable.');
            return false;
        }

        try {
            // Initialize Firebase app
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(firebaseConfig);
            } else {
                this.app = firebase.apps[0];
            }

            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.initialized = true;

            // Listen for auth state changes
            this.auth.onAuthStateChanged((user) => {
                this.user = user;
                this._notifyAuthStateListeners(user);
                if (user) {
                    console.log('Signed in as:', user.email);
                } else {
                    console.log('Signed out');
                }
            });

            console.log('Firebase initialized successfully');
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

        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await this.auth.signInWithPopup(provider);
            return result.user;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    // Sign in with email/password
    async signInWithEmailPassword(email, password) {
        if (!this.isAvailable()) {
            throw new Error('Firebase is not available');
        }

        try {
            const result = await this.auth.signInWithEmailAndPassword(email, password);
            return result.user;
        } catch (error) {
            console.error('Email sign in error:', error);
            throw error;
        }
    }

    // Create new account with email/password
    async createAccountWithEmail(email, password) {
        if (!this.isAvailable()) {
            throw new Error('Firebase is not available');
        }

        try {
            const result = await this.auth.createUserWithEmailAndPassword(email, password);
            return result.user;
        } catch (error) {
            console.error('Create account error:', error);
            throw error;
        }
    }

    // Send password reset email
    async sendPasswordReset(email) {
        if (!this.isAvailable()) {
            throw new Error('Firebase is not available');
        }

        try {
            await this.auth.sendPasswordResetEmail(email);
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    }

    // Sign out
    async signOut() {
        if (!this.isAvailable()) return;

        try {
            await this.auth.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    // Sync decks to Firestore
    async syncDecksToCloud(decks) {
        if (!this.isSignedIn()) return;

        try {
            const userDocRef = this.db.collection('users').doc(this.user.uid);

            await userDocRef.set({
                decks: decks,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
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
            const userDocRef = this.db.collection('users').doc(this.user.uid);

            await userDocRef.set({
                games: games,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
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
            const userDocRef = this.db.collection('users').doc(this.user.uid);
            const docSnap = await userDocRef.get();

            if (docSnap.exists) {
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
            const userDocRef = this.db.collection('users').doc(this.user.uid);
            const docSnap = await userDocRef.get();

            if (docSnap.exists) {
                return docSnap.data().games || [];
            }
            return [];
        } catch (error) {
            console.error('Error getting games from cloud:', error);
            return null;
        }
    }

    // Sync buddies to Firestore
    async syncBuddiesToCloud(buddies) {
        if (!this.isSignedIn()) return;

        try {
            const userDocRef = this.db.collection('users').doc(this.user.uid);
            await userDocRef.set({
                podBuddies: buddies,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log('Buddies synced to cloud');
        } catch (error) {
            console.error('Error syncing buddies to cloud:', error);
        }
    }

    // Get buddies from Firestore
    async getBuddiesFromCloud() {
        if (!this.isSignedIn()) return null;

        try {
            const userDocRef = this.db.collection('users').doc(this.user.uid);
            const docSnap = await userDocRef.get();

            if (docSnap.exists) {
                return docSnap.data().podBuddies || [];
            }
            return [];
        } catch (error) {
            console.error('Error getting buddies from cloud:', error);
            return null;
        }
    }

    // Full sync - merge local and cloud data
    async fullSync(localDecks, localGames, localBuddies) {
        if (!this.isSignedIn()) {
            return { decks: localDecks, games: localGames, buddies: localBuddies || [], synced: false };
        }

        try {
            // Get cloud data
            const cloudDecks = await this.getDecksFromCloud() || [];
            const cloudGames = await this.getGamesFromCloud() || [];
            const cloudBuddies = await this.getBuddiesFromCloud() || [];

            // Merge strategy: combine by ID, prefer newer data
            const mergedDecks = this._mergeById(localDecks, cloudDecks);
            const mergedGames = this._mergeById(localGames, cloudGames);

            // Merge buddies: union of both lists (case-insensitive dedup)
            const buddySet = new Map();
            [...(localBuddies || []), ...cloudBuddies].forEach(b => {
                buddySet.set(b.toLowerCase(), b);
            });
            const mergedBuddies = Array.from(buddySet.values());

            // Push merged data back to cloud
            await this.syncDecksToCloud(mergedDecks);
            await this.syncGamesToCloud(mergedGames);
            await this.syncBuddiesToCloud(mergedBuddies);

            console.log('Full sync complete');
            return { decks: mergedDecks, games: mergedGames, buddies: mergedBuddies, synced: true };
        } catch (error) {
            console.error('Full sync error:', error);
            return { decks: localDecks, games: localGames, buddies: localBuddies || [], synced: false };
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

    // Generate unique 8-character Friend ID (excludes confusing chars: 0,O,1,I,L)
    _generateFriendId() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        let id = '';
        for (let i = 0; i < 8; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    // Initialize user profile on first sign-in
    async initUserProfile() {
        if (!this.isSignedIn()) return null;

        try {
            const userDocRef = this.db.collection('users').doc(this.user.uid);
            const docSnap = await userDocRef.get();
            const data = docSnap.exists ? docSnap.data() : {};

            // Check if user already has a friendId
            if (data.friendId) {
                return {
                    friendId: data.friendId,
                    username: data.username || this.user.email.split('@')[0],
                    friends: data.friends || []
                };
            }

            // Generate unique Friend ID
            let friendId = this._generateFriendId();
            let attempts = 0;
            const maxAttempts = 10;

            // Ensure friendId is unique
            while (attempts < maxAttempts) {
                const existingDoc = await this.db.collection('friendIds').doc(friendId).get();
                if (!existingDoc.exists) {
                    break;
                }
                friendId = this._generateFriendId();
                attempts++;
            }

            if (attempts >= maxAttempts) {
                throw new Error('Could not generate unique Friend ID');
            }

            // Set default username from email prefix
            const username = this.user.email.split('@')[0];

            // Create friendId lookup document
            await this.db.collection('friendIds').doc(friendId).set({
                uid: this.user.uid
            });

            // Update user profile
            await userDocRef.set({
                friendId: friendId,
                username: username,
                friends: [],
                email: this.user.email,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log('User profile initialized with Friend ID:', friendId);
            return { friendId, username, friends: [] };
        } catch (error) {
            console.error('Error initializing user profile:', error);
            throw error;
        }
    }

    // Get current user's profile data
    async getUserProfile() {
        if (!this.isSignedIn()) return null;

        try {
            const userDocRef = this.db.collection('users').doc(this.user.uid);
            const docSnap = await userDocRef.get();

            if (docSnap.exists) {
                const data = docSnap.data();
                return {
                    friendId: data.friendId || null,
                    username: data.username || this.user.email.split('@')[0],
                    friends: data.friends || [],
                    email: this.user.email
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }

    // Update display name
    async updateUsername(newUsername) {
        if (!this.isSignedIn()) return false;

        const trimmed = newUsername.trim();
        if (!trimmed || trimmed.length < 1 || trimmed.length > 30) {
            throw new Error('Username must be 1-30 characters');
        }

        try {
            const userDocRef = this.db.collection('users').doc(this.user.uid);
            await userDocRef.set({
                username: trimmed,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log('Username updated to:', trimmed);
            return true;
        } catch (error) {
            console.error('Error updating username:', error);
            throw error;
        }
    }

    // Send friend request by Friend ID
    async addFriendByFriendId(friendId) {
        if (!this.isSignedIn()) {
            throw new Error('Must be signed in to add friends');
        }

        const normalizedId = friendId.toUpperCase().trim();
        if (normalizedId.length !== 8) {
            throw new Error('Friend ID must be 8 characters');
        }

        try {
            const userProfile = await this.getUserProfile();
            if (!userProfile) {
                throw new Error('User profile not found');
            }

            if (normalizedId === userProfile.friendId) {
                throw new Error('You cannot add yourself as a friend');
            }

            if (userProfile.friends && userProfile.friends.includes(normalizedId)) {
                throw new Error('Already friends with this user');
            }

            // Look up friend ID to get their UID
            const friendIdDoc = await this.db.collection('friendIds').doc(normalizedId).get();
            if (!friendIdDoc.exists) {
                throw new Error('Friend ID not found');
            }

            const targetUid = friendIdDoc.data().uid;

            // Check if request already sent
            const targetUserDoc = await this.db.collection('users').doc(targetUid).get();
            const targetData = targetUserDoc.data();
            const pendingRequests = targetData.pendingFriendRequests || [];
            if (pendingRequests.some(r => r.fromFriendId === userProfile.friendId)) {
                throw new Error('Friend request already sent');
            }

            // Add friend request to target user's pendingFriendRequests
            const targetDocRef = this.db.collection('users').doc(targetUid);
            await targetDocRef.update({
                pendingFriendRequests: firebase.firestore.FieldValue.arrayUnion({
                    fromFriendId: userProfile.friendId,
                    fromUsername: userProfile.username,
                    timestamp: new Date().toISOString()
                })
            });

            console.log('Friend request sent to:', normalizedId);
            return true;
        } catch (error) {
            console.error('Error sending friend request:', error);
            throw error;
        }
    }

    // Get pending friend requests for current user
    async getPendingFriendRequests() {
        if (!this.isSignedIn()) return [];

        try {
            const userDocRef = this.db.collection('users').doc(this.user.uid);
            const docSnap = await userDocRef.get();
            if (!docSnap.exists) return [];

            return docSnap.data().pendingFriendRequests || [];
        } catch (error) {
            console.error('Error getting friend requests:', error);
            return [];
        }
    }

    // Accept a friend request
    async acceptFriendRequest(fromFriendId) {
        if (!this.isSignedIn()) {
            throw new Error('Must be signed in');
        }

        try {
            const userProfile = await this.getUserProfile();
            const userDocRef = this.db.collection('users').doc(this.user.uid);

            // Find the request to remove it
            const docSnap = await userDocRef.get();
            const pendingRequests = docSnap.data().pendingFriendRequests || [];
            const request = pendingRequests.find(r => r.fromFriendId === fromFriendId);
            if (!request) throw new Error('Friend request not found');

            // Add to both users' friends lists
            await userDocRef.update({
                friends: firebase.firestore.FieldValue.arrayUnion(fromFriendId),
                pendingFriendRequests: firebase.firestore.FieldValue.arrayRemove(request),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Also add current user to the requester's friends list
            const friendIdDoc = await this.db.collection('friendIds').doc(fromFriendId).get();
            if (friendIdDoc.exists) {
                const friendUid = friendIdDoc.data().uid;
                const friendDocRef = this.db.collection('users').doc(friendUid);
                await friendDocRef.update({
                    friends: firebase.firestore.FieldValue.arrayUnion(userProfile.friendId),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            console.log('Friend request accepted:', fromFriendId);
            return true;
        } catch (error) {
            console.error('Error accepting friend request:', error);
            throw error;
        }
    }

    // Decline a friend request
    async declineFriendRequest(fromFriendId) {
        if (!this.isSignedIn()) {
            throw new Error('Must be signed in');
        }

        try {
            const userDocRef = this.db.collection('users').doc(this.user.uid);
            const docSnap = await userDocRef.get();
            const pendingRequests = docSnap.data().pendingFriendRequests || [];
            const request = pendingRequests.find(r => r.fromFriendId === fromFriendId);
            if (!request) throw new Error('Friend request not found');

            await userDocRef.update({
                pendingFriendRequests: firebase.firestore.FieldValue.arrayRemove(request)
            });

            console.log('Friend request declined:', fromFriendId);
            return true;
        } catch (error) {
            console.error('Error declining friend request:', error);
            throw error;
        }
    }

    // Remove friend by Friend ID
    async removeFriend(friendId) {
        if (!this.isSignedIn()) {
            throw new Error('Must be signed in to remove friends');
        }

        try {
            const userDocRef = this.db.collection('users').doc(this.user.uid);
            await userDocRef.update({
                friends: firebase.firestore.FieldValue.arrayRemove(friendId),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('Friend removed:', friendId);
            return true;
        } catch (error) {
            console.error('Error removing friend:', error);
            throw error;
        }
    }

    // Get list of online friends with their usernames
    async getOnlineFriends() {
        if (!this.isSignedIn()) return [];

        try {
            const userProfile = await this.getUserProfile();
            if (!userProfile || !userProfile.friends || userProfile.friends.length === 0) {
                return [];
            }

            const friends = [];
            for (const friendId of userProfile.friends) {
                // Look up UID from friendId
                const friendIdDoc = await this.db.collection('friendIds').doc(friendId).get();
                if (!friendIdDoc.exists) continue;

                const friendUid = friendIdDoc.data().uid;
                const friendUserDoc = await this.db.collection('users').doc(friendUid).get();
                if (!friendUserDoc.exists) continue;

                const friendData = friendUserDoc.data();
                friends.push({
                    friendId: friendId,
                    username: friendData.username || 'Unknown',
                    uid: friendUid
                });
            }

            return friends;
        } catch (error) {
            console.error('Error getting online friends:', error);
            return [];
        }
    }

    // Fetch friend's public data (decks, games, stats)
    async getFriendPublicData(friendId) {
        if (!this.isSignedIn()) {
            throw new Error('Must be signed in to view friend data');
        }

        try {
            // Look up UID from friendId
            const friendIdDoc = await this.db.collection('friendIds').doc(friendId).get();
            if (!friendIdDoc.exists) {
                throw new Error('Friend not found');
            }

            const friendUid = friendIdDoc.data().uid;
            const friendUserDoc = await this.db.collection('users').doc(friendUid).get();
            if (!friendUserDoc.exists) {
                throw new Error('Friend data not found');
            }

            const data = friendUserDoc.data();
            return {
                username: data.username || 'Unknown',
                friendId: friendId,
                decks: data.decks || [],
                games: data.games || []
            };
        } catch (error) {
            console.error('Error getting friend public data:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const firebaseSync = new FirebaseSync();
