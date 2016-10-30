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




//forum page
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
			var arr2 = [];

			function findUser(userId, threadId, threadTitle, date) {
				var findUsername = new Promise(
					function(resolve, reject) {
						User.findById(userId, function(err, user) {
							if(err) throw err;
							var username = user.username;
							resolve(username);
						});
					}
				);
				findUsername.then(
					function(val) {
						arr[id] = [threadId, threadTitle, userId, val, date];
		                arr2.push(arr[id]);
		                console.log('arr2 length: '+arr2.length);

						if (arr2.length === threads.length) {
							req.threads = arr2;
							callback(null, req.threads);
						}
					}
				)
				.catch(
					function(reason){
                        console.log('username not found due to ' + reason);
                    }
				);
				
			}

			for(i = 0; i < threads.length; i++) {
				var id = threads[i]._id;
				arr[id] = [];
                
                var date = new Date(threads[i].created);
                var dateformat = formatDate(date);

                findUser(threads[i].user, id, threads[i].title, dateformat);
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


// edit a post
router.get('/edit*', function(req, res) {
	async.waterfall([
		function(callback){
			// get thread id
            var key = req.query.id;
            console.log('post id is: ' + key);

            Post.findById(String(key), function(err, post) {
                if (err) throw err;
                console.log('thread: '+post);
                callback(null, post);
            });
		},
		function(post, callback) {
            Thread.findById(post.threadId, function(err, thread) {
                if (err) throw err;
                console.log('thread: '+thread);
                req.thread = thread;
                req.post = post;
                callback(null, req.post, req.thread);
            });
		}
	], function(err, result) {
		if(err)throw err;
		console.log('result: '+ result);
		res.render('edit', {
			thread : req.thread,
			post : req.post,
			user : req.user,
			title : 'ceda'
		});
	});
});




// create a new thread and top post
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
			newPost.top = true;
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
	        res.redirect('/');
	    });

	});
});

// view all the posts ina thread
router.get('/thread*', function(req, res) {
	async.waterfall([
		function(callback){

			// get thread id
            var key = req.query.id;
            console.log('thread id is: ' + key);

            //find the thread in the db
            Thread.findById(String(key), function(err, thread) {
                if (err) throw err;
                console.log('thread: '+thread);
                callback(null, key, thread.title);
            });
		}, function(key, title, callback) {

			//find all the posts in that thread
			Post.find({ threadId : key }).sort({'created' : 1}).exec(function(err, posts){
				if(err) throw err;
				req.posts = posts;
				req.thread = [key, title];
				callback(null, req.thread, req.posts);
			});
		}, function(thread, posts, callback) {

			var arr = [];
			var arr2 = [];

			function findUser(userId, postID, postContent, date) {
				var findUsername = new Promise(
					function(resolve, reject) {
						User.findById(userId, function(err, user) {
							if(err) throw err;
							var username = user.username;
							resolve(username);
						});
					}
				);
				findUsername.then(
					function(val) {
						arr[id] = [postID, userId, val, postContent, dateformat];
		                arr2.push(arr[id]);
		                console.log('arr2 length: '+arr2.length);

						if (arr2.length === posts.length) {
							req.posts = arr2;
							req.thread = thread;
							callback(null, req.thread, req.posts);
						}
					}
				)
				.catch(
					function(reason){
                        console.log('username not found due to ' + reason);
                    }
				);
				
			}

			for(i=0; i < posts.length; i++){
				var id = posts[i]._id;
				arr[id] = [];
                
                var date = new Date(posts[i].created);
                var dateformat = formatDate(date);

                findUser(posts[i].user, id, posts[i].content, dateformat);
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


// reply to a post in a thread
router.post('/thread*', function(req, res) {
	async.waterfall([
		function(callback) {
			var key = req.query.id;
            console.log('thread id is: ' + key);

            Thread.findById(String(key), function(err, thread) {
                if (err) throw err;
                console.log('thread: '+thread);
                callback(null, key, thread.title);
            });
		}, function(key, title, callback) {

			// if the post ID exists
			// the post is being edited
			if(req.body.postID) {
				console.log('edit post');

				Post.update(
					{ '_id' : req.body.postID },
					{ $set: { "title" : req.body.title, "content" : req.body.content } },
					function(err, post) {
						if(err) throw err;
						console.log('updated post: '+post);
						callback(null, key);
					}
				);
			}
			// the post ID doesn't exist
			// this is a reply to a post
			else {
				console.log('new reply');
				var newPost = new Post();
				newPost.user = req.user._id;
				newPost.threadId = key;
				newPost.top = false;
				newPost.content = req.body.content;

				newPost.save(function(err){
					if(err) throw err;
					req.post = newPost;
					callback(null, key);
				});
			}
		}
	], function(err, result) {
		if (err) throw err;
		console.log('result: '+result);
		req.session.save(function(err){
			if(err) throw err;
			res.redirect('/forum/thread?id='+result);
		});
	});
});




module.exports = router;