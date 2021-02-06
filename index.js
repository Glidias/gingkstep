const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

const TEST_HOST_PASSWORD = process.env.TEST_HOST_PASSWORD || "blahblah";
const TEST_ROOM_ID = "testroom192419249gage"
var TEST_HOST_ID = "";

const I_TREE_ID = 0;
const I_SESSION_PASSWORD = 1;
const I_HOST_PASSWORD = 2;
const sessions = {};
/*
Open Session (Gingko Tree ID): []
Join Session: []
TO:
Overview / Slideshow
1) Start session (Show session Id)
2) Change Key
*/
async function startSession(socket, treeId, transpose) { // sessionPassword // hostPassword
  // [by hostId to sessionId] : treeId
  var sessionPin = Math.floor(Math.random()*90000) + 10000; //new pin for session
  sessionPin = sessionPin.toString();
  sessions[sessionPin] = {
    treeId,
    transpose: tranpose ? transpose : [],
  };
  socket.hostingPin = sessionPin;
  await socket.join(sessionPin);
  /*
  {
    treeId:
  }
  */
 return sessionPin;
}

app.use(express.static('dist'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/dist/index.html');
});

 // to deprecrate
app.get('/testroom.html', (req, res) => {
  res.sendFile(__dirname + '/testroom.html');
});

io.on('connection', (socket) => {
  socket.on('chat message', msg => {
    io.emit('chat message', msg);
  });

  socket.on("host-room", async (treeId)=> {
    const sessionPin = await startSession(socket, treeId);
    io.to(sessionPin).emit("hostingTestRoom", sessionPin);
  });

  socket.on("join-room", async (sessionPin)=> {
    if (!sessions[sessionPin]) {
      return io.to(sessionPin).emit("roomDoesntExist", sessionPin);
    }
    await socket.join(sessionPin);
    io.to(sessionPin).emit("joinedTestRoom", socket.id);
  });

  // to deprecrate
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
