// forum posts schema

var mongoose = require('mongoose');

var postsSchema = mongoose.Schema({
	threadId: String,
	user: String,
	content: String,
	created: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Post', postsSchema);