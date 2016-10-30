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

                arr[id] = [id, threads[i].title, threads[i].user, dateformat];

				User.findById(threads[i].user, function(err, user) {
					if(err) throw err;

					arr[id].push(user.username);

					arr2.push(arr[id]);

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



router.get('/thread*', function(req, res) {
	async.waterfall([
		function(callback){

            var key = req.query.id;
            console.log('thread id is: ' + key);

            Thread.findById(String(key), function(err, thread) {
                if (err) throw err;
                console.log('thread: '+thread);
                callback(null, key, thread.title);
            });
		}, function(key, title, callback) {

			Post.find({ threadId : key }).sort({'created' : -1}).exec(function(err, posts){
				if(err) throw err;
				console.log('posts: '+ posts);
				req.posts = posts;
				req.thread = [key, title];
				callback(null, req.thread, req.posts);
			});
		}, function(thread, posts, callback) {

			var arr = [];

			for(i=0; i < posts.length; i++){

				var id = posts[i]._id;
				arr[id] = [];
                var arr2 = [];

                var date = new Date(posts[i].created);
                var dateformat = formatDate(date);

                arr[id] = [id, posts[i].user, posts[i].content, dateformat];

				User.findById(posts[i].user, function(err, user) {
					if(err) throw err;
					arr[id].push(user.username);
					arr2.push(arr[id]);
					if (arr2.length === posts.length) {
						req.posts = arr2;
						req.thread = thread;
						callback(null, req.thread, req.posts);
					}
				});
			}
		}
	], function(err, result) {
		if(err) throw err;
		console.log('result: '+result);
		req.session.save(function(err){
			if(err) throw err;
			res.render('post', {
				thread: req.thread,
				posts : req.posts,
				user : req.user,
				title : 'ceda'
			});
		});
	});
});





module.exports = router;