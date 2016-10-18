'use strict';

var mongoose = require('mongoose');
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

		Room.findOne({user_init : currentUser, user_resp : randomPeer}, function (err, room) {
			console.log('chat pickpeer point 1');
			if (err) {
				//error while looking for room
				console.log(err);
				return done(err);
			}

			if(room) {
				//room was found 
				console.log('room was found with '+ currentUser+' as user_init and '+randomPeer +' as user_resp');

				console.log('roomID: '+ room.roomID);
				console.log('room._id: '+ room.id);
				
				return done(null, room);
			}

			//no room was found
			console.log('chat pickpeer point 2')

			//check if the users were the other way around
			Room.findOne({user_resp : currentUser, user_init : randomPeer}, function (err, room) {
				if (err) {
					console.log('no room found');
					return done(err);
				}
				if(room) {
					console.log('room was found with '+ currentUser+' as user_respand '+ randomPeer + 'as user_init');

					console.log('roomID: '+ room.roomID);
					console.log('room._id: '+ room.id);
				
					return done(existingRoomID);
				} 

				console.log('no room found');

				// create a new room!
				var newRoom = new Room();
				newRoom.roomID = uuid.v4();
				newRoom.user_init = currentUser;
				newRoom.user_resp = randomPeer;
				newRoom.room_type = 0;

				newRoom.save(function(err){
					if(err) {
						console.log(err);
						console.log('saving error')
						return done(err);
					} else {
						console.log('saving user');
						return done(null, newRoom);
					}
				});
				
			});
			
		});

	});


			//query db if random peer is in a room with current user
		// 

}