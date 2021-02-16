const express = require('express');
//const cors = require('cors');
const app = express();
//app.use(cors);
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: (!process.env.BUILDPACK_URL ? {
    origin: 'http://localhost:8080',
    methods: ["GET", "POST"],
    credentials: true
  } : undefined)
});
const port = process.env.PORT || 3000;

/*
const I_TREE_ID = 0;
const I_SESSION_PASSWORD = 1;
const I_HOST_PASSWORD = 2;
*/
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
    hostId: socket.id,
    transpose: transpose ? transpose : [],
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

  socket.on("host-room", async (treeD, keys)=> {
    const sessionPin = await startSession(socket, treeD, keys);
    io.to(socket.id).emit("hostingTestRoom", sessionPin);
    socket.on('slide-change', msg => {
      io.to(sessionPin).emit("slideChange", msg);
    });
  });

  socket.on("join-room", async (sessionPin)=> {
    if (!sessions[sessionPin]) {
      return io.to(socket.id).emit("roomDoesntExist", sessionPin);
    }
    await socket.join(sessionPin);
    var data = sessions[sessionPin];
    io.to(socket.id).emit("joinedRoom", sessionPin, data.treeId, data.transpose);
  });

});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
