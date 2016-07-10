
var App = require('view').extend(function(){

	this.nested = {
		Background: require('shaders/rectshader').extend(function(){
		})
	}

	this.ondraw = function(){
		this.drawBackground({
			x:0,
			y:0,
			w:100,
			h:100
		})

	}
})

/*
// run it


App().runApp()*/

