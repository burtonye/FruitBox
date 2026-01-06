const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const DEFAULT_ROWS = 10;
const DEFAULT_COLS = 17;
const COMPACT_ROWS = 8;
const COMPACT_COLS = 12;
const TIME_LIMIT_SECONDS = 120;

const sessions = new Map();
let timerStarted = false;

function generateId() {
  return crypto.randomBytes(3).toString('hex');
}

function generateBoard(rows, cols, targetSum) {
  const board = [];
  const maxValue = Math.max(1, Math.min(9, targetSum - 1));

  for (let r = 0; r < rows; r++) {
    board[r] = [];
    for (let c = 0; c < cols; c++) {
      const num = Math.floor(Math.random() * maxValue) + 1;
      board[r][c] = num;
    }
  }

  return board;
}

function checkForMoves(board, rows, cols, targetSum) {
  const prefix = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const value = board[r - 1][c - 1] ?? 0;
      prefix[r][c] = value + prefix[r - 1][c] + prefix[r][c - 1] - prefix[r - 1][c - 1];
    }
  }

  for (let top = 0; top < rows; top++) {
    for (let bottom = top; bottom < rows; bottom++) {
      for (let left = 0; left < cols; left++) {
        for (let right = left; right < cols; right++) {
          const sum = prefix[bottom + 1][right + 1]
            - prefix[top][right + 1]
            - prefix[bottom + 1][left]
            + prefix[top][left];
          if (sum === targetSum) {
            return true;
          }
          if (sum > targetSum) {
            break;
          }
        }
      }
    }
  }

  return false;
}

function countApples(board, rows, cols) {
  let count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] !== null) count++;
    }
  }
  return count;
}

function createSession({ targetSum = 10, compact = false } = {}) {
  const rows = compact ? COMPACT_ROWS : DEFAULT_ROWS;
  const cols = compact ? COMPACT_COLS : DEFAULT_COLS;
  let board = generateBoard(rows, cols, targetSum);
  while (!checkForMoves(board, rows, cols, targetSum)) {
    board = generateBoard(rows, cols, targetSum);
  }

  return {
    id: generateId(),
    board,
    rows,
    cols,
    targetSum,
    score: 0,
    timeStart: Date.now(),
    gameOver: false,
    gameOverReason: null,
    players: {
      player1: null,
      player2: null
    },
    clients: new Set()
  };
}

function getState(session) {
  return {
    board: session.board,
    rows: session.rows,
    cols: session.cols,
    targetSum: session.targetSum,
    score: session.score,
    timeStart: session.timeStart,
    gameOver: session.gameOver,
    gameOverReason: session.gameOverReason
  };
}

function broadcast(session, message, exceptSocket = null) {
  const payload = JSON.stringify(message);
  session.clients.forEach((client) => {
    if (client.readyState !== 1) return;
    if (client === exceptSocket) return;
    client.send(payload);
  });
}

function send(socket, message) {
  if (socket.readyState !== 1) return;
  socket.send(JSON.stringify(message));
}

function assignRole(session, socket) {
  if (!session.players.player1) {
    session.players.player1 = socket;
    socket.role = 'player1';
  } else if (!session.players.player2) {
    session.players.player2 = socket;
    socket.role = 'player2';
  } else {
    socket.role = 'spectator';
  }
}

function resetBoard(session, { targetSum, compact }) {
  session.targetSum = targetSum;
  session.rows = compact ? COMPACT_ROWS : DEFAULT_ROWS;
  session.cols = compact ? COMPACT_COLS : DEFAULT_COLS;
  let board = generateBoard(session.rows, session.cols, session.targetSum);
  while (!checkForMoves(board, session.rows, session.cols, session.targetSum)) {
    board = generateBoard(session.rows, session.cols, session.targetSum);
  }
  session.board = board;
  session.score = 0;
  session.timeStart = Date.now();
  session.gameOver = false;
  session.gameOverReason = null;
}

function startTimerLoop() {
  if (timerStarted) return;
  timerStarted = true;
  setInterval(() => {
    const now = Date.now();
    sessions.forEach((session) => {
      if (session.gameOver) return;
      if (!session.timeStart) return;
      const elapsed = Math.floor((now - session.timeStart) / 1000);
      if (elapsed >= TIME_LIMIT_SECONDS) {
        session.gameOver = true;
        session.gameOverReason = 'time';
        broadcast(session, { type: 'state', state: getState(session), serverNow: Date.now() });
      }
    });
  }, 1000);
}

