'use strict';


const mongoose = require('mongoose');
const LocalStrategy = require('passport-local').Strategy;
const passport = require('passport');
var User = require('../models/account');


module.exports = new LocalStrategy({
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
					return done(null, false);
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
);

