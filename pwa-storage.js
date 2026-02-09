// PWA Storage - IndexedDB implementation for browser environment
// Provides offline-capable storage using IndexedDB and Scryfall API for commanders
// Optional Firebase cloud sync for backup across devices

import { firebaseSync } from './firebase-sync.js';

const DB_NAME = 'mtg-commander-tracker';
const DB_VERSION = 1;

export class PWAStorage {
    constructor() {
        this.db = null;
        this._commandersCache = null;
        this._commandersCacheTime = null;
        this._commandersCacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours
        this._syncEnabled = false;
    }

    // Initialize IndexedDB and Firebase
    async init() {
        // Initialize IndexedDB
        await this._initIndexedDB();

        // Initialize Firebase (if configured)
        this._syncEnabled = firebaseSync.init();

        // If user is already signed in, sync on load
        if (firebaseSync.isSignedIn()) {
            await this._performSync();
        }
    }

    async _initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('decks')) {
                    const decksStore = db.createObjectStore('decks', { keyPath: 'id' });
                    decksStore.createIndex('name', 'name', { unique: false });
                }

                if (!db.objectStoreNames.contains('games')) {
                    const gamesStore = db.createObjectStore('games', { keyPath: 'id' });
                    gamesStore.createIndex('date', 'date', { unique: false });
                }

                if (!db.objectStoreNames.contains('commanders')) {
                    db.createObjectStore('commanders', { keyPath: 'name' });
                }

                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }

    // Firebase Auth Methods
    isFirebaseAvailable() {
        return this._syncEnabled;
    }

    isSignedIn() {
        return firebaseSync.isSignedIn();
    }

    getCurrentUser() {
        return firebaseSync.getCurrentUser();
    }

    onAuthStateChange(callback) {
        return firebaseSync.onAuthStateChange(callback);
    }

    async signInWithGoogle() {
        const user = await firebaseSync.signInWithGoogle();
        // Sync data after sign in
        await this._performSync();
        return user;
    }

    async signInWithEmailPassword(email, password) {
        const user = await firebaseSync.signInWithEmailPassword(email, password);
        // Sync data after sign in
        await this._performSync();
        return user;
    }

    async createAccountWithEmail(email, password) {
        const user = await firebaseSync.createAccountWithEmail(email, password);
        // Sync data after sign in
        await this._performSync();
        return user;
    }

    async sendPasswordReset(email) {
        return firebaseSync.sendPasswordReset(email);
    }

    async signOut() {
        await firebaseSync.signOut();
        // Clear local data on sign out (true cloud-only mode)
        await this._clearStore('decks');
        await this._clearStore('games');
        console.log('Local data cleared on sign out');
    }

    // Clear all items in a store
    async _clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Perform full sync with cloud
    async _performSync() {
        if (!firebaseSync.isSignedIn()) return;

        try {
            const localDecks = await this._getAll('decks');
            const localGames = await this._getAll('games');
            const localBuddies = JSON.parse(localStorage.getItem('podBuddies') || '[]');

            const result = await firebaseSync.fullSync(localDecks, localGames, localBuddies);

            if (result.synced) {
                // Update local storage with merged data
                await this._replaceAll('decks', result.decks);
                await this._replaceAll('games', result.games);
                // Update local buddies
                localStorage.setItem('podBuddies', JSON.stringify(result.buddies));
                console.log('Sync complete: local storage updated');
            }
        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    // Replace all items in a store
    async _replaceAll(storeName, items) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);

            store.clear();
            items.forEach(item => store.put(item));

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // Sync decks to cloud (called after local changes)
    async _syncDecksToCloud() {
        if (!firebaseSync.isSignedIn()) return;
        const decks = await this._getAll('decks');
        await firebaseSync.syncDecksToCloud(decks);
    }

    // Sync games to cloud (called after local changes)
    async _syncGamesToCloud() {
        if (!firebaseSync.isSignedIn()) return;
        const games = await this._getAll('games');
        await firebaseSync.syncGamesToCloud(games);
    }

    // Generic transaction helper
    _transaction(storeName, mode = 'readonly') {
        const tx = this.db.transaction(storeName, mode);
        return tx.objectStore(storeName);
    }

    // Generic get all helper
    async _getAll(storeName) {
        return new Promise((resolve, reject) => {
            const store = this._transaction(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic put helper
    async _put(storeName, data) {
        return new Promise((resolve, reject) => {
            const store = this._transaction(storeName, 'readwrite');
            const request = store.put(data);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Generic delete helper
    async _delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const store = this._transaction(storeName, 'readwrite');
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Commander operations - fetch from Scryfall with caching
    async getCommanders() {
        // Check memory cache first
        if (this._commandersCache &&
            this._commandersCacheTime &&
            (Date.now() - this._commandersCacheTime) < this._commandersCacheMaxAge) {
            return this._commandersCache;
        }

        // Check IndexedDB cache
        const cachedCommanders = await this._getAll('commanders');
        const metadata = await this._getMetadata('commanders_updated');

        if (cachedCommanders.length > 0 && metadata) {
            const cacheAge = Date.now() - new Date(metadata.value).getTime();
            if (cacheAge < this._commandersCacheMaxAge) {
                this._commandersCache = cachedCommanders;
                this._commandersCacheTime = Date.now();
                return cachedCommanders;
            }
        }

        // Fetch from Scryfall
        try {
            const commanders = await this._fetchCommandersFromScryfall();

            // Cache in IndexedDB
            await this._cacheCommanders(commanders);

            // Cache in memory
            this._commandersCache = commanders;
            this._commandersCacheTime = Date.now();

            return commanders;
        } catch (error) {
            console.error('Error fetching commanders:', error);
            // Return cached data if available, even if stale
            if (cachedCommanders.length > 0) {
                this._commandersCache = cachedCommanders;
                this._commandersCacheTime = Date.now();
                return cachedCommanders;
            }
            return [];
        }
    }

    async _fetchCommandersFromScryfall() {
        console.log('Fetching commanders from Scryfall...');
        let allCommanders = [];
        let hasMore = true;
        let nextPage = 'https://api.scryfall.com/cards/search?q=is:commander';

        while (hasMore) {
            const response = await fetch(nextPage);
            if (!response.ok) {
                throw new Error(`Scryfall API error: ${response.status}`);
            }

            const data = await response.json();

            const commanders = data.data.map(card => ({
                name: card.name,
                colorIdentity: card.color_identity || [],
                colors: card.colors || [],
                type: card.type_line
            }));

            allCommanders = allCommanders.concat(commanders);

            hasMore = data.has_more;
            if (hasMore) {
                nextPage = data.next_page;
                // Respect Scryfall rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log(`Fetched ${allCommanders.length} commanders...`);
        }

        console.log(`Completed: ${allCommanders.length} total commanders`);
        return allCommanders;
    }

    async _cacheCommanders(commanders) {
        const tx = this.db.transaction(['commanders', 'metadata'], 'readwrite');
        const commandersStore = tx.objectStore('commanders');
        const metadataStore = tx.objectStore('metadata');

        // Clear existing commanders
        commandersStore.clear();

        // Add all commanders
        for (const commander of commanders) {
            commandersStore.put(commander);
        }

        // Update metadata
        metadataStore.put({ key: 'commanders_updated', value: new Date().toISOString() });

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async _getMetadata(key) {
        return new Promise((resolve, reject) => {
            const store = this._transaction('metadata');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Deck operations
    async getMyDecks() {
        const decks = await this._getAll('decks');
        // Sort by sortOrder if it exists, otherwise maintain original order
        return decks.sort((a, b) => {
            const orderA = a.sortOrder !== undefined ? a.sortOrder : Infinity;
            const orderB = b.sortOrder !== undefined ? b.sortOrder : Infinity;
            return orderA - orderB;
        });
    }

    async saveDeck(deck) {
        await this._put('decks', deck);
        this._syncDecksToCloud(); // Fire and forget
        return this._getAll('decks');
    }

    async updateDeck(deckId, updates) {
        const decks = await this._getAll('decks');
        const deckIndex = decks.findIndex(d => d.id === deckId);

        if (deckIndex !== -1) {
            const updatedDeck = { ...decks[deckIndex], ...updates };
            await this._put('decks', updatedDeck);
        }

        this._syncDecksToCloud(); // Fire and forget
        return this._getAll('decks');
    }

    async deleteDeck(deckId) {
        await this._delete('decks', deckId);
        this._syncDecksToCloud(); // Fire and forget
        return this._getAll('decks');
    }

    async toggleDeckArchive(deckId) {
        const decks = await this._getAll('decks');
        const deck = decks.find(d => d.id === deckId);

        if (deck) {
            deck.archived = !deck.archived;
            await this._put('decks', deck);
        }

        this._syncDecksToCloud(); // Fire and forget
        return this._getAll('decks');
    }

    async saveDecksOrder(orderedDecks) {
        // Clear existing decks and save in new order
        const tx = this.db.transaction('decks', 'readwrite');
        const store = tx.objectStore('decks');

        // Update each deck with its new sort order
        for (let i = 0; i < orderedDecks.length; i++) {
            orderedDecks[i].sortOrder = i;
            store.put(orderedDecks[i]);
        }

        await tx.done;
        this._syncDecksToCloud(); // Fire and forget
        return orderedDecks;
    }

    // Game operations
    async getGames() {
        return this._getAll('games');
    }

    async saveGame(game) {
        await this._put('games', game);
        this._syncGamesToCloud(); // Fire and forget
        return this._getAll('games');
    }

    async updateGame(game) {
        await this._put('games', game);
        this._syncGamesToCloud(); // Fire and forget
        return this._getAll('games');
    }

    async deleteGame(gameId) {
        await this._delete('games', gameId);
        this._syncGamesToCloud(); // Fire and forget
        return this._getAll('games');
    }

    // Export operations - using browser download API
    async exportToCsv() {
        const games = await this._getAll('games');

        if (games.length === 0) {
            return { success: false, message: 'No games to export' };
        }

        // Create CSV content
        const headers = 'Date,Deck Name,Commander,Result,Winner Color Identity,Opponents,Total Players\n';
        const rows = games.map(game => {
            const opponents = game.opponents.map(o => o.name).join('; ');
            return `${game.date},"${game.myDeck.name}","${game.myDeck.commander.name}",${game.won ? 'Win' : 'Loss'},${game.winnerColorIdentity},"${opponents}",${game.totalPlayers}`;
        }).join('\n');

        const csvContent = headers + rows;

        // Download using browser API
        this._downloadFile(csvContent, 'mtg-commander-games.csv', 'text/csv');

        return { success: true, message: 'CSV file downloaded' };
    }

    async exportToJson() {
        const games = await this._getAll('games');
        const decks = await this._getAll('decks');

        if (games.length === 0 && decks.length === 0) {
            return { success: false, message: 'No data to export' };
        }

        const exportData = {
            decks: decks,
            games: games,
            exportedAt: new Date().toISOString()
        };

        const jsonContent = JSON.stringify(exportData, null, 2);

        // Download using browser API
        this._downloadFile(jsonContent, 'mtg-commander-data.json', 'application/json');

        return { success: true, message: 'JSON file downloaded' };
    }

    _downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    }

    // External link handling - opens in new tab
    openExternal(url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    // User Profile Methods (Firebase)
    async initUserProfile() {
        return firebaseSync.initUserProfile();
    }

    async getUserProfile() {
        return firebaseSync.getUserProfile();
    }

    async updateUsername(newUsername) {
        return firebaseSync.updateUsername(newUsername);
    }

    // Friend Management Methods (Firebase)
    async addFriendByFriendId(friendId) {
        return firebaseSync.addFriendByFriendId(friendId);
    }

    async removeFriend(friendId) {
        return firebaseSync.removeFriend(friendId);
    }

    async getOnlineFriends() {
        return firebaseSync.getOnlineFriends();
    }

    async getFriendPublicData(friendId) {
        return firebaseSync.getFriendPublicData(friendId);
    }

    // Friend Request Methods (Firebase)
    async getPendingFriendRequests() {
        return firebaseSync.getPendingFriendRequests();
    }

    async acceptFriendRequest(fromFriendId) {
        return firebaseSync.acceptFriendRequest(fromFriendId);
    }

    async declineFriendRequest(fromFriendId) {
        return firebaseSync.declineFriendRequest(fromFriendId);
    }

    // Pod Buddies Cloud Sync
    async syncBuddiesToCloud(buddies) {
        return firebaseSync.syncBuddiesToCloud(buddies);
    }
}
