module.exports = require('./tweenshader').extend(function RectShader(){

	var types = require('types')
	var painter = require('painter')

	// special
	this.props = {
		x: NaN,
		y: NaN,
		w: NaN,
		h: NaN,
		z: 0,

		visible: {notween:true, nostyle:true, value:1.0},

		align: 'lefttop',
		margin: [0,0,0,0],
		padding: [0,0,0,0],

		color: 'white',
		borderwidth: [0,0,0,0],
		bordercolor: [0,0,0,0],
		cornerradius: [4,4,4,4],
		shadowradius: 1.0,
		shadowoffset: [1.0, 1.0],
		shadowalpha: 0.5
	}

	this.mesh = painter.Mesh(types.vec2).pushQuad(
		0,0,
		0,1,
		1,0,
		1,1
	)

	this.view = {
		position:types.mat4
	}

	this.camera = {
		position:types.mat4,
		projection:types.mat4
	}

	this.callme = function(x){$
		x = 20.
		return 10
	}

	this.vertex = function(){$
		if(props.visible < 0.5){
			return vec4(0.)
		}

		var pos = vec4(
			mesh.x * props.w + props.x, 
			mesh.y * props.h + props.y, 
			0., 
			1.
		)

		return pos * view.position * camera.position * camera.projection
	}

	this.pixel = function(){$
		//props.x
		//props.borderwidth
		out.color = props.color
		//out.color = vec4(1)
	}

	this.canvasmacros = {
		draw:function(overload){
			this.$OVERLOADPROPS(len)
			this.$ALLOCDRAW()
			this.walkTurtle()
			this.$WRITEPROPS()
		},
		begin:function(){
		},
		end:function(){
		}
	}
})