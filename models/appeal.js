var mongoose = require('mongoose');

var appealSchema = mongoose.Schema({
	user: String,
	appeal: String,
	timeFlagged: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Appeal', appealSchema);
