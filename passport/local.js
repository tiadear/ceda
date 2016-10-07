'use strict';


const mongoose = require('mongoose');
const LocalStrategy = require('passport-local').Strategy;
var User = require('../models/account');

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



}



