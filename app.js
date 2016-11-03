
const   path = require('path'),
        express = require('express'),
        app = express(),
        server = require('http').createServer(app),
        io = require('socket.io').listen(server),
        passport = require('passport'),
        nodemailer = require('nodemailer'),
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

app.use(express.static(__dirname + '/public'));



// connect to port
server.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});




// module exports
module.exports = app;




// routes
var routes = require('./routes/index');
var chat = require('./routes/chat');
var forum = require('./routes/forum');
var settings = require('./routes/settings');




// set up views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');





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
//app.use(express.static(path.join(__dirname, 'public')));




// general
app.use('/', routes);
app.use('/chat', chat);
app.use('/forum', forum);
app.use('/settings', settings);




// passport strategies
var local = require('./passport/local');
var facebook = require('./passport/facebook');
var twitter = require('./passport/twitter');
var google = require('./passport/google');





// passport config
passport.serializeUser(function(user, done){
    return done(null, user.id);
});
passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        return done(err,user);
    });
});

passport.use(local, 'local-signup');
passport.use(local, 'local-login');
passport.use(facebook);
passport.use(twitter);
passport.use(google);




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












// socket stuff

var numClients = {};
var chatHistory = require('./models/chatHistory');
var Room = require('./models/room.js');

io.sockets.on('connection', function(socket){

    socket.on('message', function(message) {
        // for a real app, would be room-only (not broadcast)
        socket.emit('message', message);
    });

    socket.on('addUser', function(user1, username, callback){
        console.log('adding user');
        //attach username to socket
        socket.username = username;
        socket.userID = user1;
        callback(true);
    });

    socket.on('joinRoom', function(roomID, currentuser, randomuser){
        socket.room = roomID;
        
        console.log('numClients: '+numClients[socket.room]);

        if(numClients[socket.room] === undefined || (numClients[socket.room] = 0)) {
            numClients[socket.room] = 1;
            console.log('added ' + currentuser + ' to room: ' + roomID);
            socket.join(socket.room);
            socket.emit('roomOpened', socket.room, socket.id);
            io.sockets.in(socket.room).emit('updateChat', currentuser, 'is now online');
        } else {
            numClients[socket.room]++;
            console.log('added ' + currentuser + ' to room: ' + roomID);
            socket.join(socket.room);
            socket.emit('channelReady', socket.room, socket.id);
            io.sockets.in(socket.room).emit('updateChat', currentuser, 'is now online');
        }

        chatHistory.find({room : roomID}).sort({'timesent' : -1}).exec(function(err, history) {
            if(err) throw err;
            if(history) {
                socket.emit('addHistory', history);
            }
            //new convo
        });
    });

    socket.on('leaveRoom', function(userselected, currentuser){
        socket.leave(socket.room);
    });

    socket.on('userTyping', function(data) {
        io.sockets.in(socket.room).emit('isTyping', {isTyping: data, user: socket.username});
    });

    socket.on('sendChat', function(data) {
        //send a msg
        if(socket.room !== undefined){
            io.sockets.in(socket.room).emit("updateChat", socket.username, data);
            socket.emit("isTyping", false);

            var newChatHistory = new chatHistory();
            newChatHistory.user = socket.username;
            newChatHistory.room = socket.room;
            newChatHistory.message = data;

            newChatHistory.save(function(err){
                if (err) {
                    console.log(err);
                    throw err;
                } else {
                    console.log('saving chat history');
                }
            });

        } else {
            socket.emit("updateChat", socket.username, "Please connect to a room.");
        }
    });

    socket.on('videoReady', function(room) {
        socket.emit('readyToCall', room);
    });

    socket.on('disconnect', function() {
        numClients[socket.room]--;
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





