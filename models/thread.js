// forum posts schema

var mongoose = require('mongoose');

var threadSchema = mongoose.Schema({
	user: String,
	title: String,
	tag: String,
	created: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Thread', threadSchema);