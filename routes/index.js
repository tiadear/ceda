// ROUTES!!!

const User = require('../models/account.js');
const Room = require('../models/room.js');
const express = require('express');
const passport = require('passport');
const router = express.Router();
const LocalStrategy = require('passport-local').Strategy;
const local = require('../passport/local');
local.strategy(passport);
const facebook = require('../passport/facebook');

var chat = require('../chat/chat');




router.get('/', function(req, res){
    //console.log(req.user);
	res.render('index', {user : req.user});
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



router.get('/login', function(req, res) {
    res.render('login', { user : req.user, error : req.flash('error')});
});

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


router.get('/chatpeer', function(req, res, next) {

    User.findById(req.user._id, function(err, user) {

        if (err) {
            console.log(err);
            next(err);
        }

        //save current user
        var currentUser = user._id;
        console.log('current user is '+currentUser);
            
        // generate a random peer to chat with
        User.random(function(err, user) {
            if (err) {
                console.log(err);
                next(err);
            }
            
            console.log('within function, random peer is ' +user._id);
            var randomPeer = user._id;

            Room.findOne({user_init : currentUser, user_resp : randomPeer}, function (err, room) {
                console.log('chat pickpeer point 1');

                if (err) {
                    console.log(err);
                    next(err);
                }

                if(room) {
                    //room was found 
                    console.log('room was found with '+ currentUser+' as user_init and '+randomPeer +' as user_resp');

                    console.log('roomID: '+ room.roomID);
                    console.log('room._id: '+ room.id);
                    req.room = room;
                    req.session.save(function(err){
                                if(err){
                                    console.log('error saving room');
                                    return next(err);
                                }
                                res.render('chatroom', {
                                    room : req.room
                                });
                            });
                } 

                //no room was found
                console.log('chat pickpeer point 2')

                //check if the users were the other way around
                Room.findOne({user_resp : currentUser, user_init : randomPeer}, function (err, room) {
                    if (err) {
                        console.log('no room found');
                        next(err);
                    }
                    if(room) {
                        console.log('room was found with '+ currentUser+' as user_respand '+ randomPeer + 'as user_init');

                        console.log('roomID: '+ room.roomID);
                        console.log('room._id: '+ room.id);
                        req.room = room;
                        req.session.save(function(err){
                                if(err){
                                    console.log('error saving room');
                                    return next(err);
                                }
                                res.render('chatroom', {
                                    room : req.room
                                });
                            });
                    } 

                    console.log('no room found');

                    // create a new room!
                    var newRoom = new Room();
                    newRoom.roomID = uuid.v4();
                    newRoom.user_init = currentUser;
                    newRoom.user_resp = randomPeer;
                    newRoom.room_type = 0;

                    newRoom.save(function(err){
                        if(err) {
                            console.log(err);
                            console.log('saving error')
                            next(err);
                        } else {
                            console.log('saving user');
                            req.room = room;
                            req.session.save(function(err){
                                if(err){
                                    console.log('error saving room');
                                    return next(err);
                                }
                                res.render('chatroom', {
                                    room : req.room
                                });
                            });
                        }
                    });
                        
                });
                    
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

