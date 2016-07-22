module.exports = require('shader').extend(function RectShader(){

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

		color: 'red',
	}

	this.mesh = painter.Mesh(types.vec3).pushQuad(
		0,0, 0.,
		0,1, 0.,
		1,0, 0.,
		1,1, 0.,
	)

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
		out.color = props.color
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