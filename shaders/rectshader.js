module.exports = require('./tweenshader').extend(function RectShader(){

	var types = require('types')
	var painter = require('painter')

	this.props = {
		x: NaN,
		y: NaN,
		w: NaN,
		h: NaN,
		z: 0,

		visible: 1.0,

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

	this.notween = {
		visible: 1
	}

	this.mesh = {
		pos: painter.Mesh(types.vec2)
	}

	this.mesh.pos.pushQuad(
		0,0,
		0,1,
		1,0,
		1,1
	)
	
	this.globals = {
		matrix:types.mat4,
		camera:types.mat4,
		projection:types.mat4
	}

	this.vertex = function(){
		if(props.visible < 0.5){
			return vec4(0.)
		}
		var pos = vec4(mesh.pos.x * props.w + props.x, mesh.pos.y * props.h + props.y, 0., 1.)
		return pos * globals.matrix * globals.camera * globals.projection
	}

	this.pixel = function(){
		return props.color
	}

	this.canvasmacros = {
		draw:function(){
			this.LOADPROPS()
			this.ALLOCSPACE()
			this.walkTurtle()
			this.STOREPROPS()
		},
		begin:function(){
		},
		end:function(){
		}
	}
})