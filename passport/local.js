'use strict';


const mongoose = require('mongoose');
const LocalStrategy = require('passport-local').Strategy;
const passport = require('passport');

var User = require('../models/account.js');
//rt.use(new LocalStrategy(User.authenticate()));

//module.exports = new LocalStrategy(User.authenticate());


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
		          	username: username,
		          	password: String,
		          	email: email,
		          	firstname: firstName,
		          	lastName: lastName,
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




