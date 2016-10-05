'use strict';

const FacebookStrategy = require('passport-facebook').Strategy;
const mongoose = require('mongoose');
const config = require('../oauth.js');
const User = require('../models/account.js');


module.exports = new FacebookStrategy({
  clientID: config.facebook.clientID,
  clientSecret: config.facebook.clientSecret,
  callbackURL: config.facebook.callbackURL
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOne({ oauthID: profile.id }, function(err, user) {
      if(err) {
        console.log(err);  // handle errors!
      }
      if (!err && user !== null) {
        done(null, user);
      } else {
        user = new User({
          username: profile.username,
          password: String,
          email: profile.emails[0].value,
          firstname: profile.displayName,
          lastName: String,
          provider: 'facebook',
          facebook: profile._json,
          oathID: profile.id
        });
        user.save(function(err) {
          if(err) {
            console.log(err);  // handle errors!
          } else {
            console.log("saving user ...");
            done(null, user);
          }
        });
      }
    });
  }
);