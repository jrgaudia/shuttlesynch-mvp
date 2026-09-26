const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Assign the user (commuter or driver) to a specific route room
    socket.on('joinRoute', (route) => {
        // Leave any previous rooms to prevent overlap if they switch routes
        socket.rooms.forEach(room => {
            if (room !== socket.id) socket.leave(room);
        });
        socket.join(route);
        console.log(`Socket ${socket.id} joined route: ${route}`);
    });

    // Receive GPS from a driver and broadcast ONLY to that specific route room
    socket.on('driverLocation', (data) => {
        socket.to(data.route).emit('updateMap', data);
    });

    // Route-specific announcements
    socket.on('sendAnnouncement', (data) => {
        io.to(data.route).emit('newAnnouncement', data.msg);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`ShuttleSync Server running on http://localhost:${PORT}`);
});