// server.js
// Простой WebSocket-сервер и статика для farmailos messenger

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Отдаём статические файлы (index.html и т.д.) из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Простая логика: при подключении добавляем, при получении сообщения рассылаем всем
wss.on('connection', function connection(ws) {
  console.log('Client connected. Total:', wss.clients.size);

  ws.on('message', function incoming(msg) {
    try {
      const data = JSON.parse(msg);
      if(data && data.type === 'msg' && data.payload){
        const out = { type: 'msg', payload: { ...data.payload, ts: Date.now() } };
        const text = JSON.stringify(out);
        wss.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(text);
          }
        });
      }
    } catch(e){
      console.warn('Invalid message', e);
    }
  });

  ws.on('close', ()=> console.log('Client disconnected. Total:', wss.clients.size));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});
