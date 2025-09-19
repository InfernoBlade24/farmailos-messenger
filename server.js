// server.js
// Простой WebSocket-сервер и статика для farmailos messenger

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Отдаём статические файлы из той же папки, где лежит server.js
app.use(express.static(__dirname));

const MAX_HISTORY = 100;
const messagesHistory = [];
const typingClients = {};

// Принимаем и обрабатываем сообщения
wss.on('connection', function connection(ws) {
  console.log('Client connected. Total:', wss.clients.size);
  
  // Отправляем новому клиенту всю историю сообщений
  if (messagesHistory.length > 0) {
    ws.send(JSON.stringify({ type: 'history', payload: messagesHistory }));
  }

  ws.on('message', function incoming(msg) {
    try {
      const data = JSON.parse(msg);
      if (data && data.type) {
        if (data.type === 'msg' && data.payload) {
          // Обработка нового сообщения
          const out = { 
            type: 'msg', 
            payload: { ...data.payload, ts: Date.now(), msgId: Math.random().toString(36).substr(2, 9) } 
          };
          const text = JSON.stringify(out);
          
          // Сохраняем в историю
          messagesHistory.push(out.payload);
          if (messagesHistory.length > MAX_HISTORY) {
            messagesHistory.shift();
          }

          // Рассылаем всем клиентам, включая отправителя
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(text);
            }
          });
          
        } else if (data.type === 'typing' && data.payload) {
          // Обработка статуса набора текста
          typingClients[ws._socket.remoteAddress] = data.payload.isTyping ? data.payload.name : null;
          const typingUsers = Object.values(typingClients).filter(Boolean);
          const statusText = typingUsers.length > 0 ? `${typingUsers.join(', ')} печатает...` : 'online';
          
          const statusMsg = JSON.stringify({ type: 'status', payload: statusText });
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(statusMsg);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Invalid message', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected. Total:', wss.clients.size);
    // Удаляем клиента из списка печатающих
    delete typingClients[ws._socket.remoteAddress];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});