new require('styles/dark')

return require('base/app').extend({

	tools:{
		Text: require('shaders/text').extend({
			font:require('fonts/ubuntu_monospace_256.font')
		})
	},

	onDraw:function(){
		this.drawText({text:"HELLO WORLD", y:0, fontSize:220})
	}
})