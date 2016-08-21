// simple drawing app
module.exports = require('view').extend(function DrawView(proto){

	proto.tools = {
		Background:require('shaders/backgroundshader'),
		Rect:require('shaders/rectshader'),
		Line:require('shaders/lineshader'),
		Text:require('shaders/fontshader').extend({
			font:require('fonts/ubuntu_medium_256.font')
		})
	}
})