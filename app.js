var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 3000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', function(request, response) {
  response.render('index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});





/*
var path = require('path');
var express = require('express');
var app = express();
//var server = require('http').createServer(app);
//var io = require('socket.io').listen(server);


var passport = require('passport');
var nodemailer = require('nodemailer');
var expressSession = require('express-session');
var mongoose = require('mongoose');
var db = require('./db.js');
var User = require('./models/account.js');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var nodeStatic = require('node-static');
var uuid = require('uuid');
var flash = require('connect-flash');
var debug = require('debug')('ceda:server');
var _ = require('underscore')._;

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));



/*
// module exports
module.exports = app;
*/


/*
// routes
var routes = require('./routes/index');
var home = require('./routes/home');
var chat = require('./routes/chat');
var forum = require('./routes/forum');
var settings = require('./routes/settings');




// set up views
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', function(req, res) {
  res.render('index');
});


// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
/*
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
app.use('/home', home);
app.use('/chat', chat);
app.use('/forum', forum);
app.use('/settings', settings);




// connect to port
app.listen(app.get('port'), function() {
  console.log('Ceda is running on port', app.get('port'));
});




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
*/



// connect to db
/*
var mongo_uri = ENV['MONGODB_URI'];
mongoose.connect(mongo_uri);
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
                arr1 = [];
                arr2 = [];
                console.log('history length: '+history.length);

                history.forEach(function(item, i) {
                    arr1[item._id] =[];

                    User.findById(item.user, function(err, user) {
                        var username = user.username;
                        console.log('username: '+username);
                        arr1[item._id] = [item.user, item.room, item.message, username, item.timesent];
                        arr2.push(arr1[item._id]);
                        if(arr2.length === history.length) {
                            console.log('arr2: '+arr2);
                            socket.emit('addHistory', arr2);
                        }
                    });
                });   
            }
            //new convo
        });
    });

    socket.on('leaveRoom', function(){
        console.log('leaving room');
        chatHistory.find({ room : socket.room }, function(err, history) {
            if (err) throw err;
            if (!history || history === '' || history.length === 0 || history === null) {
                Room.findByIdAndRemove(socket.room, function(err) {
                    if (err) throw err;
                    console.log('room: '+socket.room+' delted');
                });
            }
        });
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
            newChatHistory.user = socket.userID;
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
        console.log('socket disconnected');
        numClients[socket.room]--;
        chatHistory.find({ room : socket.room }, function(err, history) {
            if (err) throw err;
            if (!history || history === '' || history.length === 0 || history === null) {
                Room.findByIdAndRemove(socket.room, function(err) {
                    if (err) throw err;
                    console.log('room: '+socket.room+' delted');
                });
            }
        });
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





*/