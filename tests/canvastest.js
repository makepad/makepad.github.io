
var App = require('view').extend(function(){

	this.nested = {
		Background: require('shaders/rectshader').extend(function(){
			this.pixel = function(){
				return props.color
			}
		})
	}

	this.ondraw = function(){
		for(var i = 0 ;i < 10000; i++){
			this.drawBackground({
				color:[0,.5+.5*Math.sin(i*0.1),.5+.5*Math.sin(i*0.1),1],
				x:-.5 + Math.sin(i*.01)*.5+.5,
				y:-.5 + Math.cos(i*.03)*.5+.5,
				w:.05,
				h:.05
			})
		}
	}
})
App().runApp()
