'use strict';


const mongoose = require('mongoose');
const LocalStrategy = require('passport-local').Strategy;
const passport = require('passport');
var User = require('../models/account.js');


//module.exports = new LocalStrategy(User.authenticate());

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
					user = new User ({
						//username: username,
		          		password: password,
		          		email: email,
		          		//firstname: firstName,
		          		//lastName: lastName,
		          		provider: 'local'
					});
					user.save(function(err){
						if(err) {
							console.log(err);
							return done(err);
						} else {
							console.log('saving user');
							return done(null, user);
						}
					});
				} // end else
			});
		});
	}
);






/*
module.exports = new LocalStrategy({
	usernameField: 'email',
	passwordField: 'password'
	},
	function (email, password, done) {
		User.findOne({ email: email }, function(err, user) {
	      	if(err) {
	        	console.log(err);  // handle errors!
	      	}
	      	if (!err && user !== null) {
	        	done(null, user);
	      	} else {
	        	user = new User({
		          	//username: username,
		          	password: password,
		          	email: email,
		          	//firstname: firstName,
		          	//lastName: lastName,
		          	provider: 'local'
	        	});
		        user.save(function(err) {
		          	if(err) {
		            	console.log(err);  // handle errors!
		          	} else {
		            	console.log("saving user ...");
		            	done(null, user);
		          	}
		        });
	      	}
	    });
	}
);

*/


