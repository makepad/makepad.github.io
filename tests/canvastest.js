
var App = require('view').extend(function(){

	this.nested = {
		Background: require('shaders/rectshader').extend(function(){
		})
	}

	this.ondraw = function(){
		this.drawBackground({
			color:'blue',
			borderradius:[20,10,20,10], // LT RT RB LB
			borderinner:0.95,
			shadowradius:0,
			shadowoffset:[20,20],
			bordercolor:'black',
			borderwidth:3,
			x:10,
			y:10,
			w:100,
			h:100
		})
	}
})
App().runApp()