
const   path = require('path'),
        express = require('express'),
        app = express(),
        server = require('http').createServer(app),
        port = 3000,
        io = require('socket.io').listen(server),
        Room = require('./room.js'),
        passport = require('passport'),
        expressSession = require('express-session'),
        mongoose = require('mongoose'),
        db = require('./db.js'),
        User = require('./models/account.js');

var favicon = require('static-favicon'),
    logger = require('morgan');
    cookieParser = require('cookie-parser');
    bodyParser = require('body-parser');
    nodeStatic = require('node-static'),
    uuid = require('uuid'),
    flash = require('connect-flash'),
    debug = require('debug')('ceda:server'),
    _ = require('underscore')._;




// connect to port
server.listen(port, function(){
    console.log('listening on *:3000');
});



// routes
var routes = require('./routes/index');




// set up views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');




// passport strategies

const local = require('./passport/local');
const facebook = require('./passport/facebook');
/*
const google = require('./passport/google');
const twitter = require('./passport/twitter');
*/



// passport config
passport.serializeUser(function(user, done){
    done(null, user);
});
passport.deserializeUser(function(id, done){
    done(null, id);
});

passport.use(local);
passport.use(facebook);
/*
passport.use(google);
passport.use(twitter);
*/



// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'mustardmanforpresident',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(flash());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});








// connect to db
mongoose.connect(db.url);
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
mongoose.connection.once('open', function() { console.log("Mongo DB connected!"); });




// 404
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});





// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// test authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/');
}

module.exports = app;




// socket stuff
var users = {}; //people
var rooms = {};
var sockets = []; //clients


io.sockets.on('connection', function(socket){

    socket.on('message', function(message) {
        // for a real app, would be room-only (not broadcast)
        socket.broadcast.emit('message', message);
    });

    function updateUsers(){
        //update the user list
        socket.emit('updateUsers', {users: users});
        socket.broadcast.emit('updateUsers', {users: users});
    }

    socket.on('addUser', function(username, callback){
        if (Object.getOwnPropertyNames(users).length > 0) {
            //console.log('there are other users');
            callback(false);
        } else {
            //console.log('users is empty');
            callback(true);
        }

        console.log('username: ' + username);

        roomID = null;

        //attach username to socket
        socket.username = username;

        //send connection msg to user who connected
        socket.emit('updateChat', username, 'you have connected');

        //send connection msg to everyone else
        socket.broadcast.emit('updateChat', username, 'is now online');

        //populate the clients array with the client object
        sockets.push(socket);

            var newuser = {username: username, user_type: 0};
            con.query('INSERT INTO users SET ?', newuser, function(err,res){
                if(err) throw err;

                var lastinsertID = res.insertId;

                //push username into array
                users[socket.id] = {"username" : username, "user_id" : lastinsertID, "room" : {"id" : roomID}, currentroom : null};

                updateUsers();
            });
        
        
    });

    function newRoom(currentuser, userselected){
        //assign random id number
        var id = uuid.v4();

        //create the room
        var room = new Room(id, currentuser, userselected);

        //add it to the array
        rooms[id] = room;

        //name the room
        socket.room = id;

        //auto join the creator of the room
        socket.join(socket.room);

        //add creator to room obj
        room.addPerson(socket.id);

         //update the room id on the client
        socket.emit('sendRoomID', {id: socket.room, roomowner: room.userinit, roomresp: room.useresp});

        //add the room id to both users array
        users[currentuser].room[userselected] = id;
        users[currentuser].currentroom = id;
        users[userselected].room[currentuser] = id;

        socket.emit('createdRoom');

        //Insert into db
        var userinit = users[currentuser].user_id;
        var userresp = users[userselected].user_id;
        var newroom = {user_init_id: userinit, user_resp_id: userresp, room_type: 0};

        con.query('INSERT INTO room SET ?', newroom, function(err,res){
            if(err) throw err;
        });
    }

    function existingRoom(currentuser, userselected) {
        //get the room id
        var roomid = users[socket.id].room[userselected];
        var room = rooms[roomid];

        //name the room
        socket.room = roomid;

        //add the person in the room.js file
        room.addPerson(socket.id);

        socket.room = room.id;

        //add person to the room
        socket.join(socket.room);

        //assign the room id to the current room
        users[socket.id].currentroom = room.id;

        //update the room id on the client
        socket.emit('sendRoomID', {id: socket.room, roomowner: room.userinit, roomresp: room.useresp});

        //let everyone in the room know
        io.sockets.in(socket.room).emit("updateChat", users[currentuser].username, 'is now chatting with '+users[userselected].username);

        con.query('SELECT id, user_id, message, timestamp FROM chat_history WHERE room_id = ?', socket.room ,function(err,res){
            if(err) throw err;
            socket.emit('updateHistory', res);
            console.log(res);
        });

        socket.emit('channelReady');
    }

    socket.on('joinRoom', function(userselected, currentuser){

        //con.query('SELECT id, user_init_id, user_resp_id, room_type, room_id FROM room, users WHERE users.room_id = id AND ')

        //if they have already been assigned a room with this user
        if(users[socket.id].room[userselected] !== undefined) {
            existingRoom(currentuser, userselected);
            //console.log(users[socket.id].username+' has joined room '+socket.room);
        }

        //if they are initiating the conversation
        else {
            newRoom(currentuser, userselected);
            //console.log(users[socket.id].username+' has started room '+socket.room);
        }
    });

    socket.on('switchRoom', function(userselected, currentuser){
        socket.leave(socket.room);
        //console.log(users[socket.id].username+' has left room '+socket.room)

        //if they have already been assigned a room with this user
        if(users[socket.id].room[userselected] !== undefined) {
            existingRoom(currentuser, userselected);
            //console.log(users[socket.id].username+' has joined room '+socket.room);
        } 

        //if they are initiating the conversation
        else {
            newRoom(currentuser, userselected);
            //console.log(users[socket.id].username+' has started room '+socket.room);
        }
    });

    socket.on('disconnect', function(data){
        if(typeof users[socket.id] !== 'undefined') {
            //let everyone know they left
            socket.broadcast.emit('updateChat', socket.username, ' has disconnected');

            //remove the username from the array
            delete users[socket.id];

            updateUsers();;
        }
    });

    socket.on('userTyping', function(data) {
        if(typeof users[socket.id] !== 'undefined') {
            io.sockets.in(socket.room).emit('isTyping', {isTyping: data, user: users[socket.id].username});
        }
    });

    socket.on('sendChat', function(data) {
        //send a msg
        if(socket.room !== undefined){
            io.sockets.in(socket.room).emit("updateChat", socket.username, data);
            socket.emit("isTyping", false);

            var newmessage = {user_id: '1', message: data, timestamp: CURRENT_TIMESTAMP}

            con.query('INSERT INTO chat_history SET ?', newmessage, function(err,res){
                if(err) throw err;
            });

        } else {
            socket.emit("updateChat", socket.username, "Please connect to a room.");
        }
    });

});


Array.prototype.contains = function(k, callback) { 
    var self = this;
    return (function check(i) {
        if (i >= self.length) {
            return callback(false);
        }
        if (self[i] === k) {
            return callback(true);
        }
        return process.nextTick(check.bind(null, i+1));
    }(0));
};




//con.end(function(err) {
  // The connection is terminated gracefully
  // Ensures all previously enqueued queries are still
  // before sending a COM_QUIT packet to the MySQL server.
//});
 

