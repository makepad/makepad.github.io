// simple view with a set of default drawing shaders

module.exports = require('view').extend(function Canvas(proto){

	proto.tools = {
		Rect:require('shaders/rectshader'),
		Line:require('shaders/lineshader'),
		Text:require('shaders/sdffontshader').extend({
			font:require('fonts/ubuntu_medium_256.sdffont')
		})
	}
})