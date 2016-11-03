var User = require('../models/account.js');
var Thread = require('../models/thread.js');
var Post = require('../models/posts.js');
var express = require('express');
var router = express.Router();
var async = require('async');


router.get('/', function(req, res) {
	res.render('settings', {
		user : req.user,
		title : 'ceda'
	});
});


// display the page to change the account settings
router.get('/change*', function(req, res) {
	//var id = req.query.id;
	var field = req.query.field;
	res.render('settingschange', {
		user : req.user,
		field : field,
		message : req.flash('settingsMessage'),
		title : 'ceda'
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
					res.redirect('/');
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
					res.redirect('/');
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
							function(err, user) {
								if(err) throw err;
								console.log('user details updated');
								res.redirect('/');
							}
						);
					}
				}
				
			});
					
		} else {
			console.log('no field');
			return done(err)
		}
	}
		
});


// notification settings
router.post('/', function(req, res) {
	async.waterfall([

		function(callback) {


		}
		
	], function(err, result) {
		if(err) throw err;
		console.log('result: '+result);
		res.render('settings', {
			user : req.user,
			notifications : req.notifications,
			title : 'ceda'
		});
	});
});



module.exports = router;