'use strict';

const mongoose = require('mongoose');
const LocalStrategy = require('passport-local').Strategy;
var User = require('../models/account');
var uuid = uuid = require('uuid');

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
		passReqToCallback: true
		},
		function(req, email, password, done) {
			process.nextTick(function(){
				User.findOne({email : email}, function(err, user){
					if(err) {
						return done(err);
						console.log('something went horribly wrong');
					}

					if(user) {
						return done(null, false, req.flash('signupMessage', 'User already exists'));
						console.log('user exists');
					} 

					else {
						var newUser = new User ()
						newUser.email = email;
						newUser.password = newUser.generateHash(password);
						newUser.firstName = req.body.firstName;
						newUser.lastName = req.body.lastName;
						newUser.provider = 'local';


						newUser.save(function(err){
							if(err) {
								console.log(err);
								console.log('saving error')
								return done(err);
							} else {
								console.log('saving user');
								return done(null, newUser);
							}
						});
					} // end else
				});
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
					return done(err);
					console.log('something went horribly wrong #2');
				}

				if(!user) {
					return done(null, false, req.flash('loginMessage', 'No user found'));
				}

				if(!user.validPassword(password)) {
					return done(null, false, req.flash('loginMessage', 'Wrong password'));
				} 

				return done(null, user);
			});
		}
	));






	exports.forgot = function(req, email, done) {
			console.log('forget password point 1');
			var token = uuid.v4();

			User.findOne({email : req.body.email}, function(err, user){
				if (err) {
					return done(err);
					console.log('forgot password went wrong');
				}
				if(!user) {
					return res.redirect('/forgot');
		        }

		        user.resetPasswordToken = token;
		        user.resetPasswordExpires = Date.now() + 6*3600*1000;

		        console.log('forget password point 2');
		        
		        user.save(function(err){
		        	
		        	if(err) {
		        		return done(err);
		        	}
		        		console.log('forget password point 3');
		        		transport.sendMail({
							from: 'e21c75b229fbe6890f93a1777dcea1dd@inbound.postmarkapp.com',
							to: user.email,
							subject: 'Your password has been changed',
							html: '<h1>Hello</h1><br><p>You are receiving this email because someone has requested the to change the password for ' + user.email + '. If this was you, please click on the following link to finish resetting your password.<br>http://' + req.headers.host + '/reset/' + token + '<br> If you did not make this request, please ignore this email and your password will remain the same.</p>'
						}, function(err, info) {
							if (err) {
								console.error(err);
							} else {
								console.log('success');
					        	done(err);
							}
						});
		        	

		        });

			});
	}




	exports.reset = function(req, email, done) {
		User.findOne({resetPasswordToken : req.params.token, resetPasswordExpires: { $gt: Date.now()}}, function(err, user){
			if(!user) {
				return done(err);
				console.log('this reset password person does not exist');
			} else {
				res.render('reset',{
					user: req.user
				});
			}
		});
	}
}

