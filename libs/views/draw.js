// simple drawing app
module.exports = require('base/view').extend(function Draw(proto){

	proto.tools = {
		Background:require('tools/background'),
		Rect:require('tools/rect'),
		Line:require('tools/line'),
		Text:require('tools/font').extend({
			font:require('fonts/ubuntu_medium_256.font')
		})
	}
})