// utils/dashboardWebSocket.js
const WebSocket = require('ws');

class DashboardWebSocket {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Set();
    
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log('Dashboard client connected');
      
      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('Dashboard client disconnected');
      });
    });
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Send real-time transaction updates
  sendTransactionUpdate(transaction) {
    this.broadcast({
      type: 'TRANSACTION_UPDATE',
      data: transaction
    });
  }

  // Send service status updates
  sendServiceStatusUpdate(service) {
    this.broadcast({
      type: 'SERVICE_STATUS_UPDATE',
      data: service
    });
  }
}

module.exports = DashboardWebSocket;