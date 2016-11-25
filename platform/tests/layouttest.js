new require('styles/dark')

module.exports = require('base/app').extend({

	tools:{
		Button: require('stamps/button').extend({
		}),
	},

	onDraw(){
		this.drawButton({id:0,text:'HELLO'})
	}
})
