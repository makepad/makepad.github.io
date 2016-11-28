// simple drawing app
module.exports = class Draw extends require('base/view'){
	prototype(){
		this.tools = {
			Bg:require('shaders/bg'),
			Rounded:require('shaders/rounded'),
			Quad:require('shaders/quad'),
			Line:require('shaders/line'),
			Text:require('shaders/text').extend({
				font:require('fonts/ubuntu_medium_256.font')
			}),
			Icon:require('shaders/icon').extend({
			})
		}
	}
}