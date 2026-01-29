# MTG Commander Tracker

Track your Magic: The Gathering Commander (EDH) games, deck performance, and statistics. Available as a **desktop app** or **web app (PWA)**.

![Electron](https://img.shields.io/badge/Electron-40.0.0-47848F?logo=electron&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Web-0078D6?logo=windows&logoColor=white)
![License](https://img.shields.io/badge/License-ISC-blue)

## Download / Use

### Web App (PWA) - Recommended for Mobile
**[Launch Web App](https://curiousfrost.github.io/MTG_Commander_Tracker_App/)**

- Works on any device with a browser (phone, tablet, computer)
- Can be installed to your home screen for app-like experience
- Works offline after first load

### Desktop App (Windows)
Download the latest portable `.exe` from the [Releases](https://github.com/CuriousFrost/MTG_Commander_Tracker_App/releases) page.

No installation required - just run the executable!
## Features

### Deck Management
- Create and manage multiple Commander decks
- Import decklists directly from [Moxfield](https://www.moxfield.com/)
- View decklists in a clean modal popup with category organization
- Copy decklists to clipboard in standard text format
- Quick link to EDHREC for any commander
- Archive/retire decks you no longer play (keeps historical data)

### Game Logging
- Log games with date, deck used, and opponents faced
- Smart win/loss detection - automatically determines winning color identity
- Autocomplete search for 3,000+ legal commanders
- Track up to 5 opponents per game

### Statistics Dashboard
- Total games, wins, losses, and win rate
- Current and best win/loss streaks
- Top 3 most-faced commanders with card images
- Visual charts powered by Chart.js:
  - Win/Loss pie chart
  - Games over time (monthly)
  - Deck performance comparison
  - Wins by color identity
- Filter stats by year or view lifetime data
- Detailed deck performance table

### Game History
- Comprehensive game log with filtering:
  - Filter by deck, result, date range, or opponent
- Export to CSV or JSON for backup/analysis
- Delete individual games

### Customization
- 5 color themes:
  - **Default (Blue)** - Dark blue with gold accents
  - **Light Mode** - Clean light theme
  - **Comfy (Warm)** - Warm browns and cream colors
  - **True Dark** - Discord-style dark mode
  - **Monokai** - VS Code Monokai inspired

## Screenshots

*Coming soon*

## Installation

### Build from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/CuriousFrost/MTG_Commander_Tracker_App.git
   cd MTG_Commander_Tracker_App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm start
   ```

### Build Commands

| Command | Description |
|---------|-------------|
| `npm run build:electron` | Build Windows desktop `.exe` (output: `dist/`) |
| `npm run build:pwa` | Build PWA for web deployment (output: `pwa-dist/`) |
| `npm run serve:pwa` | Serve PWA locally for testing |
| `npm run generate-icons` | Regenerate PWA icons from SVG |

## Tech Stack

- **Desktop:** [Electron](https://www.electronjs.org/) 40.0.0
- **PWA:** Service Workers + IndexedDB
- **Cloud Sync:** [Firebase](https://firebase.google.com/) (Authentication + Firestore) - Optional
- **Build Tools:** [electron-builder](https://www.electron.build/), [sharp](https://sharp.pixelplumbing.com/) (icons)
- **Charts:** [Chart.js](https://www.chartjs.org/) 3.9.1
- **Icons:** [Mana Font](https://mana.andrewgioia.com/) for MTG mana symbols
- **APIs:**
  - [Scryfall](https://scryfall.com/docs/api) - Commander data and card images
  - [Moxfield](https://www.moxfield.com/) - Decklist imports

## Data Storage

By default, your data is stored locally on your device. **Optional cloud sync** is available for PWA users.

### Desktop App (Electron)
Data is stored locally in JSON files in the app folder:
- `commanders.json` - Cached commander data from Scryfall
- `myDecks.json` - Your deck collection
- `games.json` - Your game history

### Web App (PWA) - Local Storage
Data is stored in your browser's **IndexedDB** database:
- Stored locally on your device, specific to that browser
- **Does NOT sync** across devices or browsers (unless cloud sync is enabled)
- Persists until you clear browser data or uninstall the PWA

### Cloud Sync (Optional - PWA Only)

The PWA supports **optional cloud sync** via Firebase, allowing you to:
- Sign in with Google
- Sync your decks and games across all your devices
- Never lose your data if you clear browser storage

**Cloud sync is disabled by default.** To enable it for your own deployment, see [Setting Up Cloud Sync](#setting-up-cloud-sync) below.

### Important for PWA Users (Without Cloud Sync)

| Scenario | What Happens |
|----------|--------------|
| Switching phones/computers | Start fresh - data doesn't transfer |
| Clearing browser data | **Deletes all your data** |
| Uninstalling the PWA | May delete your data (browser-dependent) |
| Using a different browser | Separate data - browsers don't share |

### Backing Up Your Data

**Always export your data regularly!** Use the **Export to JSON** button in Game History to save a backup file. This backup can be kept safely and used to restore your data if needed.

## Setting Up Cloud Sync

To enable cloud sync for your own deployment:

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project

2. **Enable Authentication**
   - Go to Authentication → Sign-in method
   - Enable Google sign-in

3. **Enable Firestore Database**
   - Go to Firestore Database
   - Create database (start in test mode for development)

4. **Get Your Config**
   - Go to Project Settings → Your Apps
   - Add a web app if you haven't
   - Copy the config object

5. **Configure the App**
   - Copy `firebase-config.example.js` to `firebase-config.js`
   - Paste your Firebase config values
   - Rebuild the PWA: `npm run build:pwa`

6. **Set Firestore Rules** (for production)
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## License

ISC License

## Acknowledgments

- Card data provided by [Scryfall](https://scryfall.com/)
- Mana symbols from [Mana Font](https://mana.andrewgioia.com/) by Andrew Gioia
- Decklist imports powered by [Moxfield](https://www.moxfield.com/)

---

*Magic: The Gathering is a trademark of Wizards of the Coast LLC. This application is not affiliated with or endorsed by Wizards of the Coast.*
