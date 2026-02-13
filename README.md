# Seasons Past

A web app for tracking your Magic: The Gathering Commander (EDH) games, decks, and play statistics.

**[app.seasonspast.app](https://app.seasonspast.app)**

## Features

- **Game Logging** — Record game results with your deck, opponents, commanders, and color identities
- **Deck Management** — Track your commander decks with full-art card images via the Scryfall API, import decklists, and organize your library
- **Statistics Dashboard** — Win rates, streaks, games over time, color identity breakdowns, and head-to-head buddy stats
- **Most Faced Commanders** — Visual grid of the commanders you play against most, with win rates
- **Pod Buddies** — Manage your regular playgroup and view stats against each player
- **Life Counter** — In-app life tracking for your pod
- **Friend System** — Add friends via unique Friend IDs and view their profiles
- **Data Export** — Export your games and decks as CSV or JSON
- **7 Themes** — Dark and light themes including Default Dark, Midnight, Forest, Blood Moon, Dimir, Azorius, and Selesnya
- **Cloud Sync** — All data syncs to Firestore across devices

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript 5.9](https://www.typescriptlang.org/)
- [Vite 7](https://vite.dev/) for build tooling
- [Tailwind CSS v4](https://tailwindcss.com/) for styling
- [shadcn/ui](https://ui.shadcn.com/) component library
- [Firebase](https://firebase.google.com/) — Authentication (Google + email/password) and Firestore database
- [Recharts](https://recharts.org/) for charts
- [Scryfall API](https://scryfall.com/docs/api) for card images and commander search
- [Lucide](https://lucide.dev/) for icons

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- A Firebase project with Authentication and Firestore enabled

### Setup

```bash
git clone https://github.com/CuriousFrost/Seasons-Past.git
cd Seasons-Past
npm install
```

Update `src/lib/firebase.ts` with your Firebase project credentials if running your own instance.

### Development

```bash
npm run dev
```

Opens the app at `http://localhost:5173`.

### Production Build

```bash
npm run build
```

Outputs to `dist/`. The build runs TypeScript type checking before bundling.

## Deployment

The app deploys automatically to GitHub Pages via GitHub Actions on every push to `main`. The workflow (`.github/workflows/deploy.yml`) runs the build and deploys the `dist/` folder.

Custom domain `app.seasonspast.app` is configured via `public/CNAME`.

## Project Structure

```
src/
  components/       App components
    ui/             shadcn/ui primitives
    commanders/     Deck management components
    statistics/     Stats charts and tables
    games/          Game logging components
    pod-buddies/    Pod buddy components
    friends/        Friend system components
  pages/            Route pages
  contexts/         React contexts (Auth, Theme)
  hooks/            Custom hooks
  lib/              Firebase config, utilities, stats engine
  types/            TypeScript type definitions
  styles/           Theme CSS variables
  assets/           Static assets (logo SVG)
```

## License

This project is for personal use.
