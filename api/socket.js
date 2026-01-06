const { initializeWebSocketServer } = require('../websocket-server');

module.exports = (req, res) => {
  initializeWebSocketServer(res.socket.server);
  res.statusCode = 200;
  res.end();
};
