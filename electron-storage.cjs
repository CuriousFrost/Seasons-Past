// Electron Storage - IPC wrapper for Electron environment
// Wraps all IPC calls to main process for file system operations

const { ipcRenderer, shell } = require('electron');

class ElectronStorage {
    // Commander operations
    async getCommanders() {
        return ipcRenderer.invoke('get-commanders');
    }

    // Deck operations
    async getMyDecks() {
        return ipcRenderer.invoke('get-my-decks');
    }

    async saveDeck(deck) {
        return ipcRenderer.invoke('save-deck', deck);
    }

    async updateDeck(deckId, updates) {
        return ipcRenderer.invoke('update-deck', deckId, updates);
    }

    async deleteDeck(deckId) {
        return ipcRenderer.invoke('delete-deck', deckId);
    }

    async toggleDeckArchive(deckId) {
        return ipcRenderer.invoke('toggle-deck-archive', deckId);
    }

    async saveDecksOrder(decks) {
        return ipcRenderer.invoke('save-decks-order', decks);
    }

    // Game operations
    async getGames() {
        return ipcRenderer.invoke('get-games');
    }

    async saveGame(game) {
        return ipcRenderer.invoke('save-game', game);
    }

    async updateGame(game) {
        return ipcRenderer.invoke('update-game', game);
    }

    async deleteGame(gameId) {
        return ipcRenderer.invoke('delete-game', gameId);
    }

    // Export operations
    async exportToCsv() {
        return ipcRenderer.invoke('export-to-csv');
    }

    async exportToJson() {
        return ipcRenderer.invoke('export-to-json');
    }

    // External link handling
    openExternal(url) {
        shell.openExternal(url);
    }
}

module.exports = { ElectronStorage };
