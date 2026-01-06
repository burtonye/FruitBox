const express = require('express');
const http = require('http');
const path = require('path');
const { initializeWebSocketServer } = require('./websocket-server');

const app = express();
app.use(express.static(path.join(__dirname)));

const server = http.createServer(app);
initializeWebSocketServer(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Fruit Box server running on port ${PORT}`);
});
