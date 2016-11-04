'use strict';

const TwitterStrategy = require('passport-twitter').Strategy;
const mongoose = require('mongoose');
const config = require('../oauth');
const User = require('../models/account.js');


module.exports = new TwitterStrategy({
    consumerKey: config.twitter.consumerKey,
    consumerSecret: config.twitter.consumerSecret,
    callbackURL: config.twitter.callbackURL
    },
    function(token, tokenSecret, profile, done) {
        console.log('twitter auth point 1');
        User.findOne({ oauthID: profile.id }, function(err, user) {
            if(err) {
                console.log(err);
                return done(err);
            }
            if (user) {
                console.log('user found');
                return done(null, user);
            }
            else {
                console.log('create new user');

                var newUser = new User ();
                newUser.email = String;
                newUser.password = String;
                newUser.firstName = profile.displayName;
                newUser.notifyChat = 1;
                newUser.notifyChat = 1;
                newUser.provider = 'twitter';
                newUser.twitter =  token;
                newUser.oauthID = profile.id;
                newUser.userType = false;

                newUser.save(function(err) {
                    if(err) {
                        console.log(err);
                    } else {
                        console.log("saving user ...");
                        done(null, newUser);
                    }
                });
            }
        });
    }
);
