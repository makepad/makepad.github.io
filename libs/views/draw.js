// simple drawing app
module.exports = require('base/view').extend(function Draw(proto){

	proto.tools = {
		Bg:require('tools/bg'),
		Rect:require('tools/rect'),
		Line:require('tools/line'),
		Text:require('tools/text').extend({
			wrapping:'word',
			font:require('fonts/ubuntu_medium_256.font')
		})
	}
})