var User = require('../models/account.js');
var Room = require('../models/room.js');
var chatHistory = require('../models/chatHistory.js');

var express = require('express');
var router = express.Router();

var async = require('async');




router.get('/', function(req, res){
	async.waterfall([

		function(callback){
			//find all the rooms the current user has talked in
			var roomsArr = []
			Room.find({ $or: [{ user_init : req.user._id}, { user_resp : req.user._id }]}, function(err, rooms) {
				if (err) throw err;
				if(rooms) {
					callback(null, rooms);
				}	
			});
		},

		function(rooms, callback) {

            var arr1 = [];

            for(j = 0; j < rooms.length; j++){
                id = rooms[j]._id;

                arr1[id] = [];

    			chatHistory.find({room : id}, function(err, history) {

                    for(i = 0; i < history.length; i++) {       
                        arr1[id][i] = [];
                        arr1[id][i].push(history[i].user, history[i].message, history[i].timesent);
                            console.log('i: '+ i);
                            console.log('number of rooms: '+rooms.length);
                            console.log('history length: '+history.length);
                            console.log('arr[id] length: '+arr1[id].length);
                            console.log('arr length: '+arr1.length);
                            
                            // THIS IS A SHODDY METHOD FOR TESTING
                            //should be comparing to room length right?
                            
                            if(arr1[id].length === history.length) {
                                req.history = arr1[id];
                                callback(null, req.history);
                            }
                    }

                    


                    

    			});
			}
            
		}


	], function(err, result){
		console.log('result: ' + result);
        req.session.save(function(err){
            if (err) {
                console.log(err);
                throw err;
            }
            res.render('chat', {
                history : req.history,
                user : req.user,
				title : 'ceda'
            });
        });
	});
});


router.get('/chatpeer', function(req, res) {
    async.waterfall([
        function(callback) {
            User.findById(req.user._id, function(err, user) {
                if(err) throw err;
                var currentUser = user._id;
                var currentUsername = user.username;
                console.log('user 1 is: ' + currentUsername);
                callback(null, currentUser, currentUsername);
            });
        },
        function(user1, user1name, callback) {

            function returnRandom(currentuser) {

                User.random(function(err, user) {
                    if (err) throw err;
                    if(String(user._id) != String(currentuser)) {
                        var randomPeer = user._id;
                        var randomUsername = user.username;
                        console.log('user 2 is: ' + randomUsername);
                        callback(null, user1, user1name, randomPeer, randomUsername);
                    } else {
                       console.log('random user is the same as current user');
                       returnRandom(user._id);
                    }
                });
            }
            returnRandom(user1);
        },
        function(user1, user1name, user2, user2name, callback) {
            console.log('looking for a room...');
            Room.findOne({user_init : user1, user_resp : user2}, function(err, room) {
                if (err) throw err;
                if (room) {
                    console.log('room was found');
                    req.room = room;
                    req.usersInRoom = [user1name, user2name];
                    req.userIDs = [user1, user2];
                    callback(null, req.room, req.usersInRoom, req.userIDs);
                } else {
                    console.log('room was not found, looking again...')
                    Room.findOne({user_init : user2, user_resp : user1}, function(err, room) {
                        if (err) throw err;
                        if (room) {
                            console.log('room was found');
                            req.room = room;
                            req.usersInRoom = [user1name, user2name];
                            req.userIDs = [user1, user2];
                            callback(null, req.room, req.usersInRoom, req.userIDs);
                        } else {
                            console.log('no room found');
                            // create a new room!
                            var newRoom = new Room();
                            newRoom.user_init = user1;
                            newRoom.user_resp = user2;
                            newRoom.room_type = 0;

                            newRoom.save(function(err){
                                if (err) {
                                    console.log(err);
                                    throw err;
                                } else {
                                    console.log('saving user');
                                    req.room = newRoom;
                                    req.usersInRoom = [user1name, user2name];
                                    req.userIDs = [user1, user2];
                                    callback(null, req.room, req.usersInRoom, req.userIDs);
                                }
                            });
                        }
                    });

                }
            });
            
        }
    ], function (err, result) {
        console.log(result);

        req.session.save(function(err){
            if (err) {
                console.log(err);
                throw err;
            }
            res.render('chatroom', {
                room : req.room,
                usersInRoom : req.usersInRoom,
                userIDs : req.userIDs
            });
        });
    });
});




router.get('/chatprof', function(req, res) {
    async.waterfall([
        function(callback) {
            User.findById(req.user._id, function(err, user) {
                if(err) throw err;
                var currentUser = user._id;
                var currentUsername = user.username;
                console.log('user 1 is: ' + currentUsername);
                callback(null, currentUser, currentUsername);
            });
        },
        function(user1, user1name, callback) {

            function returnRandom(currentuser) {

                User.random(function(err, user) {
                    if (err) throw err;
                    if(String(user._id) != String(currentuser) && (user.userType == true)) {
                        var randomPeer = user._id;
                        var randomUsername = user.username;
                        console.log('user 2 is: ' + randomUsername);
                        callback(null, user1, user1name, randomPeer, randomUsername);
                    } else {
                       console.log('random user is the same as current user');
                       returnRandom(user._id);
                    }
                });
            }
            returnRandom(user1);
        },
        function(user1, user1name, user2, user2name, callback) {
            console.log('looking for a room...');
            Room.findOne({user_init : user1, user_resp : user2}, function(err, room) {
                if (err) throw err;
                if (room) {
                    console.log('room was found');
                    req.room = room;
                    req.usersInRoom = [user1name, user2name];
                    req.userIDs = [user1, user2];
                    callback(null, req.room, req.usersInRoom, req.userIDs);
                } else {
					console.log('no room found');
					// create a new room!
					var newRoom = new Room();
					newRoom.user_init = user1;
					newRoom.user_resp = user2;
					newRoom.room_type = 0;

					newRoom.save(function(err){
						if (err) {
							console.log(err);
							throw err;
						} else {
							console.log('saving user');
							req.room = newRoom;
							req.usersInRoom = [user1name, user2name];
							req.userIDs = [user1, user2];
							callback(null, req.room, req.usersInRoom, req.userIDs);
						}
					});
				}
            });
            
        }
    ], function (err, result) {
        console.log(result);

        req.session.save(function(err){
            if (err) {
                console.log(err);
                throw err;
            }
            res.render('chatroom', {
                room : req.room,
                usersInRoom : req.usersInRoom,
                userIDs : req.userIDs
            });
        });
    });
});


module.exports = router;