// simple drawing app
module.exports = class Draw extends require('base/view'){
	prototype(){
		this.tools = {
			Bg:require('tools/bg'),
			Rect:require('shaders/rect'),
			Quad:require('shaders/quad'),
			Line:require('tools/line'),
			Text:require('shaders/text').extend({
				font:require('fonts/ubuntu_medium_256.font')
			}),
			Icon:require('shaders/icon').extend({
			})
		}
	}
}