// ROUTES!!!

const User = require('../models/account.js');
const Room = require('../models/room.js');

const express = require('express');
const router = express.Router();

const passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var async = require('async');

var chat = require('../chat/chat');
const local = require('../passport/local');
local.strategy(passport);




router.get('/', function(req, res){
	res.render('index', {
        user : req.user,
        title : 'ceda'
    });
});



router.get('/signup', function(req, res) {
	res.render('signup', { });
});

router.post('/signup', passport.authenticate('local-signup', { failureRedirect: '/signup', failureFlash: true}), function(req, res, next) {
        req.session.save(function (err) {
            if(err){
                return next(err);
            }
            res.redirect('/');

        });
    }
);


/*
router.get('/login', function(req, res) {
    res.render('login', { user : req.user, error : req.flash('error')});
});
*/
router.post('/login', passport.authenticate('local-login', { 
    failureRedirect: '/login', 
    failureFlash: true 
}), function(req, res, next) {
    req.session.save(function (err) {
        if (err) {
            console.log(err);
            return next(err);
        }
        res.redirect('/');
    });
});



router.get('/forgot', function(req,res){
    res.render('forgot', {
        user : req.user
    });
});


router.post('/forgot', local.forgot,
    function(req, res, next) {
        if(err){
            console.log(err);
            return next(err);
        }
        res.redirect('/');
    }
);


router.get('/reset', function(req,res) {
    passport.authenticate('local-reset', {
        failureRedirect : '/forgot',
        failureFlash: true
    }),
    function(req, res){
        res.redirect('/');
    } 
});


// social media

router.get('/auth/facebook',
	passport.authenticate('facebook', {scope : ['email']}),
    function(req, res) {}
);

router.get('/auth/facebook/callback',
	passport.authenticate('facebook', {failureRedirect: '/'}),
	function(req, res){
		res.redirect('/');
	}
);


router.get('/auth/twitter', 
	passport.authenticate('twitter'),
	function(req, res) {}
);
router.get('/auth/twitter/callback',
	passport.authenticate('twitter', {failureRedirect: '/'}),
	function(req, res){
		res.redirect('/');
	}
);


router.get('/auth/google', 
	passport.authenticate('google', { scope: [
		'https://www.googleapis.com/auth/plus.login',
    	'https://www.googleapis.com/auth/plus.profile.emails.read'
	]})
);
router.get('/auth/google/callback',
	passport.authenticate('google', {failureRedirect: '/'}),
	function(req, res){
		res.redirect('/');
	}
);




router.post('/username', function(req, res) {
    User.findOne({email : req.body.email}, function(err, user){
        if(err) {
            throw err;
            console.log(err);
        }
        if(!user) {
            console.log('no user found');
        } else {
            user.username = req.body.username; 

            user.save(function(err){
                if(err) {
                    console.log('error saving username');
                    throw err;
                }

                req.session.save(function (err) {
                    if(err){
                        return next(err);
                    }
                    console.log('saving user');
                    res.redirect('/');
                });
            });
        }
    });
});





router.get('/deleteaccount', function(req, res) {
    res.render('delete', {
        user : req.user
    });
});

router.post('/delete', function(req, res) {
    User.findByIdAndRemove(req.user._id, function(err) {
        if (err) throw err;
        console.log('User deleted!');
        res.redirect('/');
    });
});






router.get('/chat', function(req, res) {
    res.render('chat', {
        user : req.user
    });
});

router.get('/chatpeer', function(req, res) {
    async.waterfall([
        function(callback) {
            User.findById(req.user._id, function(err, user) {
                if(err) throw err;
                var currentUser = user._id;
                var currentUsername = user.username;
                console.log('user 1 is: ' + currentUsername);
                callback(null, currentUser, currentUsername);
            });
        },
        function(user1, user1name, callback) {

            function returnRandom(currentuser) {

                User.random(function(err, user) {
                    if (err) throw err;
                    if(String(user._id) != String(currentuser)) {
                        var randomPeer = user._id;
                        var randomUsername = user.username;
                        console.log('user 2 is: ' + randomUsername);
                        callback(null, user1, user1name, randomPeer, randomUsername);
                    } else {
                       console.log('random user is the same as current user');
                       returnRandom(user._id);
                    }
                });
            }
            returnRandom(user1);
        },
        function(user1, user1name, user2, user2name, callback) {
            console.log('looking for a room...');
            Room.findOne({user_init : user1, user_resp : user2}, function(err, room) {
                if (err) throw err;
                if (room) {
                    console.log('room was found');
                    req.room = room;
                    req.usersInRoom = [user1name, user2name];
                    req.userIDs = [user1, user2];
                    callback(null, req.room, req.usersInRoom, req.userIDs);
                } else {
                    console.log('room was not found, looking again...')
                    Room.findOne({user_init : user2, user_resp : user1}, function(err, room) {
                        if (err) throw err;
                        if (room) {
                            console.log('room was found');
                            req.room = room;
                            req.usersInRoom = [user1name, user2name];
                            req.userIDs = [user1, user2];
                            callback(null, req.room, req.usersInRoom, req.userIDs);
                        } else {
                            console.log('no room found');
                            // create a new room!
                            var newRoom = new Room();
                            newRoom.roomID = uuid.v4();
                            newRoom.user_init = currentUser;
                            newRoom.user_resp = randomPeer;
                            newRoom.room_type = 0;

                            newRoom.save(function(err){
                                if (err) {
                                    console.log(err);
                                    throw err;
                                } else {
                                    console.log('saving user');
                                    req.room = newRoom;
                                    req.usersInRoom = [user1name, user2name];
                                    req.userIDs = [user1, user2];
                                    callback(null, req.room, req.usersInRoom, req.userIDs);
                                }
                            });
                        }
                    });

                }
            });
            
        }
    ], function (err, result) {
        console.log(result);

        req.session.save(function(err){
            if (err) {
                console.log(err);
                throw err;
            }
            res.render('chatroom', {
                room : req.room,
                usersInRoom : req.usersInRoom,
                userIDs : req.userIDs
            });
        });
    });
});





router.get('/account', ensureAuthenticated, function(req, res){
  res.render('account');
});

// test authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  console.log('is authenticated');
  res.redirect('/');
}





// logout

router.get('/logout', function(req, res, next) {
    req.logout();
    req.session.save(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});




module.exports = router;

