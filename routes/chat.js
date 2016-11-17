var User = require('../models/account.js');
var Room = require('../models/room.js');
var chatHistory = require('../models/chatHistory.js');
var Flag = require('../models/flagged.js');

var express = require('express');
var router = express.Router();

var async = require('async');




router.get('/', function(req, res){

	async.waterfall([

		function(callback){
			//find all the rooms the current user has talked in
			Room.find({ $or: [{ user_init : req.user._id}, { user_resp : req.user._id }]}, function(err, rooms) {
				if (err) throw err;
                if(!rooms || rooms === '' || rooms.length === 0 || rooms === null) {
                   return callback(null); 
                }
				if(rooms) {
					callback(null, rooms);
				}
			});
		},

        function(rooms, callback) {

            

            function checkIfHistory(roomID, counter){
                var deleteChatHistory = new Promise(
                    function(resolve, reject) {
                        chatHistory.find({ room : roomID}, function(err, history) {
                            if (err) throw err;
                            if (!history || history === '' || history.length === 0 || history === null) {
                                console.log('room to delete: ' + roomID);
                                Room.findByIdAndRemove(roomID, function(err) {
                                    if (err) throw err;
                                    if(counter == (rooms.length -1)) {
                                        resolve(counter);
                                    }
                                });
                            } else {
                                if(counter == (rooms.length -1)) {
                                    resolve(counter);
                                }
                            }
                            
                        });
                    }
                );

                deleteChatHistory.then(
                    function(val) {
                        callback(null);
                    }
                )
                .catch(
                    function(reason){
                        console.log('first chat history promise rejected for' + reason);
                    }
                );
            }

            for(j = 0; j < rooms.length; j++){
                
                var id = rooms[j]._id;
                checkIfHistory(id, j);
            }
        },

        function(callback) {
            Room.find({ $or: [{ user_init : req.user._id}, { user_resp : req.user._id }]}, function(err, rooms) {
                if (err) throw err;
                if(rooms) {
                    callback(null, rooms);
                }   
            });
        },

		function(rooms, callback) {

            var arr1 = [];

            function isFlagged(roomID, currentuser, user1, user2, counter){

                var flaggedUser = new Promise( 
                    function(resolve, reject) {
                        // check if the current user has blocked the user init or user resp
                        Flag.findOne({user: { $in: [user1, user2] }, userWhoFlagged : currentuser}, function(err, flag) {
                            if(err) throw err;
                            if(flag) {
                                console.log(currentuser + ' has blocked ' + flag.user);
                                resolve(flag.user);
                            } else {
                                Flag.findOne({userWhoFlagged: { $in: [user1, user2] }, user : currentuser}, function(err, flag) {
                                    if(err) throw err;
                                    if (flag) {
                                        console.log(currentuser + ' has been blocked by ' + flag.userWhoFlagged);
                                        resolve(currentuser);
                                    } else {
                                        resolve('');
                                    }
                                });
                            }
                        });
                    }
                );
                flaggedUser.then (
                    function(val) {
                        getChatHistory(roomID, currentuser, user1, user2, counter, val);
                    }
                )
                .catch(
                    function(reason){
                        console.log('flagged user promise rejected for' + reason);
                    }
                );
            }

            function getChatHistory(roomID, currentuser, user1, user2, counter, blocked){
                var findChatHistory = new Promise(
                    function(resolve, reject) {
                        chatHistory.find({ room : roomID}).sort({ 'timesent' : -1}).exec(function(err, history) {
                            if (err) {
                                console.log(err);
                                throw err;
                            }
                            resolve(history);
                        });

                    }
                );

                findChatHistory.then(
                    function(val) {
                        findUser(roomID, currentuser, user1, user2, val[0].user, val[0].message, val[0].timesent, blocked);
                    }
                )
                .catch(
                    function(reason){
                        console.log('second chat history promise rejected for' + reason);
                    }
                );
            }

            function findUser(roomID, currentuser, user1, user2, historyUser, historyMessage, historyTime, blocked) {
                var findLastUser = new Promise (
                    function(resolve, reject) {
                        if(String(currentuser) === String(historyUser)) {
                            if(String(user1) === String(currentuser)) {
                                User.findById(user2, function(err, userresp) {
                                    if (err) throw err;
                                    resolve(userresp);
                                });
                            } else {
                                User.findById(user1, function(err, userinit) {
                                    if (err) throw err;
                                    resolve(userinit);
                                });
                            }
                        }
                        else {
                            User.findById(historyUser, function(err, convopartner) {
                                if (err) throw err;
                                resolve(convopartner);
                            });
                        }
                    }
                );
                findLastUser.then(
                    function(val) {
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

                        var date = new Date(historyTime);
                        var newtime = formatDate(date);

                        arr1[roomID] = [val._id, val.username, historyMessage, newtime, blocked];
                        arr2.push(arr1[roomID]);
                        //console.log('arr2: '+arr2);

                        if (arr2.length === rooms.length) {
                            //console.log('arr2: '+arr2);
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

            

            for(j = 0; j < rooms.length; j++){
                console.log('rooms.length: '+ rooms.length);
                var id = rooms[j]._id;
                var _user1 = rooms[j].user_init;
                var _user2 = rooms[j].user_resp;
                var _currentuser = req.user._id;
                arr1[id] = [];
                var arr2 = [];
                
                if(j === (rooms.length -1)) {
                    callback(null);
                }
                //isFlagged(id, _currentuser, _user1, _user2, j);
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

                        // check if the current user has blocked this user
                        Flag.findOne({user : user._id, userWhoFlagged : currentuser}, function(err, flag) {
                            if(err) throw err;
                            if(flag) {
                                console.log(currentuser+' has blocked '+user._id);
                                returnRandom(currentuser);
                            } else {
                                Flag.findOne({user : currentuser, userWhoFlagged : user._id}, function(err, flag) {
                                    if(err) throw err;
                                    if (flag) {
                                        console.log(user._id+' has blocked '+currentuser);
                                        returnRandom(currentuser);
                                    } else {
                                        if(user.userType === 1) {
                                            console.log('incorrect user type');
                                            returnRandom(currentuser);
                                        } else {
                                            var randomPeer = user._id;
                                            var randomUsername = user.username;
                                            console.log('user 2 is: ' + randomUsername);
                                            callback(null, user1, user1name, randomPeer, randomUsername);
                                        }
                                    }
                                });
                            }
                        }); 
                    } else {
                       console.log('random user is the same as current user');
                       returnRandom(user._id);
                    }
                });
            }

            if(req.query.user) {
                var key = req.query.user;
                User.findById(key, function(err, user) {
                    if (err) throw err;
                    console.log('user to talk to is: ' + user.username);
                    callback(null, user1, user1name, key, user.username);
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
                userIDs : req.userIDs,
                title: 'ceda',
                pageTitle: 'chat'
            });
        });
    });
});




router.get('/chatprof*', function(req, res) {
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

                        if(user.userType === 0) {
                            console.log('incorrect user type');
                            returnRandom(currentuser);
                        } else {
                            var randomPeer = user._id;
                            var randomUsername = user.username;
                            console.log('user 2 is: ' + randomUsername);
                            callback(null, user1, user1name, randomPeer, randomUsername);
                        }
                    
                    } else {
                       console.log('random user is the same as current user');
                       returnRandom(user._id);
                    }
                });
            }

            if(req.query.user) {
                var key = req.query.user;
                User.findById(key, function(err, user) {
                    if (err) throw err;
                    console.log('user to talk to is: ' + user.username);
                    callback(null, user1, user1name, key, user.username);
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
                    console.log('room was not found, looking again...');
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
                            newRoom.room_type = 1;

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
                userIDs : req.userIDs,
                title: 'ceda',
                pageTitle: 'chat'
            });
        });
    });
});



router.get('/blockuser', function(req, res){
    async.waterfall([

        function(callback) {
            var flaggedUser = req.query.id;

            var newFlag = new Flag();
            newFlag.user = flaggedUser;
            newFlag.flagged = true;
            newFlag.userWhoFlagged = req.user._id;

            newFlag.save(function(err){
                if (err) throw err;
                callback(null, flaggedUser, req.user._id);
            });
        },

        function(flaggedUser, userWhoFlagged, callback) {
            Flag.find({user : flaggedUser}, function(err, flags) {
                if (err) throw err;
                if(flags) {
                    if ((flags.length +1) === 3) {
                        User.update(
                            { '_id' : flaggedUser },
                            { $set: { isBlocked : true } },
                            function(err, user) {
                                if(err) throw err;
                                console.log('user: '+ flaggedUser +' has been blocked');
                                callback(null);
                            }
                        );
                    } else {
                        callback(null);
                    }
                }
            });
        }
    ], function(err, result) {
        req.session.save(function(err){
            if (err) throw err;
            res.redirect('/');
        });
    });

});

module.exports = router;