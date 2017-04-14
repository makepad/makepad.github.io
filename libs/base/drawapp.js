// simple drawing app
module.exports = class DrawApp extends require('base/app'){
	constructor(...args){
		super(...args)
	}

	prototype(){
		this.tools = {
			Bg:require('shaders/bg'),
			Rounded:require('shaders/rounded'),
			Quad:require('shaders/quad'),
			Line:require('shaders/line'),
			Text:require('shaders/text').extend({
				font:require('fonts/ubuntu_regular_256.font')
			}),
			Icon:require('shaders/icon').extend({
				font:require('fonts/fontawesome.font')
			}),
			Button:require('views/button')
		}
	}
}