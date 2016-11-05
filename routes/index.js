// ROUTES!!!

const User = require('../models/account.js');
const Room = require('../models/room.js');
var Thread = require('../models/thread.js');
var Post = require('../models/posts.js');
var chatHistory = require('../models/chatHistory.js');

const express = require('express');
const router = express.Router();
var async = require('async');

const passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
const local = require('../passport/local');
local.strategy(passport);




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
        message : req.flash('signupMessage')
    });
});

router.post('/signup', passport.authenticate('local-signup', { failureRedirect: '/signup', failureFlash: true}), function(req, res, next) {
        req.session.save(function (err) {
            if(err){
                return next(err);
            }
            res.render('home', {
                user : req.user,
                title: 'ceda'
            });

        });
    }
);




router.post('/login', passport.authenticate('local-login', { 
    failureRedirect: '/', 
    failureFlash: true 
}), function(req, res, next) {
    req.session.save(function (err) {
        if (err) {
            console.log(err);
            return next(err);
        }
        res.render('home', {
            user : req.user,
            title: 'ceda'
        });
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
		res.render('home', {
            user : req.user,
            title: 'ceda'
        });
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
		res.render('home', {
            user : req.user,
            title: 'ceda'
        });
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
                    res.render('home', {
                        user : req.user,
                        title: 'ceda'
                    });
                });
            });
        }
    });
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

