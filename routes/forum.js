var User = require('../models/account.js');
var Thread = require('../models/thread.js');
var Post = require('../models/posts.js');
var express = require('express');
var router = express.Router();
var async = require('async');



router.get('/', function(req, res) {
	async.waterfall([
		function(callback) {
			Thread.find().sort({'created' : -1}).exec(function(err, thread){
				if (err) throw err;
				console.log(thread);
				req.thread = thread;
				callback(null, req.thread);
			});
		}
	], function(err, result) {
		console.log('result: '+result);
		req.session.save(function(err){
			if (err) throw err;
			res.render('forum', {
				thread: req.thread,
				user : req.user,
				title : 'ceda'
			});
		});
	});
});


router.get('/new', function(req, res) {
	async.waterfall([
		function(callback) {
			console.log('create new post');
			var post = '';
			callback(null, post);
		}
	], function(err, result) {
		console.log('result: '+result);
		req.session.save(function(err){
			if (err) throw err;
			res.render('new', {
				post: req.post,
				thread: req.thread,
				user : req.user,
				title : 'ceda'
			});
		});
	});
});




module.exports = router;