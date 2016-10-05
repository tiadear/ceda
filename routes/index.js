// ROUTES!!!


const Account = require('../models/account');
const express = require('express');
const passport = require('passport');
const router = express.Router();

router.get('/', function(req, res){
	res.render('index', {user : req.user});
});



router.get('/signup', function(req, res) {
	res.render('signup', { });
});


router.post('/signup', function(req, res, next) {
    Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
        if (err) {
          return res.render('signup', { error : err.message });
        }

        passport.authenticate('local')(req, res, function () {
            req.session.save(function (err) {
                if (err) {
                    return next(err);
                }
                res.redirect('/');
            });
        });
    });
});



router.get('/login', function(req, res) {
    res.render('login', { user : req.user, error : req.flash('error')});
});

router.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), function(req, res, next) {
    req.session.save(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
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

