var User = require('../models/account.js');
var Thread = require('../models/thread.js');
var Post = require('../models/posts.js');
var express = require('express');
var router = express.Router();
var async = require('async');


router.get('/', function(req, res) {
	res.render('settings', {
		user : req.user,
		title : 'ceda'
	});
});





module.exports = router;