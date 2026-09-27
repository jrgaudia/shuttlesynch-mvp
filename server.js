const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// In-memory passenger queue for each route
const waitingPassengers = {
    'calamba': 0, 'sta-rosa': 0, 'binan': 0, 'san-pedro': 0, 'carmona': 0
};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinRoute', (route) => {
        socket.rooms.forEach(room => {
            if (room !== socket.id) socket.leave(room);
        });
        socket.join(route);
        // Push the current passenger count to the user as soon as they join
        socket.emit('updatePassengerCount', waitingPassengers[route] || 0);
    });

    // Handle commuter check-in
    socket.on('commuterWaiting', (route) => {
        if (waitingPassengers[route] !== undefined) {
            waitingPassengers[route]++;
            // Broadcast the new count to everyone on this route (Driver & Commuters)
            io.to(route).emit('updatePassengerCount', waitingPassengers[route]);
        }
    });

    // Reset the passenger queue when the driver arrives
    socket.on('driverArrived', (route) => {
        if (waitingPassengers[route] !== undefined) {
            waitingPassengers[route] = 0;
            io.to(route).emit('updatePassengerCount', waitingPassengers[route]);
        }
    });

    socket.on('driverLocation', (data) => {
        socket.to(data.route).emit('updateMap', data);
    });

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