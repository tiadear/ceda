// models
var User = require('../models/account.js');
var Room = require('../models/room.js');
var Thread = require('../models/thread.js');
var Post = require('../models/posts.js');
var chatHistory = require('../models/chatHistory.js');
var Appeal = require('../models/appeal.js');

// express
var util = require('util');
var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');

// passport
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var local = require('../passport/local');
local.strategy(passport);

var async = require('async');




function formatDate(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  var strTime = hours + ':' + minutes + ' ' + ampm;
  return date.getDate() + "/" + date.getMonth()+1 + "/" + date.getFullYear() + "  " + strTime;
}



router.get('/', function(req, res){
    if(req.user) {
        res.redirect('/home');
    }
	res.render('index', {
        message : req.flash('loginMessage'),
        title : 'ceda'
    });
});




router.get('/signup', function(req, res) {
	res.render('signup', {
        message : req.flash('signupMessage'),
        title : 'ceda'
    });
});

router.post('/signup', function(req, res, next) {
    
    if(!req.body.username || !req.body.email || !req.body.password || !req.body.confirmPassword) {
        req.flash('signupMessage', 'Please complete all fields');
        res.redirect('/signup');
    } else {
        passport.authenticate('local-signup', {
            successRedirect: '/home',
            failureRedirect: '/signup',
            failureFlash: true
        }) (req, res);
    }
});




router.post('/login', function(req, res, next) {
    if(!req.body.email || !req.body.password) {
        req.flash('loginMessage', 'Please complete all fields');
        res.redirect('/');
    } else {
        passport.authenticate('local-login', {
            successRedirect: '/home',
            failureRedirect: '/',
            failureFlash: true
        }) (req, res);
    }
});




router.get('/forgot', function(req,res){
    res.render('forgot', {
        message : req.flash('forgotMessage')
    });
});
router.post('/forgot', local.forgot,
    function(req, res, next) {
        req.flash('forgotMessage', "Please check your email! We've sent you instructions on how to reset your password.");
        res.redirect('/forgot');
    }
);





router.get('/reset*', function(req, res) {
    User.findOne({resetPasswordToken : req.query.token, resetPasswordExpires: { $gt: Date.now()}}, function(err, user){
        if (err) throw err;
        if(!user) {
            req.flash('forgotMessage', "Password reset token is invalid or has expired. Please re-enter your email.");
            res.redirect('/forgot');
        }
        if(user)  {
            req.user = user;
            res.render('reset', {
                user: req.user,
                message : req.flash('resetMessage'),
                title: 'ceda'
            });
        }
    });
});
router.post('/reset', local.reset,
    function(req, res, next) {
        req.flash('loginMessage', "Success! You're password has been changed.");
        res.redirect('/');
    }
);

//$2a$08$YPsDKBWB5Qy.Qvs8U9BdA.mI6Spy3EL8dbTfg9xvQWXBm3GAfFFBG"



// social media
router.get('/auth/facebook',
	passport.authenticate('facebook', {scope : ['email']}),
    function(req, res) {}
);
router.get('/auth/facebook/callback',
	passport.authenticate('facebook', {failureRedirect: '/'}),
	function(req, res){
		res.redirect('/home');
	}
);
router.get('/auth/twitter', 
	passport.authenticate('twitter'),
	function(req, res) {}
);
router.get('/auth/twitter/callback',
	passport.authenticate('twitter', {failureRedirect: '/'}),
	function(req, res){
		res.redirect('/home');
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
		res.redirect('/home');
	}
);




router.post('/username', function(req, res) {
    if(!req.body.username) {
        req.flash('usernameMessage', "Please enter a username");
        res.redirect('/home');
    } else {
        User.findOne({email : req.body.email}, function(err, user){
            if(err) throw err;
            User.findOne({username : req.body.username}, function(err, otheruser){
                if (err) throw err;
                if (otheruser) {
                    req.flash('usernameMessage', "Sorry, that username has been taken");
                    res.redirect('/home');
                }
                if (!otheruser) {
                    user.username = req.body.username;

                    user.save(function(err){
                        if(err) throw err;
                        req.session.save(function (err) {
                            if(err){
                                return next(err);
                            }
                            console.log('saving user');
                            res.redirect('/home');
                        });
                    });
                }
            });
        });
    }
});





router.get('/delete', function(req, res) {
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






router.get('/appealblocking', function(req, res) {
    res.render('appeal', {
        user : req.user,
        message : req.flash('appealMessage'),
        title : 'ceda'
    });
});

router.post('/appeal', function(req, res) {

    if(req.body.reason) {
        var newAppeal = new Appeal();
        newAppeal.user = req.user._id;
        newAppeal.appeal = req.body.reason;

        newAppeal.save(function(err){
            if (err) throw err;

            User.findById(req.user._id, function(err, user){
                if (err) throw err;

                var postmark = require("postmark")(process.env.POSTMARK_API_KEY);
                postmark.send({
                    "From": "admin@ceda.io",
                    "To": "admin@ceda.io",
                    "Subject": "Request to appeal blocked status",
                    "TextBody": 'Hello,\n\n' + user._id + ' at '+ user.email +' wants to appeal their blocked status.',
                    "Tag": "appeal"
                }, function(err) {
                    if(err) {
                        console.error("Unable to send via postmark: " + err.message);
                        return done(err);
                    }
                    console.info("Sent to postmark for delivery");
                    req.appeal = true;
                    res.redirect('/appeal', {
                        appeal: req.appeal,
                        user: req.user
                    });
                });
            });     
        });
    } else {

    }
});






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

