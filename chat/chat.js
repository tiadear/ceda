'use strict';

const mongoose = require('mongoose');
var User = require('../models/account');
var Room = require('../models/room');
var ChatHistory = require('../models/ChatHistory');
var uuid = uuid = require('uuid');

exports.strategy = function() {

	exports.pickpeer = function(req,res, done) {
		var randomPeer = User.aggregate({
			$sample: {size: 1}
		});

		var currentUser = user.id;

		Room.find({user_init : currentUser, user_resp : randomPeer}, function(err, room) {
			if (err) {
				//error while looking for room
				console.log(err);
				return done(err);
			}

			if(room) {
				//room was found 
				console.log('room was found with '+ currentUser+' as user_init and '+ randomPeer +' as user_resp');

				// initiate room again

			} else {
				//no room was found

				//check if the users were the other way around
				Room.find({user_resp : currentUser, user_init : randomPeer}, function(err, room) {
					if (err) {
						console.log('no room found');
						return done(err);
					}
					if(room) {
						console.log('room was found with '+ currentUser+' as user_resp and '+ randomPeer + 'as user_init');
						
						//initiate room again

					} else {
						console.log('no room found');
						// CREATE A NEW ROOM
					}
				});
			}
		});
		//query db if random peer is in a room with current user
		// 

	}
}