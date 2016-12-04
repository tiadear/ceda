var User = require('../models/account.js');
var Thread = require('../models/thread.js');
var Post = require('../models/posts.js');
var express = require('express');
var router = express.Router();
var async = require('async');




function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { 
        console.log('is authenticated');
        return next(); 
    }
    res.redirect('/');
}




//forum page
router.get('/', ensureAuthenticated, function(req, res) {
	async.waterfall([
		function(callback) {
			Thread.find().sort({'created' : -1}).exec(function(err, threads){
				if(err) throw err;
				if (threads && (threads != '')) {
					callback(null, threads);
				}
				else {
					var error = 'no threads';
					console.log(error);
					return callback(error);
				}
			});
		},
		function(threads, callback) {
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
						numberOfPosts(threadId, threadTitle, userId, val, date)
					}
				)
				.catch(
					function(reason){
                        console.log('username not found due to ' + reason);
                    }
				);
				
			}

			function numberOfPosts(threadId, threadTitle, userId, username, date) {
				var getNumberOfPosts = new Promise (
					function(resolve, reject) {
						Post.find({ 'threadId' : threadId }).exec(function(err, posts) {
							if(err) throw err;
							var postlength = posts.length;
							resolve(postlength);
						});
					}
				);
				getNumberOfPosts.then(
					function(val) {
						arr[id] = [threadId, threadTitle, userId, username, date, val];
		                arr2.push(arr[id]);
		                //console.log('arr2 length: '+arr2.length);

						if (arr2.length === threads.length) {

							arr2.sort(function(a,b) {
								return new Date(a.date) - (b.date);
							});

							req.threads = arr2;
							callback(null, req.threads);
						}
					}
				)
				.catch(
					function(reason) {
						console.log('number of posts not found due to ' + reason);
					}
				);
			}

			for(i = 0; i < threads.length; i++) {
				var id = threads[i]._id;
				arr[id] = [];
                findUser(threads[i].user, id, threads[i].title, threads[i].created);
			}
		}
	], function(err, result){
		if (err) {
			if(err === 'no threads') {
				res.render('forum', {
					user : req.user,
					title : 'ceda'
				});
			} else {
				console.log('error occured');
				throw err;
			}
		}
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
	


router.get('/new', ensureAuthenticated, function(req, res) {
	res.render('new', {
		user : req.user,
		message : req.flash('forumMessage'),
		title : 'ceda',
		pageTitle: 'forum'
	});
});


// edit a post
router.get('/edit*', ensureAuthenticated, function(req, res) {
	async.waterfall([
		function(callback){
			// get post id
            var key = req.query.id;
           // console.log('post id is: ' + key);

            Post.findById(String(key), function(err, post) {
                if (err) throw err;
                //console.log('thread: '+post);
                callback(null, post);
            });
		},
		function(post, callback) {
            Thread.findById(post.threadId, function(err, thread) {
                if (err) throw err;
                //console.log('thread: '+thread);
                req.thread = thread;
                req.post = post;
                callback(null, req.post, req.thread);
            });
		}
	], function(err, result) {
		if(err)throw err;
		//console.log('result: '+ result);
		res.render('edit', {
			thread : req.thread,
			post : req.post,
			message : req.flash('forumMessage'),
			user : req.user,
			title : 'ceda',
			pageTitle: 'forum'
		});
	});
});




// create a new thread and top post
router.post('/', function(req, res) {
	async.waterfall([
		function(callback){
			if(!req.body.title || !req.body.content) {
				req.flash('forumMessage', "Missing something?");
				res.redirect('/forum/new');
			} else {
				var newThread = new Thread();
				newThread.user = req.user._id;
				newThread.title = req.body.title;

				newThread.save(function(err){
					if(err) throw err;
					req.thread = newThread;
					callback(null, req.thread);
				});
			}
		}, function(thread, callback) {
			//console.log('thread id: '+thread._id);

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
		//console.log('result: '+result);
		req.session.save(function (err) {
	        if(err) throw err;
	        res.redirect('/forum');
	    });

	});
});

// view all the posts in a thread
router.get('/thread*', ensureAuthenticated, function(req, res) {
	async.waterfall([
		function(callback){

			// get thread id
            var key = req.query.id;
            //console.log('thread id is: ' + key);

            //find the thread in the db
            Thread.findById(String(key), function(err, thread) {
                if (err) throw err;
                //console.log('thread: '+thread);
                callback(null, key, thread.title);
            });
		}, function(key, title, callback) {

			//find all the posts in that thread
			Post.find({ threadId : key }).sort({'created': 1}).exec(function(err, posts){
				if(err) throw err;
				req.posts = posts;
				//console.log('posts: '+posts);
				req.thread = [key, title];
				callback(null, req.thread, req.posts);
			});
		}, function(thread, posts, callback) {
			var arr = [];
			var arr2 = [];

			function findUser(userId, postId, postContent, postdate) {
				var findUsername = new Promise(
					function(resolve, reject) {
						//console.log('function 2: '+userId+' : '+postContent);
						User.findById(userId, function(err, user) {

							// this is where it is getting out of order!!!
							//console.log('User find: '+user.username+' : '+postContent);
							if(err) throw err;
							var username = user.username;
							resolve(username);
						});
					}
				);
				findUsername.then(
					function(val) {
						arr[postId] = [postId, userId, val, postContent, postdate];
						arr2.push(arr[postId]);

						arr2.sort(function(a,b){
							return new Date(a[4]) - (b[4]);
						});

						if (arr2.length === posts.length) {
							req.posts = arr2;
							//console.log('arr2: '+arr2);
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

			posts.forEach(function(post, i) {
				var id = post._id;
				arr[id] = [];

                findUser(post.user, id, post.content, post.created);
			});
		}
	], function(err, result) {
		if(err) throw err;
		//console.log('result: '+result);
		console.log('user: '+req.user._id);
		req.session.save(function(err){
			if(err) throw err;
			res.render('post', {
				thread: req.thread,
				posts : req.posts,
				message : req.flash('forumMessage'),
				user : req.user,
				title : 'ceda',
				pageTitle: 'forum'
			});
		});
	});
});


// reply or edit to a post in a thread
router.post('/thread*', function(req, res) {
	async.waterfall([
		function(callback) {

			var key = req.query.id; // thread id

            Thread.findById(String(key), function(err, thread) {
                if (err) throw err;
                callback(null, key, thread.title);
            });
		}, function(key, title, callback) {

			// if the post ID exists
			// the post is being edited
			if(req.body.postID) {

				Post.findById(req.body.postID, function(err, post) {
					if(err) throw err;

					//if it is the top post
					if(post.top == true) {
						//check for content and title
						if(!req.body.content || !req.body.title) {
							req.flash('forumMessage', "Please fill in both fields");
							res.redirect('/forum/edit?id='+req.body.postID);
						} else {
							//then update
							Post.update(
								{ '_id' : req.body.postID },
								{ $set: { "content" : req.body.content, "title" : req.body.title} },
								function(err, post) {
									if(err) throw err;
									console.log('updated post: '+post);
									callback(null, key);
								}
							);
						}
					} 
					// if it is NOT the top post
					else {
						// just check for content
						if(!req.body.content) {
							req.flash('forumMessage', "You didn't write anything!");
							res.redirect('/forum/edit?id='+req.body.postID);
						} else {
							// then update
							Post.update(
								{ '_id' : req.body.postID },
								{ $set: { "content" : req.body.content} },
								function(err, post) {
									if(err) throw err;
									console.log('updated post: '+post);
									callback(null, key);
								}
							);
						}
					}
				});

				
			}

			// the post ID doesn't exists
			// this is a reply to a post
			else {

				if(!req.body.content) {
					req.flash('forumMessage', "You didn't write anything!");
					res.redirect('/forum/thread?id='+key);
				} else {

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
		}
	], function(err, result) {
		if (err) throw err;
		//console.log('result: '+result);
		req.session.save(function(err){
			if(err) throw err;
			res.redirect('/forum/thread?id='+result);
		});
	});
});


router.get('/delete*', ensureAuthenticated, function(req, res) {
	
	// get post id
    var key = req.query.id;
    //console.log('post id is: ' + key);

	Post.findById(key, function(err, post) {
		if (err) throw err;

		var thread = post.threadId;
		//console.log('top post? '+post.top);
		//console.log('thread id: '+thread);
		
		if(post.top === true) {
			Thread.remove({ _id : thread }, function(err) {
				if (err) throw err;
				console.log('post removed');
				req.session.save(function(err) {
					if(err) throw err;
					res.redirect('/forum');
				});
			});
		} else {
			Post.remove({ _id : key }, function(err) {
				if (err) throw err;
				console.log('post removed');
				req.session.save(function(err) {
					if(err) throw err;
					res.redirect('/forum/thread?id='+thread);
				});
			});
		}
    });
});




module.exports = router;