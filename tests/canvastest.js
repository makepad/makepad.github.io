
var App = require('view').extend(function(){

	this.nested = {
		Background: require('shaders/rectshader').extend(function(){
		})
	}

	this.ondraw = function(){
		this.drawBackground({
			color:'white',
			borderradius:[20,10,0,10], // LT RT RB LB
			shadowspread:0,
			shadowblur:1,
			shadowx:10,
			shadowy:10,
			bordercolor:'red',
			borderwidth:[4,0,0,0],
			x:10,
			y:10,
			w:100,
			h:100
		})
	}
})
App().runApp()