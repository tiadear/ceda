// ROUTES!!!

const User = require('../models/account.js');
const express = require('express');
const passport = require('passport');
const router = express.Router();
const LocalStrategy = require('passport-local').Strategy;
const local = require('../passport/local');
local.strategy(passport);




router.get('/', function(req, res){
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
            console.log('login error 1');
            return next(err);
        }
        res.redirect('/');
        console.log('login redirect');
    });
});



// social media

router.get('auth/facebook', 
	passport.authenticate('facebook'),
	function(req, res) {}
);
router.get('auth/facebook/callback',
	passport.authenticate('facebook', {failureRedirect: '/'}),
	function(req, res){
		res.redirect('/account');
	}
);


router.get('auth/twitter', 
	passport.authenticate('twitter'),
	function(req, res) {}
);
router.get('auth/twitter/callback',
	passport.authenticate('twitter', {failureRedirect: '/'}),
	function(req, res){
		res.redirect('/account');
	}
);


router.get('auth/google', 
	passport.authenticate('google', { scope: [
		'https://www.googleapis.com/auth/plus.login',
    	'https://www.googleapis.com/auth/plus.profile.emails.read'
	]})
);
router.get('auth/google/callback',
	passport.authenticate('google', {failureRedirect: '/'}),
	function(req, res){
		res.redirect('/account');
	}
);




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





router.get('/ping', function(req, res){
    res.status(200).send("pong!");
});

module.exports = router;

