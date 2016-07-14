
var App = require('view').extend(function(){

	this.nested = {
		Background: require('shaders/rectshader').extend(function(){
			this.pixel = function(){
				return mix('red','green',mesh.y)
			}
		})
	}

	this.ondraw = function(){
		this.drawBackground({
			color:'orange',
			x:-.5,
			y:-.5,
			w:1,
			h:1
		})
	}
})
App().runApp()
