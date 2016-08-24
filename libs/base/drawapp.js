// simple drawing app
module.exports = require('base/app').extend(function DrawApp(proto){

	proto.tools = {
		Background:require('tools/background'),
		Rect:require('tools/rect'),
		Quad:require('tools/quad'),
		Line:require('tools/line'),
		Text:require('tools/font').extend({
			font:require('fonts/ubuntu_medium_256.font')
		})
	}
})