function initializeWebSocketServer(server) {
  if (server.wss) {
    return server.wss;
  }
  const wss = new WebSocketServer({ server, path: '/api/socket' });
  server.wss = wss;
  startTimerLoop();

  wss.on('connection', (socket) => {
    socket.role = 'spectator';
    socket.sessionId = null;

    socket.on('message', (raw) => {
      let data = null;
      try {
        data = JSON.parse(raw.toString());
      } catch (error) {
        return;
      }

      if (!data || !data.type) return;

      if (data.type === 'join') {
        const requestedId = typeof data.sessionId === 'string' ? data.sessionId : null;
        let session = requestedId ? sessions.get(requestedId) : null;
        if (!session) {
          session = createSession();
          sessions.set(session.id, session);
        }
        assignRole(session, socket);
        socket.sessionId = session.id;
        session.clients.add(socket);

        send(socket, {
          type: 'session',
          sessionId: session.id,
          role: socket.role,
          state: getState(session),
          serverNow: Date.now()
        });
        return;
      }

      const session = socket.sessionId ? sessions.get(socket.sessionId) : null;
      if (!session) {
        send(socket, { type: 'error', message: 'Session not found.' });
        return;
      }

      if (data.type === 'newGame') {
        if (socket.role !== 'player1') {
          send(socket, { type: 'error', message: 'Only Player 1 can start a new game.' });
          return;
        }
        const targetSum = Math.max(1, Math.min(100, Number.parseInt(data.targetSum, 10) || 10));
        const compact = Boolean(data.compact);
        resetBoard(session, { targetSum, compact });
        broadcast(session, { type: 'state', state: getState(session), serverNow: Date.now() });
        return;
      }

      if (data.type === 'selection') {
        if (socket.role !== 'player1' && socket.role !== 'player2') return;
        broadcast(session, {
          type: 'selection',
          role: socket.role,
          active: Boolean(data.active),
          bounds: data.bounds || null
        }, socket);
        return;
      }

      if (data.type === 'claim') {
        if (socket.role !== 'player1') {
          send(socket, { type: 'error', message: 'Only Player 1 can score.' });
          return;
        }
        if (session.gameOver) {
          send(socket, { type: 'selectionResult', valid: false, count: 0, state: getState(session), serverNow: Date.now() });
          return;
        }
        const cells = Array.isArray(data.cells) ? data.cells : [];
        const seen = new Set();
        let sum = 0;
        let valid = true;
        for (const cell of cells) {
          const key = `${cell.row},${cell.col}`;
          if (seen.has(key)) {
            valid = false;
            break;
          }
          seen.add(key);
          if (cell.row < 0 || cell.row >= session.rows || cell.col < 0 || cell.col >= session.cols) {
            valid = false;
            break;
          }
          const value = session.board[cell.row][cell.col];
          if (value === null || value === undefined) {
            valid = false;
            break;
          }
          sum += value;
        }

        if (!valid || sum !== session.targetSum || cells.length === 0) {
          send(socket, { type: 'selectionResult', valid: false, count: 0, state: getState(session), serverNow: Date.now() });
          return;
        }

        for (const cell of cells) {
          session.board[cell.row][cell.col] = null;
        }
        session.score += cells.length;

        const applesLeft = countApples(session.board, session.rows, session.cols);
        if (applesLeft === 0) {
          session.gameOver = true;
          session.gameOverReason = 'victory';
        } else if (!checkForMoves(session.board, session.rows, session.cols, session.targetSum)) {
          session.gameOver = true;
          session.gameOverReason = 'nomoves';
        }

        const state = getState(session);
        send(socket, { type: 'selectionResult', valid: true, count: cells.length, state, serverNow: Date.now() });
        broadcast(session, { type: 'state', state, serverNow: Date.now() }, socket);
        return;
      }
    });

    socket.on('close', () => {
      const session = socket.sessionId ? sessions.get(socket.sessionId) : null;
      if (!session) return;
      session.clients.delete(socket);
      if (session.players.player1 === socket) session.players.player1 = null;
      if (session.players.player2 === socket) session.players.player2 = null;
      if (session.clients.size === 0) {
        sessions.delete(session.id);
      }
    });
  });

  return wss;
}

module.exports = { initializeWebSocketServer };
