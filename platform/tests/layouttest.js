new require('styles/dark')

module.exports = require('base/app').extend({

	tools:{
		Button: require('stamps/button').extend({
		}),
	},

	onDraw(){
		for(var i=0;i<800;i++)
		this.drawButton({id:i,icon:'search'})
	}
})
