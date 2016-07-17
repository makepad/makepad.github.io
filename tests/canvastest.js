
var App = require('view').extend(function(){

	this.nested = {
		Background: require('shaders/rectshader').extend(function(){
			this.props = {
				random:0,
			}
			this.pixelstyle = function(){$
				var m = this.mesh
				this.borderwidth.x = 10.+5.*sin(m.x*15.*this.random)*cos(m.x*5.*this.random)
				var meshh = this.mesh.y*this.h
				var propsh = this.borderwidth.x+1.
				if(meshh <propsh ) this.bordercolor = mix('white','gray',meshh/propsh)

			}
		})
	}

	this.ondraw = function(){
		var dt = performance.now()
		for(var i = 0 ; i < 16000;i++){
			this.drawBackground({
				random:Math.random()+0.1,
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
		console.log(performance.now()-dt)
	}
})
App().runApp()