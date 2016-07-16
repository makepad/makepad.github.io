
var App = require('view').extend(function(){

	this.nested = {
		Background: require('shaders/rectshader').extend(function(){
			this.props = {
			}
			this.pixelstyle = function(){
			}
		})
	}

	this.ondraw = function(){

		for(var i = 0 ; i < 4000;i++){

			this.drawBackground({
				color:[Math.random(),Math.random(),Math.random(),1],
				borderradius:[10,1000,1000,10+Math.random()*10], // LT RT RB LB
				shadowspread:0,
				shadowblur:10,
				shadowx:4,
				shadowy:4,
				bordercolor:'black',
				borderwidth:[10,1,1,1],
				x:1700*Math.random(),
				y:1700*Math.random(),
				w:40+40*Math.random(),
				h:40+40*Math.random()
			})
		}
	}
})
App().runApp()