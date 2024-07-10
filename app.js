const express = require('express');
const app = express();
const http = require('http');
const socketio = require('socket.io');
const server = http.createServer(app);
const path = require('path');
const io = socketio(server);

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

const users = {};

io.on('connection', function (socket) {
    socket.on('set-username', function (username) {
        users[socket.id] = username;
        io.emit('update-status', Object.values(users).join(', ') + ' are online');
    });

    socket.on("send-location", function (data) {
        io.emit("receive-location", { id: socket.id, ...data });
    });

    socket.on("send-message", function (data) {
        io.emit('receive-message', data);
    });

    socket.on("disconnect", function () {
        delete users[socket.id];
        io.emit('update-status', Object.values(users).join(', ') + ' are online');
        io.emit("user-disconnected", socket.id);
    });
});

app.get('/', function (req, res) {
    res.render('index');
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
});
