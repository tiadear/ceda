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

            function lastuser(currentuser, user1, user2, historyuser, historymsg, historytime){
                var lastusertomsg = new Promise(
                    function(resolve, reject) {

                        if(historyuser === currentuser) {
                            console.log('you were the last person to send a message');

                            // if you are the user_init
                            if(String(req.user._id) === String(user1)) {

                                //then your convo partner is the user_resp
                                User.findById(user2, function(err, partner) {
                                    if (err) throw err;
                                    console.log('convo partner is: ' + partner.username);
                                    resolve(partner.username);
                                });

                            }

                            // then you are the user_resp
                            else {

                                // and your convo partner MUST be the user_init
                                User.findById(user1, function(err, partner) {
                                    if (err) throw err;
                                    console.log('convo partner is: ' + partner.username);
                                    resolve(partner.username);
                                });
                            }
                        }
                        else {
                            resolve(historyuser);
                        }
                    }
                );

                lastusertomsg.then(
                    function(val) {
                        //make the array for that room the last item
                        arr1[id] = [val, historymsg, historytime];
                        //push the history array into an overall history array
                        arr2.push(arr1[id]);
                        //if the number of arrays is equal to the number of rooms
                        // ie. we have looped through every room
                        if(arr2.length == rooms.length) {
                            //send it to the callback
                            req.history = arr2;
                            callback(null, req.history);
                        }
                    }
                )
                .catch(
                    function(reason){
                        console.log('convo partner promise rejected for' + reason);
                    }
                );
            }

            function formatDate(date) {
                var hours = date.getHours();
                var minutes = date.getMinutes();
                var ampm = hours >= 12 ? 'pm' : 'am';
                hours = hours % 12;
                hours = hours ? hours : 12; // the hour '0' should be '12'
                minutes = minutes < 10 ? '0'+minutes : minutes;
                var strTime = hours + ':' + minutes + ' ' + ampm;
                var months = date.getMonth() +1;
                return date.getDate() + "/" + months + "/" + date.getFullYear() + "  " + strTime;
            }

            for(j = 0; j < rooms.length; j++){

                var id = rooms[j]._id;
                var _user1 = rooms[j].user_init;
                var _user2 = rooms[j].user_resp;
                var _currentuser = req.user.username;
                arr1[id] = [];
                var arr2 = [];

                chatHistory.find({room : id}, function(err, history) {

                    //loop through all history items for that room
                    for(i = 0; i < history.length; i++) {

                        //stop on the last item
                        if(i === ((history.length)-1)) {

                            var date = new Date(history[i].timesent);
                            var dateformat = formatDate(date);

                            lastuser(_currentuser, _user1, _user2, history[i].user, history[i].message, dateformat);
                        }
                    }

                });
			}
		}


	], function(err, result){
		//console.log('result: ' + result);
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




router.get('/chatpeer*', function(req, res) {
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

            if(req.query.user) {
                var key = req.query.user;
                console.log('user to talk to is: ' + key);
                User.findOne({ username : key}, function(err, user) {
                    if (err) throw err;
                    callback(null, user1, user1name, user._id, key);
                });
            } else {
                returnRandom(user1);
            }
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