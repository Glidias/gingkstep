const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

const TEST_HOST_PASSWORD = process.env.TEST_HOST_PASSWORD || "blahblah";
const TEST_ROOM_ID = "testroom192419249gage"
var TEST_HOST_ID = "";

app.use(express.static('bin'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/testroom.html', (req, res) => {
  res.sendFile(__dirname + '/testroom.html');
});

io.on('connection', (socket) => {
  socket.on('chat message', msg => {
    io.emit('chat message', msg);
  });

  socket.on("join-test-room", async ()=> {

    await socket.join(TEST_ROOM_ID);
      //, io.sockets.adapter.rooms.get(TEST_ROOM_ID).size
    io.to(TEST_ROOM_ID).emit("joinedTestRoom", socket.id);
    if (TEST_HOST_ID) io.to(TEST_ROOM_ID).emit('hosted', TEST_HOST_ID);

  });

  socket.on('admin-password-entry', msg => {
    if (TEST_HOST_PASSWORD && msg === TEST_HOST_PASSWORD) {

      TEST_HOST_ID = socket.id;
      io.to(TEST_ROOM_ID).emit('hosted', TEST_HOST_ID);

      socket.on('slide-change', msg => {
        if (TEST_HOST_ID === socket.id) {
          io.to(TEST_ROOM_ID).emit("slideChange", msg);
        }
      });
    }
  });



  socket.on('disconnect', function () {
    if (socket.id === TEST_HOST_ID) {
      TEST_HOST_ID = '';
      io.to(TEST_ROOM_ID).emit('hosted', '');
    }
    //, io.sockets.adapter.rooms.get(TEST_ROOM_ID).size
    socket.emit('disconnected', socket.id);
});

});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
