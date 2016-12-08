'use strict';

const mongoose = require('mongoose');
const LocalStrategy = require('passport-local').Strategy;
var User = require('../models/account');
var uuid = require('uuid');
var passport = require('passport');
var nodemailer = require('nodemailer');
var postmarkTransport = require('nodemailer-postmark-transport');

var transport = nodemailer.createTransport(postmarkTransport({
	auth: {
		apiKey: 'f10fdd32-e534-43d7-8352-cf802c4290c0'
	}
}));

exports.strategy = function(passport) {

	passport.use('local-signup', new LocalStrategy({
		usernameField: 'email',
		passwordField: 'password',
		passReqToCallback : true
		},
		function(req, email, password, done) {
			User.findOne({email : req.body.email}, function(err, user){
				if(err) {
					console.log('something went horribly wrong');
					return done(err);
				}
				// check if the user already exists
				if(user) {
					return done(null, false, req.flash('signupMessage', 'User already exists'));
				}
				if(!user) {
					//check if all fields are filled out
					if(!req.body.username || !req.body.password || !req.body.confirmPassword) {
						return done(null, false, req.flash('signupMessage', 'Please complete all fields'));
					}
					else {
						// check if the passwords match
						if(req.body.password != req.body.confirmPassword) {
							return done(null, false, req.flash('signupMessage', 'Passwords do not match. Please try again.'));
						}
						else {
							var newUser = new User ();
							newUser.email = req.body.email;
							newUser.username = req.body.username;
							newUser.password = newUser.generateHash(req.body.password);
							newUser.notifyChat = 1;
							newUser.notifyForum = 1;
							newUser.provider = 'local';
							newUser.userType = false;

							newUser.save(function(err){
								if(err) {
									console.log(err);
									return done(err);
								} else {
									console.log('saving user');
									return done(null, newUser);
								}
							});
						}
					}
				} // end else
			});

		}
	));


	passport.use('local-login', new LocalStrategy({
		usernameField: 'email',
		passwordField: 'password', 
		passReqToCallback: true
		},
		function(req, email, password, done) {
			User.findOne({email : email}, function(err, user) {

				if(err) {
					console.log('something went horribly wrong #2');
					return done(err);
				}

				if(!user) {
					return done(null, false, req.flash('loginMessage', 'Sorry, no user exists with that email address'));
				}

				if(!user.validPassword(password)) {
					console.log('invalid password');
					return done(null, false, req.flash('loginMessage', 'Wrong password'));
				}
				if (user) {
					console.log('found user: '+ user._id);
					User.update(
						{ '_id' : user._id },
						{ $currentDate: { lastLogin: true } },
						function(err, useragain) {
							console.log('user updated');
							if (err) {
								console.log('err: '+ err);
								return done(err);
							}
							return done(null, user);
						}
					);
				}
			});
		}
	));






	exports.forgot = function(req, email, done) {
			var token = uuid.v4();

			User.findOne({email : req.body.email}, function(err, user){
				if (err) {
					console.log('forgot password went wrong');
					return done(err);
				}
				if(!user) {
					return done(null, false, req.flash('forgotMessage', "Sorry, no users with that email address were found"));
		        }

		        user.resetPasswordToken = token;
		        user.resetPasswordExpires = Date.now() + 6*3600*1000;
		        
		        user.save(function(err){
		        	if(err) throw err;
		        	var postmark = require("postmark")(process.env.POSTMARK_API_KEY);
		        	postmark.send({
						"From": "admin@ceda.io",
						"To": user.email,
						"Subject": "Password Reset",
						"TextBody": 'Hello,\n\n' + 'You are receiving this email because someone has requested the to change the password for ' + user.email + '. If this was you, please click on the following link to finish resetting your password.\n\n' + 'http://' + req.headers.host + '/reset?token=' + token + '.\n\n' + 'If you did not make this request, please ignore this email and your password will remain the same.',
						"Tag": "password"
					}, function(err) {
						if(err) {
							console.error("Unable to send via postmark: " + err.message);
							return done(err);
						}
						console.info("Sent to postmark for delivery");
						return done(null, user);
					});
		        });
			});
	}




	exports.reset = function(req, res, done) {

		User.findById(req.body.userid, function(err, user){
			if (err) throw err;
			
			if(user){
				// check if both fields are filled in
				if(!req.body.password || !req.body.confirmPassword) {
					req.flash('resetMessage', 'Please fill in both fields');
					res.redirect('reset?token='+user.resetPasswordToken);
				}
				else {
					user.password = user.generateHash(req.body.password);
					user.resetPasswordToken = undefined;
					user.resetPasswordExpires = undefined;

					user.save(function(err) {
						if(err) throw err;
						console.log('reset password successful');

						var postmark = require("postmark")(process.env.POSTMARK_API_KEY);

						postmark.send({
							"From": "admin@ceda.io",
							"To": user.email,
							"Subject": "Password Change",
							"TextBody": 'Hello,\n\n' + 'This is a confirmation that the password for ' + user.email + ' has been changed.',
							"Tag": "password"
						}, function(err) {
							if(err) {
								console.log('Password reset confirmation email not sent');
								return done(err);
							}
							console.log('Password reset confirmation email sent');
							return done(null, user);
						});
					});
				}
			}
			
		});
	}
}

