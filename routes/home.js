// ROUTES!!!

const User = require('../models/account.js');
const Room = require('../models/room.js');
var Thread = require('../models/thread.js');
var Post = require('../models/posts.js');
var chatHistory = require('../models/chatHistory.js');

const express = require('express');
const router = express.Router();
var async = require('async');

const passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
const local = require('../passport/local');
local.strategy(passport);




// dashbaord
router.get('/', function(req, res) {
    async.waterfall([
        function(callback) {

            // searching for all posts the user has written
            Post.find({user : req.user._id}, function(err, posts) {
                if (err) throw err;
                if (posts) {
                    callback(null, posts);
                }
            });

        }, function(posts, callback) {

            // for each post, find the thread
            // list the last post written in that thread

            arr = [];
            arr2 = [];
            arr3 = [];

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
                        if(val[counter] != undefined) {

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

                            var date = new Date(val[counter].created);
                            var postTime = formatDate(date);

                            User.findById(val[counter].user, function(err, user) {
                                //console.log('val: '+val[counter].content);
                                arr[threadId] = [threadId, threadTitle, val[counter].content, user.username, postTime];
                                arr2.push(arr[threadId]);
                            });
                        }

                        if(counter === (total -1)) {
                            //console.log('arr2: '+ uniq(arr2));
                            req.alertsForum = uniq(arr2);
                            console.log('req.alertsForum: '+ req.alertsForum);
                            callback(null, req.alertsForum);
                        }
                    }
                )
                .catch(
                    function(reason){
                        console.log('last post not found due to ' + reason);
                    }
                );
            }

            // 1 - loop through all the posts written
            posts.forEach(function(post, i) {
                findThreads(post.threadId, i, posts.length);
            });



        }, 

        function(alertsForum, callback) {
           
            //find all the rooms the current user has talked in
            var roomsArr = []
            Room.find({ $or: [{ user_init : req.user._id}, { user_resp : req.user._id }]}, function(err, rooms) {
                if (err) throw err;
                if(rooms) {
                    callback(null, alertsForum, rooms);
                }   
            });
        },

        function(alertsForum, rooms, callback) {

            var arr1 = [];

            function getChatHistory(roomID, currentuser, user1, user2, counter){
                var findChatHistory = new Promise(
                    function(resolve, reject) {
                        chatHistory.find({ room : roomID}).sort({ 'timesent' : -1}).exec(function(err, history) {
                            if (err) {
                                console.log(err);
                                throw err;
                            }
                            if(history) {
                                //console.log(history);
                                resolve(history);
                            }
                        });

                    }
                );

                findChatHistory.then(
                    function(val) {
                        //console.log('val counter: '+val[0]);
                        findUser(roomID, currentuser, user1, user2, val[0].user, val[0].message, val[0].timesent);
                    }
                )
                .catch(
                    function(reason){
                        console.log('chat history promise rejected for' + reason);
                    }
                );
            }

            function findUser(roomID, currentuser, user1, user2, historyUser, historyMessage, historyTime) {
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

                        arr1[roomID] = [val._id, val.username, historyMessage, newtime];
                        arr2.push(arr1[roomID]);
                        //console.log('arr2: '+arr2);

                        if (arr2.length === rooms.length) {
                            console.log('arr2: '+arr2);
                            req.history = arr2;
                            req.alertsForum = alertsForum;
                            callback(null, req.alertsForum, req.history);
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
                var id = rooms[j]._id;
                var _user1 = rooms[j].user_init;
                var _user2 = rooms[j].user_resp;
                var _currentuser = req.user._id;
                arr1[id] = [];
                var arr2 = [];

                getChatHistory(id, _currentuser, _user1, _user2, j);
            }

        }

    ], function(err, result){
        if (err) throw err;
        res.render('home', {
            user : req.user,
            alertsForum : req.alertsForum,
            history : req.history,
            title: 'ceda'
        });
    });
});






module.exports = router;