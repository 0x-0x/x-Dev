const { ESRCH } = require("constants");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidv4 } = require("uuid");
const twilio = require('twilio');


const port = process.env.PORT || 3000;

const viewsDirPath = path.join(__dirname, "templates", "views");
app.use(bodyParser.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.set("views", viewsDirPath);
app.use(express.static(path.join(__dirname, "public")));

app.use("/room/:id", express.static("public"));

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/room", (req, res) => {
  res.redirect(`/room/${uuidv4()}`);
});

app.get("/room/:id", (req, res) => {
  let theroomid = req.params.id;
  res.render("room.ejs", { roomId: theroomid, userId: uuidv4() });
});

// app.get('/:room', (req, res) => {
//   res.render('room', { roomId: req.params.room })
// })

userIdlist = [];

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);

    socket.on("disconnect", () => {
      socket.to(roomId).broadcast.emit("user-disconnected", userId);
    });
  });
});

io.on("connection", (socket) => {
  socket.on("join-room", (userId, roomId) => {
    console.log(`User ${userId} Joined room ${roomId}`);

    if (userIdlist.length === 1) {
      let admin = userIdlist[0];
      console.log("admin: ", admin);
    }

    userIdlist.push(userId);
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("new-member", userId);
    theroomid = roomId;
    console.log("roodID: ", theroomid);
  });

  // Recieving updates from user
  socket.on("update_canvas", function (data) {
    //  store all drawings indev*
    const history = [];

    history.push(data);

    // socket.emit('update_canvas',item);

    for (let item of history) socket.to(theroomid).emit("update_canvas", item);

    // send updates to all sockets except sender
    socket.to(theroomid).emit("update_canvas", data);
    //   socket.emit('update_canvas',data);
  });
});

//twilo voice over api

const VoiceResponse = require('twilio').twiml.VoiceResponse;
const urlencoded = require('body-parser').urlencoded;

// Update with your own phone number in E.164 format
const MODERATOR = '+19784643523';

// Parse incoming POST params with Express middleware
app.use(urlencoded({ extended: false }));

// Create a route that will handle Twilio webhook requests, sent as an
// HTTP POST to /voice in our application
app.post('/voice', (request, response) => {
  // Use the Twilio Node.js SDK to build an XML response
  const twiml = new VoiceResponse();

  // Start with a <Dial> verb
  const dial = twiml.dial();
  // If the caller is our MODERATOR, then start the conference when they
  // join and end the conference when they leave
  if (request.body.From == MODERATOR) {
    dial.conference('My conference', {
      startConferenceOnEnter: true,
      endConferenceOnExit: true,
    });
  } else {
    // Otherwise have the caller join as a regular participant
    dial.conference('My conference', {
      startConferenceOnEnter: false,
    });
  }

  // Render the response as XML in reply to the webhook request
  response.type('text/xml');
  response.send(twiml.toString());
});

// Create an HTTP server and listen for requests on port 3000
console.log('Twilio Client app HTTP server running at http://127.0.0.1:3000');


server.listen(port);
