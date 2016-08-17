// simple drawing app
module.exports = require('app').extend(function DrawApp(proto){

	proto.tools = {
		Background:require('shaders/backgroundshader'),
		Rect:require('shaders/rectshader'),
		Line:require('shaders/lineshader'),
		Text:require('shaders/sdffontshader').extend({
			font:require('fonts/ubuntu_medium_256.sdffont')
		})
	}
})