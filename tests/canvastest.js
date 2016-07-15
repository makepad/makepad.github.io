
var App = require('view').extend(function(){

	this.nested = {
		Background: require('shaders/rectshader').extend(function(){
		})
	}

	this.ondraw = function(){
		this.drawBackground({
			color:'blue',
			borderradius:[20,10,10,10], // LT RT RB LB
			bordercolor:'black',
			borderwidth:4,
			x:10,
			y:10,
			w:100,
			h:100
		})
	}
})
App().runApp()