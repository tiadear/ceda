var User = require('../models/account.js');
var Thread = require('../models/thread.js');
var Post = require('../models/posts.js');
var express = require('express');
var router = express.Router();
var async = require('async');



function formatDate(d) {
    var day = d.getDate();
    var month = d.getMonth();
	var year = d.getFullYear();
	var hour = d.getHours();
	var minutes = d.getMinutes();
	return day + '/' + month + '/' + year + ' ' + hour + ':' + minutes;
}





router.get('/', function(req, res) {
	async.waterfall([
		function(callback) {
			Thread.find().sort({'created' : -1}).exec(function(err, threads){
				if(err) throw err;
				if (threads) {
					callback(null, threads);
				}
			});
		}, function(threads, callback) {
			var arr = [];

			for(i = 0; i < threads.length; i++) {

				var id = threads[i]._id;
				arr[id] = [];
                var arr2 = [];

                var date = new Date(threads[i].created);
                var dateformat = formatDate(date);

                console.log('thread[i] title: '+threads[i].title);
                arr[id] = [threads[i].title, threads[i].user, dateformat];

				User.findById(threads[i].user, function(err, user) {
					if(err) throw err;
					console.log('username: '+user.username);
					console.log('threads length: '+threads.length);

					arr[id].push(user.username);
					console.log('arr[id]: '+arr[id]);

					arr2.push(arr[id]);
					console.log('arr2 length: '+arr2.length);

					if (arr2.length === threads.length) {
						req.threads = arr2;
						callback(null, req.threads);
					}
				});
			}
		}
	], function(err, result){
		if (err) throw err;
		console.log('result: '+result);

		req.session.save(function(err) {
			if(err) throw err;
			res.render('forum', {
				threads: req.threads,
				user : req.user,
				title : 'ceda'
			});
		});
	});
});
	


router.get('/new', function(req, res) {
	res.render('new', {
		user : req.user,
		title : 'ceda'
	});
});


router.post('/', function(req, res) {
	async.waterfall([
		function(callback){
			var newThread = new Thread();
			newThread.user = req.user._id;
			newThread.title = req.body.title;

			newThread.save(function(err){
				if(err) throw err;
				req.thread = newThread;
				callback(null, req.thread);
			});
		}, function(thread, callback) {
			console.log('thread id: '+thread._id);

			var newPost = new Post();
			newPost.user = req.user._id,
			newPost.threadId = thread._id;
			newPost.content = req.body.content;

			newPost.save(function(err){
				if(err) throw err;
				req.post = newPost;
				callback(null, thread, req.post);
			});
		}
	], 
	function(err, result){
		console.log('result: '+result);
		req.session.save(function (err) {
	        if(err) throw err;
	        res.render('forum', {
	        	thread : req.thread,
	        	post : req.post,
	        	user : req.user,
	        	title : 'ceda'
	        });
	    });

	});
});






module.exports = router;