'use strict';

const mongoose = require('mongoose');
var User = require('../models/account');
var Room = require('../models/room');
var ChatHistory = require('../models/chatHistory');
var uuid = require('uuid');
var db = require('../db');


exports.pickpeer = function(userid) {


	console.log('chat pickpeer actually starts');

	// generate a random peer to chat with
	User.random(function(err, user) {
		if(err) {
			throw err;
		}
		console.log('within function, random peer is ' +user._id);
		var randomPeer = user._id;

		// get current user
		var currentUser = userid;
		console.log('current user is: ' + currentUser);

		Room.find({user_init : currentUser, user_resp : randomPeer}, function (err, room) {
			console.log('chat pickpeer point 1');
			if (err) {
				//error while looking for room
				console.log(err);
				return done(err);
			}

			if(room) {
				//room was found 
				console.log('room was found with '+ currentUser+' as user_init and '+randomPeer +' as user_resp');

				// initiate room again

			} else {
				//no room was found
				console.log('chat pickpeer point 2')

				//check if the users were the other way around
				Room.find({user_resp : currentUser, user_init : randomPeer}, function (err, room) {
					if (err) {
						console.log('no room found');
						return done(err);
					}
					if(room) {
						console.log('room was found with '+ currentUser+' as user_respand '+ randomPeer + 'as user_init');
							
						//initiate room again

					} else {
						console.log('no room found');
						// CREATE A NEW ROOM
					}
				});
			}
		});

	});


			//query db if random peer is in a room with current user
		// 

}