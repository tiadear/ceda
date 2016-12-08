var User = require('../models/account.js');
var Thread = require('../models/thread.js');
var Post = require('../models/posts.js');
var express = require('express');
var router = express.Router();
var async = require('async');



function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { 
        console.log('is authenticated');
        return next(); 
    }
    res.redirect('/');
}





router.get('/', ensureAuthenticated, function(req, res) {
	res.render('settings', {
		user : req.user,
		title : 'ceda',
		pageTitle: 'settings'
	});
});


// display the page to change the account settings
router.get('/change*', ensureAuthenticated, function(req, res) {
	//var id = req.query.id;
	var field = req.query.field;
	res.render('settingschange', {
		user : req.user,
		field : field,
		message : req.flash('settingsMessage'),
		title : 'ceda',
		pageTitle: 'settings'
	});
});


// actually change the acount settings
router.post('/change*', function(req, res, done) {

	if(req.body.update) {
		var id = req.body.userId;
		//var id = req.user._id;
		var field = req.query.field;

		if (field === 'email') {
			User.update(
				{ '_id' : id },
				{ $set: { email : req.body.update } },
				function(err, user) {
					if(err) throw err;
					console.log('user details updated');

					var postmark = require("postmark")(process.env.POSTMARK_API_KEY);
					postmark.send({
						"From": "admin@ceda.io",
						"To": req.body.update,
						"Subject": "Email Change",
						"TextBody": 'Hello,\n\n' + 'This is confirmation that your email address was changed at Ceda. If this was not you, please advise us immediately. If this was you, please ignore this email.',
						"Tag": "email"
					}, function(err) {
						if(err) {
							console.error("Unable to send via postmark: " + err.message);
							return done(err);
						}
						console.info("Sent to postmark for delivery");
					
						res.render('settings', {
							user : req.user,
							title : 'ceda',
							pageTitle: 'settings'
						});
					});
				}
			);
		}
		
		else if (field === 'username') {
			User.update(
				{ '_id' : id },
				{ $set: { username : req.body.update } },
				function(err, user) {
					if(err) throw err;
					console.log('user details updated');
					res.redirect('/settings');
				}
			);
		}
		
		else if (field === 'password') {

			User.findById(id, function(err, user) {
				if(err) {
					console.log('something went horribly wrong');
					throw err;
				}

				if (user) {
					req.user = user;
					var email = user.email;
					//confirm current password matches db
					if(!user.validPassword(req.body.current)) {
					console.log('wrong password');
						var e = 'Incorrect current password entered';
						req.flash('settingsMessage', e);
						res.redirect('/settings/change?field=password');
					}
					//check new passwords match
					else if(req.body.update != req.body.confirm) {
						var e = 'Passwords do not match';
						req.flash('settingsMessage', e);
						res.redirect('/settings/change?field=password');
					}
					else {
						var newPassword = user.generateHash(req.body.update);
						User.update(
							{ '_id' : id },
							{ $set: { password : newPassword } },
							function(err, useragain) {
								if(err) throw err;

								console.log('user details updated');

								var postmark = require("postmark")(process.env.POSTMARK_API_KEY);
					        	postmark.send({
									"From": "admin@ceda.io",
									"To": user.email,
									"Subject": "Password Change",
									"TextBody": 'Hello,\n\n' + 'This is confirmation that your password was changed at Ceda. If this was not you, please advise us immediately. If this was you, please ignore this email.',
									"Tag": "password"
								}, function(err) {
									if(err) {
										console.error("Unable to send via postmark: " + err.message);
										return done(err);
									}
									console.info("Sent to postmark for delivery");
									
									req.user = useragain;
									res.render('settings', {
										user : req.user,
										title : 'ceda',
										pageTitle: 'settings'
									});
								});
							}
						);
					}
				}
				
			});
					
		} else {
			res.redirect('/settings');
		}
	}
		
});


// notification settings
router.post('/', function(req, res) {

	async.waterfall([

		function(callback) {

			if (String(req.body.checked) === String(true)) {
				console.log('1 ' + req.body.checked);
				callback(null, true);
			} else {
				console.log('2 ' + req.body.checked);
				callback(null, false);
			}

		}, function(checked, callback) {

			var field = req.query.field;
			var id = req.body.id;

			if (field === 'defaultMic') {
				User.update(
					{ '_id' : id },
					{ $set: { defaultMic : checked } },
					function(err, user) {
						if(err) throw err;
						console.log('user details updated');
						callback(null);
					}
				);
			}
			else if (field === 'defaultVideo') {
				User.update(
					{ '_id' : id },
					{ $set: { defaultVideo : checked } },
					function(err, user) {
						if(err) throw err;
						console.log('user details updated');
						callback(null);
					}
				);
			}
		}
		
	], function(err, result) {
		if(err) throw err;
		res.render('settings', {
			user : req.user,
			title : 'ceda',
			pageTitle: 'settings'
		});
	});
});



module.exports = router;