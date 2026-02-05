// Storage Adapter - Environment detection and routing
// Detects whether running in Electron or browser and provides appropriate storage implementation

class StorageAdapter {
    constructor() {
        this._ready = false;
        this._readyPromise = null;
        this._implementation = null;
    }

    // Check if running in Electron environment
    isElectron() {
        return typeof window !== 'undefined' &&
               typeof window.process === 'object' &&
               window.process.type === 'renderer';
    }

    // Initialize the appropriate storage implementation
    async ready() {
        if (this._ready) return;
        if (this._readyPromise) return this._readyPromise;

        this._readyPromise = this._initialize();
        await this._readyPromise;
        this._ready = true;
    }

    async _initialize() {
        if (this.isElectron()) {
            // In Electron, use require to load the CommonJS module
            // eslint-disable-next-line no-undef
            const { ElectronStorage } = require('./electron-storage.cjs');
            this._implementation = new ElectronStorage();
        } else {
            // In browser, use dynamic import for ES module
            const { PWAStorage } = await import('./pwa-storage.js');
            this._implementation = new PWAStorage();
            await this._implementation.init();
        }
    }

    // Commander operations
    async getCommanders() {
        return this._implementation.getCommanders();
    }

    // Deck operations
    async getMyDecks() {
        return this._implementation.getMyDecks();
    }

    async saveDeck(deck) {
        return this._implementation.saveDeck(deck);
    }

    async updateDeck(deckId, updates) {
        return this._implementation.updateDeck(deckId, updates);
    }

    async deleteDeck(deckId) {
        return this._implementation.deleteDeck(deckId);
    }

    async toggleDeckArchive(deckId) {
        return this._implementation.toggleDeckArchive(deckId);
    }

    async saveDecksOrder(decks) {
        return this._implementation.saveDecksOrder(decks);
    }

    // Game operations
    async getGames() {
        return this._implementation.getGames();
    }

    async saveGame(game) {
        return this._implementation.saveGame(game);
    }

    async updateGame(game) {
        return this._implementation.updateGame(game);
    }

    async deleteGame(gameId) {
        return this._implementation.deleteGame(gameId);
    }

    // Export operations
    async exportToCsv() {
        return this._implementation.exportToCsv();
    }

    async exportToJson() {
        return this._implementation.exportToJson();
    }

    // External link handling
    openExternal(url) {
        return this._implementation.openExternal(url);
    }

    // Firebase Auth - only available in PWA, not in Electron desktop app
    isFirebaseAvailable() {
        if (this._implementation?.isFirebaseAvailable) {
            return this._implementation.isFirebaseAvailable();
        }
        // Electron desktop app is offline-only
        return false;
    }

    isSignedIn() {
        if (this._implementation?.isSignedIn) {
            return this._implementation.isSignedIn();
        }
        return false;
    }

    getCurrentUser() {
        if (this._implementation?.getCurrentUser) {
            return this._implementation.getCurrentUser();
        }
        return null;
    }

    onAuthStateChange(callback) {
        if (this._implementation?.onAuthStateChange) {
            return this._implementation.onAuthStateChange(callback);
        }
        // Electron: no auth state changes, return no-op unsubscribe
        return () => {};
    }

    async signInWithGoogle() {
        if (this._implementation?.signInWithGoogle) {
            return this._implementation.signInWithGoogle();
        }
        throw new Error('Sign in not available in desktop app');
    }

    async signInWithEmailPassword(email, password) {
        if (this._implementation?.signInWithEmailPassword) {
            return this._implementation.signInWithEmailPassword(email, password);
        }
        throw new Error('Sign in not available in desktop app');
    }

    async createAccountWithEmail(email, password) {
        if (this._implementation?.createAccountWithEmail) {
            return this._implementation.createAccountWithEmail(email, password);
        }
        throw new Error('Sign in not available in desktop app');
    }

    async sendPasswordReset(email) {
        if (this._implementation?.sendPasswordReset) {
            return this._implementation.sendPasswordReset(email);
        }
        throw new Error('Password reset not available in desktop app');
    }

    async signOut() {
        if (this._implementation?.signOut) {
            return this._implementation.signOut();
        }
    }

    // User Profile Methods - PWA only feature
    async initUserProfile() {
        if (this._implementation?.initUserProfile) {
            return this._implementation.initUserProfile();
        }
        return null;
    }

    async getUserProfile() {
        if (this._implementation?.getUserProfile) {
            return this._implementation.getUserProfile();
        }
        return null;
    }

    async updateUsername(newUsername) {
        if (this._implementation?.updateUsername) {
            return this._implementation.updateUsername(newUsername);
        }
        throw new Error('Username update not available in desktop app');
    }

    // Friend Management Methods - PWA only feature
    async addFriendByFriendId(friendId) {
        if (this._implementation?.addFriendByFriendId) {
            return this._implementation.addFriendByFriendId(friendId);
        }
        throw new Error('Friend features not available in desktop app');
    }

    async removeFriend(friendId) {
        if (this._implementation?.removeFriend) {
            return this._implementation.removeFriend(friendId);
        }
        throw new Error('Friend features not available in desktop app');
    }

    async getOnlineFriends() {
        if (this._implementation?.getOnlineFriends) {
            return this._implementation.getOnlineFriends();
        }
        return [];
    }

    async getFriendPublicData(friendId) {
        if (this._implementation?.getFriendPublicData) {
            return this._implementation.getFriendPublicData(friendId);
        }
        throw new Error('Friend features not available in desktop app');
    }
}

// Export singleton instance
export const storage = new StorageAdapter();
