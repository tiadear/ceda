// ROUTES!!!

const User = require('../models/account.js');
const Room = require('../models/room.js');
var Thread = require('../models/thread.js');
var Post = require('../models/posts.js');
var chatHistory = require('../models/chatHistory.js');
var Flag = require('../models/flagged.js');

const express = require('express');
const router = express.Router();
var async = require('async');

const passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
const local = require('../passport/local');
local.strategy(passport);




// dashbaord
router.get('/*', function(req, res) {

    async.waterfall([

        function(callback) {
            console.log('home point 1');
            Post.find({user : req.user._id}, function(err, posts) {
                if (err) throw err;
                callback(null, posts);
            });
            

        }, function(posts, callback) {
            console.log('home point 2');
            if(posts.length === 0) {
                var alerts = null;
                callback(null, alerts);
            }

            arr = [];
            arr2 = [];

            // 2 - get the thread title
            function findThreads(threadId, counter, total) {
                var newThread = new Promise(
                    function(resolve, reject) {
                        Thread.findById(threadId, function(err, thread) {
                            if (err) throw err;
                            resolve(thread.title);
                        });
                    }
                );
                newThread.then(
                    function(val) {
                        lastPost(threadId, val, counter, total);
                    }
                )
                .catch(
                    function(reason){
                        console.log('thread not found due to ' + reason);
                    }
                );
            }

            function uniq(a) {
                var seen = {};
                return a.filter(function(item) {
                    return seen.hasOwnProperty(item) ? false : (seen[item] = true);
                });
            }

            // 3 - get the last post in that thread
            function lastPost(threadId, threadTitle, counter, total) {
                var getLastPost = new Promise(
                    function(resolve, reject) {
                        Post.find({ threadId : threadId}).sort({ 'created' : -1}).limit(1).exec(function(err, post) {
                            if (err) throw err;
                            if (post) {
                                resolve(post);
                            }
                        });
                    }
                );
                getLastPost.then(
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

                        var date = new Date(val[0].created);
                        var postTime = formatDate(date);

                        findUser(threadId, threadTitle, counter, total, val[0].user, val[0].content, postTime);
                    }
                )
                .catch(
                    function(reason){
                        console.log('last post not found due to ' + reason);
                    }
                );
            }


            function findUser(threadId, threadTitle, counter, total, postUser, postContent, postTime) {
                var getUsername = new Promise (
                    function(resolve, reject) {
                        User.findById(postUser, function(err, user){
                            if (err) throw err;
                            resolve(user.username);
                        });
                    }
                );
                getUsername.then(
                    function(val)  {
                        arr[threadId] = [threadId, threadTitle, postUser, val, postContent, postTime];
                        arr2.push(arr[threadId]);

                        //console.log('counter: '+counter);
                        if(counter === (total -1)) {
                            req.alertsForum = uniq(arr2);
                            //console.log('req.alertsForum: '+ req.alertsForum);
                            callback(null, req.alertsForum);
                        }
                    }
                )
                .catch(
                    function(reason){
                        console.log('username was not found due to ' + reason);
                    }
                );
            }

            // 1 - loop through all the posts written
            posts.forEach(function(post, i) {
                findThreads(post.threadId, i, posts.length);
            });


        },

        function(alertsForum, callback) {
            console.log('home point 3');
            Room.find({ $or: [{ user_init : req.user._id}, { user_resp : req.user._id }]}, function(err, rooms) {
                if (err) throw err;
                callback(null, alertsForum, rooms);
            });
        },

        function(alertsForum, rooms, callback) {
            console.log('home point 4');
            if(rooms.length === 0) {
                req.alertsForum = alertsForum;
                callback(null, req.alertsForum);
            }

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
                        callback(null, alertsForum);
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

        function(alertsForum, callback) {
            console.log('home point 5');
            Room.find({ $or: [{ user_init : req.user._id}, { user_resp : req.user._id }]}, function(err, rooms) {
                if (err) throw err;
                callback(null, alertsForum, rooms);
            });
        },

        function(alertsForum, rooms, callback) {
            console.log('home point 6');

            

            var arr1 = [];

            function isFlagged(roomID, currentuser, user1, user2, counter){

                var flaggedUser = new Promise( 
                    function(resolve, reject) {
                        console.log('3 rooms.length: '+counter);
                        // check if the current user has blocked the user init or user resp
                        Flag.findOne({user: { $in: [user1, user2] }, userWhoFlagged : currentuser}, function(err, flag) {
                            if(err) throw err;
                            if(flag) {
                                console.log(currentuser + ' has blocked ' + flag.user);
                                resolve(flag.user);
                            } else {
                                // check if the current user has been blocked by the user init or user resp
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
                        console.log('4 rooms.length: '+counter);
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
                        var historymessage;

                        if(val[0].isImage === true) {
                            historymessage = 'image';
                            findUser(roomID, currentuser, user1, user2, counter, val[0].user, historymessage, val[0].timesent, blocked);
                        } else {
                            historymessage = val[0].message;
                            findUser(roomID, currentuser, user1, user2, counter, val[0].user, historymessage, val[0].timesent, blocked);
                        }
                        
                    }
                )
                .catch(
                    function(reason){
                        console.log('second chat history promise rejected for' + reason);
                    }
                );
            }

            function findUser(roomID, currentuser, user1, user2, counter, historyUser, historyMessage, historyTime, blocked) {
                var findLastUser = new Promise (
                    function(resolve, reject) {
                        console.log('5 rooms.length: '+counter);
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
                        console.log('6 rooms.length: '+counter);
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

                        if (String(blocked) != String(currentuser)) {
                            arr1[roomID] = [val._id, val.username, historyMessage, newtime, blocked];
                            arr2.push(arr1[roomID]);
                        } else {
                            blockedarr.push(roomID);
                        }

                        arr2.sort(function(a,b){
                            return new Date(a[3]) - (b[3]);
                        });
                        console.log('arr2 length: '+arr2.length);
                        console.log('blockedarr length: '+blockedarr.length);
                        if (arr2.length === (counter - blockedarr.length)) {
                            console.log('arr2: '+arr2);
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

            if (rooms.length === 0) {
                console.log('1 rooms.length: '+rooms.length);
                callback(null, alertsForum);
            } else {
                for(j = 0; j < rooms.length; j++){
                    var id = rooms[j]._id;
                    var _user1 = rooms[j].user_init;
                    var _user2 = rooms[j].user_resp;
                    var _currentuser = req.user._id;
                    arr1[id] = [];
                    var arr2 = [];
                    var blockedarr = [];
                    console.log('2 rooms.length: '+rooms.length);
                    isFlagged(id, _currentuser, _user1, _user2, rooms.length);
                }
            }
            
        }

    ], function(err, result){
        if (err) throw err;
        console.log('result: '+result);
        res.render('home', {
            user : req.user,
            alertsForum : req.alertsForum,
            history : req.history,
            title: 'ceda'
        });
    });
});






module.exports = router;