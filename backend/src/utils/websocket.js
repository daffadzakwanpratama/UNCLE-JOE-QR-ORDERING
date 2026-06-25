const { WebSocketServer } = require("ws");

let wss = null;
const adminClients = new Set();
const customerClients = new Map(); // orderNumber -> Set(ws)

function initWebSocket(server) {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (ws) => {
    let registeredOrderNumber = null;
    let isAdmin = false;

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);

        if (data.type === "register") {
          if (data.role === "admin") {
            isAdmin = true;
            adminClients.add(ws);
          } else if (data.role === "customer" && data.orderNumber) {
            registeredOrderNumber = data.orderNumber;
            if (!customerClients.has(registeredOrderNumber)) {
              customerClients.set(registeredOrderNumber, new Set());
            }
            customerClients.get(registeredOrderNumber).add(ws);
          }
        }
      } catch (err) {
        console.error("Gagal memproses pesan WebSocket:", err.message);
      }
    });

    const cleanup = () => {
      if (isAdmin) {
        adminClients.delete(ws);
      }
      if (registeredOrderNumber && customerClients.has(registeredOrderNumber)) {
        const set = customerClients.get(registeredOrderNumber);
        set.delete(ws);
        if (set.size === 0) {
          customerClients.delete(registeredOrderNumber);
        }
      }
    };

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });

  console.log("WebSocket Server initialized and attached to HTTP Server.");
}

function notifyStatusChange(orderNumber, status, paymentStatus) {
  const payload = JSON.stringify({
    type: "orderUpdated",
    orderNumber,
    status,
    paymentStatus,
  });

  // Kirim ke semua admin
  adminClients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(payload);
    }
  });

  // Kirim ke pelanggan spesifik
  if (customerClients.has(orderNumber)) {
    customerClients.get(orderNumber).forEach((client) => {
      if (client.readyState === 1) {
        client.send(payload);
      }
    });
  }
}

function notifyNewOrder(order) {
  const payload = JSON.stringify({
    type: "newOrder",
    order,
  });

  // Kirim ke semua admin
  adminClients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

module.exports = {
  initWebSocket,
  notifyStatusChange,
  notifyNewOrder,
};
