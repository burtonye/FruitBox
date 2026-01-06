# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fruit Box** is a real-time two-player multiplayer browser game. Players collaborate to select apples that sum to a target number, with Player 1 scoring and Player 2 providing visual assistance.

## Architecture

### Project Structure
```
FruitBox/
├── server.js           # Express + Socket.IO backend server
├── package.json        # Node.js dependencies and scripts
├── render.yaml         # Render deployment configuration
├── public/             # Static files served by Express
│   ├── index.html      # Multiplayer game frontend
│   ├── 3.mp3           # Background music
│   └── icon.svg        # App icon
├── index.html          # Legacy single-player version
└── tests/              # Playwright test suite
```

### Backend (server.js)
- **Express.js** serves static files from `public/`
- **Socket.IO** handles real-time WebSocket communication
- **Room Management**: 6-character alphanumeric room codes
- **Player Roles**: First player = P1 (scorer), Second = P2 (helper)

### Frontend (public/index.html)
Single-file frontend containing:
- HTML markup (lobby, home screen, game board, overlays)
- CSS styling (player-specific colors: P1=gold, P2=cyan)
- JavaScript game logic + Socket.IO client

### Real-time Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `create-room` | Client→Server | Create new game room |
| `join-room` | Client→Server | Join existing room by code |
| `start-game` | Client→Server | P1 initiates game with config |
| `selection-update` | Client→Server→Client | Broadcast selection box position |
| `selection-complete` | Client→Server | P1 submits valid selection |
| `game-state-update` | Server→Client | Sync score and board changes |
| `game-over` | Client→Server→Client | End game, show results |

## Game Flow

```
[Lobby] → Create/Join Room → [Waiting Room] → P2 Joins → [Home Screen]
                                                              ↓
                                         P1 clicks "Start" → [Game Board]
                                                              ↓
                                         Timer ends/No moves → [Game Over]
                                                              ↓
                                                         [Home Screen]
```

## Player Roles

| Player | Actions | Scoring |
|--------|---------|---------|
| **P1** | Draw selection boxes, start game, configure settings | ✅ Scores points |
| **P2** | Draw selection boxes (visible to P1 in cyan) | ❌ Cannot score |

Both players see each other's selection boxes in real-time with different colors.

## Running Locally

```bash
# Install dependencies
npm install

# Start server
npm start

# Open in browser
# http://localhost:3000
```

## Deploying to Render

1. Push to GitHub
2. Connect repository to Render
3. Render auto-detects `render.yaml` Blueprint
4. Deploy as Web Service

Or manually:
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: Node.js

## Key Technical Details

- **Dependencies**: Express 4.18, Socket.IO 4.7
- **Port**: Uses `PORT` env var (default 3000)
- **No database**: All state is in-memory (rooms cleared on restart)
- **Offline audio**: Background music bundled locally

## Common Modifications

### Server (server.js)
- **Room expiration**: Add timeout to clean up inactive rooms
- **Persistent scores**: Integrate database (Redis, MongoDB)
- **More players**: Extend room player array and role logic

### Frontend (public/index.html)
- **Grid size**: Modify `DEFAULT_LAYOUT` and `COMPACT_LAYOUT` objects
- **Game duration**: Change `TIME_LIMIT_SECONDS` default value
- **Selection colors**: Update CSS variables `--p1-color` and `--p2-color`
- **Add chat**: Emit/listen for chat events via Socket.IO

## Testing

```bash
# Run Playwright tests (single-player legacy)
npm test

# Run with UI
npm run test:ui
```

## Legacy Single-Player

The original single-player game is preserved at `index.html` (root level). The multiplayer version is in `public/index.html`.
