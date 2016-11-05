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
                        //console.log('val: '+val[counter]);
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
                        
                            //console.log('val: '+val[counter].content);
                            arr[threadId] = [threadId, threadTitle, val[counter].content, val[counter].user, postTime];
                            arr2.push(arr[threadId]);
                        }
                        //console.log('counter: '+counter);

                        if(counter === (total -1)) {
                            //console.log('arr2: '+ uniq(arr2));
                            req.alertsForum = uniq(arr2);
                            //console.log('req.alertsForum: '+ req.alertsForum);
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

            function lastuser(currentuser, user1, user2, historyuser, historymsg, historytime){
                console.log('reached last user function');

                var lastusertomsg = new Promise(
                    function(resolve, reject) {
                        //console.log('point 2');

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
                                //console.log('point 3');
                                // and your convo partner MUST be the user_init
                                User.findById(user1, function(err, partner) {
                                    if (err) throw err;
                                    console.log('convo partner is: ' + partner.username);
                                    resolve(partner.username);
                                });
                            }
                        }
                        else {
                            //console.log('point 4');
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

                            arr2.sort(function(a,b){
                                return new Date(b.historytime) - (a.historytime);
                            });

                            //send it to the callback
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
                var _currentuser = req.user.username;
                arr1[id] = [];
                var arr2 = [];

                chatHistory.find({room : id}, function(err, history) {

                    //loop through all history items for that room
                    if(history.length !== 0) {
                        for(i = 0; i < history.length; i++) {

                            //stop on the last item
                            if(i === ((history.length)-1)) {

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

                                var date = new Date(history[i].timesent);
                                var dateformat = formatDate(date);

                                lastuser(_currentuser, _user1, _user2, history[i].user, history[i].message, dateformat);
                            }
                        }
                    }

                });
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