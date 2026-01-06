/**
 * Fruit Box Multiplayer Server
 * 
 * Real-time two-player game server using Express + Socket.IO
 * - Player 1: Main player who scores by selecting apples summing to target
 * - Player 2: Helper who can draw boxes (visible to P1) but cannot score
 * 
 * Room Management:
 * - Rooms are identified by 6-character alphanumeric codes
 * - First player to join becomes Player 1
 * - Second player becomes Player 2
 * - Rooms are cleaned up when both players leave
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to serve index.html for any route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Room storage
// Structure: { roomCode: { players: [socket1, socket2], gameState: {...}, hostSocketId: string } }
const rooms = new Map();

// Generate a random 6-character room code
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (0, O, 1, I)
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Generate unique room code
function getUniqueRoomCode() {
    let code;
    do {
        code = generateRoomCode();
    } while (rooms.has(code));
    return code;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`[${new Date().toISOString()}] Player connected: ${socket.id}`);

    let currentRoom = null;
    let playerNumber = null;

    // Create a new room
    socket.on('create-room', (callback) => {
        const roomCode = getUniqueRoomCode();
        
        rooms.set(roomCode, {
            players: [socket],
            playerIds: [socket.id],
            hostSocketId: socket.id,
            gameState: null,
            gameStarted: false,
            p2Selection: null // Track P2's current selection box
        });

        currentRoom = roomCode;
        playerNumber = 1;
        socket.join(roomCode);

        console.log(`[${new Date().toISOString()}] Room created: ${roomCode} by ${socket.id}`);

        callback({
            success: true,
            roomCode: roomCode,
            playerNumber: 1
        });
    });

    // Join an existing room
    socket.on('join-room', (roomCode, callback) => {
        const code = roomCode.toUpperCase().trim();
        
        if (!rooms.has(code)) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        const room = rooms.get(code);
        
        if (room.players.length >= 2) {
            callback({ success: false, error: 'Room is full' });
            return;
        }

        room.players.push(socket);
        room.playerIds.push(socket.id);
        currentRoom = code;
        playerNumber = 2;
        socket.join(code);

        console.log(`[${new Date().toISOString()}] Player ${socket.id} joined room: ${code}`);

        // Notify P1 that P2 has joined
        socket.to(code).emit('player-joined', { playerNumber: 2 });

        // Send current game state if game is in progress
        if (room.gameState) {
            socket.emit('game-state-sync', room.gameState);
        }

        callback({
            success: true,
            roomCode: code,
            playerNumber: 2,
            gameStarted: room.gameStarted,
            gameState: room.gameState
        });
    });

    // Start game (P1 only)
    socket.on('start-game', (gameConfig) => {
        if (!currentRoom || playerNumber !== 1) return;
        
        const room = rooms.get(currentRoom);
        if (!room) return;

        room.gameStarted = true;
        room.gameState = {
            board: gameConfig.board,
            targetSum: gameConfig.targetSum,
            timeLimit: gameConfig.timeLimit,
            score: 0,
            timeStart: Date.now(),
            rows: gameConfig.rows,
            cols: gameConfig.cols
        };

        // Broadcast game start to all players in room
        io.to(currentRoom).emit('game-started', room.gameState);
        
        console.log(`[${new Date().toISOString()}] Game started in room: ${currentRoom}`);
    });

    // Player selection box update (both players can draw)
    socket.on('selection-update', (selectionData) => {
        if (!currentRoom) return;
        
        const room = rooms.get(currentRoom);
        if (!room) return;

        // Broadcast selection to other players with player identifier
        socket.to(currentRoom).emit('remote-selection', {
            playerNumber: playerNumber,
            ...selectionData
        });
    });

    // Selection complete (only P1 can score)
    socket.on('selection-complete', (result) => {
        if (!currentRoom) return;
        
        const room = rooms.get(currentRoom);
        if (!room || !room.gameState) return;

        // Only P1 can modify game state
        if (playerNumber === 1 && result.valid) {
            room.gameState.score = result.newScore;
            room.gameState.board = result.newBoard;

            // Broadcast updated state to all players
            io.to(currentRoom).emit('game-state-update', {
                score: result.newScore,
                board: result.newBoard,
                removedApples: result.removedApples
            });
        }

        // Clear selection visualization for all players
        socket.to(currentRoom).emit('remote-selection-end', {
            playerNumber: playerNumber
        });
    });

    // P2 found a valid selection - notify P1
    socket.on('p2-valid-hint', (hintData) => {
        if (!currentRoom || playerNumber !== 2) return;
        
        const room = rooms.get(currentRoom);
        if (!room) return;

        // Send hint to P1 only
        socket.to(currentRoom).emit('show-hint', {
            x: hintData.x,
            y: hintData.y,
            width: hintData.width,
            height: hintData.height,
            sum: hintData.sum
        });
        
        console.log(`[${new Date().toISOString()}] P2 hint sent in room: ${currentRoom}`);
    });

    // Game over
    socket.on('game-over', (result) => {
        if (!currentRoom || playerNumber !== 1) return;
        
        const room = rooms.get(currentRoom);
        if (!room) return;

        room.gameStarted = false;
        room.gameState = null;
        room.p2Selection = null;

        io.to(currentRoom).emit('game-ended', result);
        
        console.log(`[${new Date().toISOString()}] Game ended in room: ${currentRoom}, score: ${result.score}`);
    });

    // Return to lobby
    socket.on('return-to-lobby', () => {
        if (!currentRoom) return;
        
        io.to(currentRoom).emit('lobby-return');
    });

    // Chat/ping (for latency check)
    socket.on('ping-server', (timestamp, callback) => {
        callback(timestamp);
    });

    // Disconnect handling
    socket.on('disconnect', () => {
        console.log(`[${new Date().toISOString()}] Player disconnected: ${socket.id}`);

        if (currentRoom) {
            const room = rooms.get(currentRoom);
            if (room) {
                // Remove player from room
                const playerIndex = room.playerIds.indexOf(socket.id);
                if (playerIndex !== -1) {
                    room.players.splice(playerIndex, 1);
                    room.playerIds.splice(playerIndex, 1);
                }

                // Notify remaining player
                socket.to(currentRoom).emit('player-left', { 
                    playerNumber: playerNumber,
                    remaining: room.players.length
                });

                // If room is empty, delete it
                if (room.players.length === 0) {
                    rooms.delete(currentRoom);
                    console.log(`[${new Date().toISOString()}] Room deleted: ${currentRoom}`);
                } else if (playerNumber === 1 && room.players.length > 0) {
                    // If P1 left, promote P2 to P1
                    room.hostSocketId = room.playerIds[0];
                    io.to(room.playerIds[0]).emit('promoted-to-host');
                }
            }
        }
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🍎 Fruit Box Multiplayer Server                          ║
║                                                            ║
║   Server running on port ${PORT}                              ║
║   Local: http://localhost:${PORT}                             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
});

