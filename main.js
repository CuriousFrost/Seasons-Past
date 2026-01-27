const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { loadCommanders } = require('./scryfall');

let mainWindow;
let commanders = [];

// File paths for data storage
const MY_DECKS_FILE = path.join(__dirname, 'myDecks.json');
const GAMES_FILE = path.join(__dirname, 'games.json');

function createWindow() {
  console.log('Creating window...');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  console.log('Window created!');
}

// Load or initialize JSON files
function loadJsonFile(filePath, defaultValue = []) {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }
  return defaultValue;
}

function saveJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// IPC Handlers
ipcMain.handle('get-commanders', () => {
  return commanders;
});

ipcMain.handle('get-my-decks', () => {
  return loadJsonFile(MY_DECKS_FILE);
});

ipcMain.handle('save-deck', (event, deck) => {
  const decks = loadJsonFile(MY_DECKS_FILE);
  decks.push(deck);
  saveJsonFile(MY_DECKS_FILE, decks);
  return decks;
});

ipcMain.handle('delete-deck', (event, deckId) => {
  const decks = loadJsonFile(MY_DECKS_FILE);
  const filteredDecks = decks.filter(d => d.id !== deckId);
  saveJsonFile(MY_DECKS_FILE, filteredDecks);
  return filteredDecks;
});

ipcMain.handle('get-games', () => {
  return loadJsonFile(GAMES_FILE);
});

ipcMain.handle('save-game', (event, game) => {
  const games = loadJsonFile(GAMES_FILE);
  games.push(game);
  saveJsonFile(GAMES_FILE, games);
  return games;
});

ipcMain.handle('delete-game', (event, gameId) => {
  const games = loadJsonFile(GAMES_FILE);
  const filteredGames = games.filter(g => g.id !== gameId);
  saveJsonFile(GAMES_FILE, filteredGames);
  return filteredGames;
});

ipcMain.handle('update-game', (event, updatedGame) => {
  const games = loadJsonFile(GAMES_FILE);
  const gameIndex = games.findIndex(g => g.id === updatedGame.id);
  if (gameIndex !== -1) {
    games[gameIndex] = updatedGame;
    saveJsonFile(GAMES_FILE, games);
  }
  return games;
});

ipcMain.handle('update-deck', (event, deckId, updates) => {
  const decks = loadJsonFile(MY_DECKS_FILE);
  const deckIndex = decks.findIndex(d => d.id === deckId);
  if (deckIndex !== -1) {
    decks[deckIndex] = { ...decks[deckIndex], ...updates };
    saveJsonFile(MY_DECKS_FILE, decks);
  }
  return decks;
});

// Export data
ipcMain.handle('export-to-csv', async (event) => {
  const games = loadJsonFile(GAMES_FILE);
  
  if (games.length === 0) {
    return { success: false, message: 'No games to export' };
  }
  
  // Show save dialog
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Games to CSV',
    defaultPath: 'mtg-commander-games.csv',
    filters: [
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  });
  
  if (result.canceled) {
    return { success: false, message: 'Export cancelled' };
  }
  
  // Create CSV content
  const headers = 'Date,Deck Name,Commander,Result,Winner Color Identity,Opponents,Total Players\n';
  const rows = games.map(game => {
    const opponents = game.opponents.map(o => o.name).join('; ');
    return `${game.date},"${game.myDeck.name}","${game.myDeck.commander.name}",${game.won ? 'Win' : 'Loss'},${game.winnerColorIdentity},"${opponents}",${game.totalPlayers}`;
  }).join('\n');
  
  fs.writeFileSync(result.filePath, headers + rows);
  
  return { success: true, message: `Exported to ${result.filePath}` };
});

ipcMain.handle('export-to-json', async (event) => {
  const games = loadJsonFile(GAMES_FILE);
  const decks = loadJsonFile(MY_DECKS_FILE);
  
  if (games.length === 0 && decks.length === 0) {
    return { success: false, message: 'No data to export' };
  }
  
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export All Data to JSON',
    defaultPath: 'mtg-commander-data.json',
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });
  
  if (result.canceled) {
    return { success: false, message: 'Export cancelled' };
  }
  
  const exportData = {
    decks: decks,
    games: games,
    exportedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2));
  
  return { success: true, message: `Exported to ${result.filePath}` };
});

app.whenReady().then(async () => {
  commanders = await loadCommanders();
  console.log(`Loaded ${commanders.length} commanders`);
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});