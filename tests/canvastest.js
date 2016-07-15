
var App = require('view').extend(function(){

	this.nested = {
		Background: require('shaders/rectshader').extend(function(){
			this.props = {
				type:1.
			}
			this.pixelstyle = function(){
				if(props.type<.5) return 'white'
				props.color = mix('orange','purple',mesh.x*.5+.5)
			}
		})
	}

	this.ondraw = function(){
		this.drawBackground({
			type:0.,
			color:'white',
			borderradius:[20,10,1,10], // LT RT RB LB
			shadowspread:0,
			shadowblur:1,
			shadowx:10,
			shadowy:10,
			bordercolor:'black',
			borderwidth:[4,0,4,4],
			x:10,
			y:10,
			w:100,
			h:100
		})

		this.drawBackground({
			color:'white',
			borderradius:[1000,1000,1000,10000], // LT RT RB LB
			shadowspread:0,
			shadowblur:1,
			shadowx:10,
			shadowy:10,
			bordercolor:'black',
			borderwidth:[4,4,4,4],
			x:130,
			y:10,
			w:100,
			h:100
		})
	}
})
App().runApp()