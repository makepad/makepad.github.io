// simple drawing app
module.exports = class Draw extends require('base/view'){
	prototype(){
		this.tools = {
			Bg:require('tools/bg'),
			Rect:require('tools/rect'),
			Quad:require('tools/quad'),
			Line:require('tools/line'),
			Text:require('tools/text').extend({
				font:require('fonts/ubuntu_medium_256.font')
			}),
			Icon:require('tools/icon').extend({
			})
		}
	}
}