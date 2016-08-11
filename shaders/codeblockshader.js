module.exports = require('shader').extend(function QuadShader(proto){

	var types = require('types')
	var painter = require('painter')

	// special
	proto.props = {
		visible: {noTween:true, value:1.0},

		x: {noInPlace:1, value:NaN},
		y: {noInPlace:1, value:NaN},
		w: {noInPlace:1, value:NaN},
		h: {noInPlace:1, value:NaN},
		z: 0,

		wrap: {styleLevel:2, value:1},
		align: {styleLevel:2, value:[0,0]},
		padding: {styleLevel:2, value:[0,0,0,0]},
		margin: {styleLevel:1, value:[0,0,0,0]},

		color: {pack:'float12', value:'gray'},

		mesh:{kind:'geometry', type:types.vec2},
	}

	proto.mesh = painter.Mesh(types.vec3).pushQuad(
		0, 0, 0,
		0, 1, 0,
		1, 0, 0,
		1, 1, 0
	).pushQuad(
		0,0, 1,
		1,0, 1,
		0, 1, 1,
		1, 1, 1
	)
	
	proto.vertexStyle = function(){
	}

	proto.vertexPost = function(){
	}

	proto.vertex = function(){$
		this.vertexStyle()

		if(this.visible < 0.5){
			return vec4(0.)
		}

		// vertexshader clipping!
		var shift = vec2(this.x - this.viewScroll.x*this.lockScroll, this.y - this.viewScroll.y*this.lockScroll)
		var size = vec2(this.w, this.h)

		this.mesh.xy = (clamp(
			this.mesh.xy * size + shift, 
			max(this.turtleClip.xy, this.viewClip.xy),
			min(this.turtleClip.zw, this.viewClip.zw)
		) - shift) / size

		var pos = vec4(
			this.mesh.xy * size + shift, 
			0., 
			1.
		)

		this.vertexPost()

		return pos * this.viewPosition * this.camPosition * this.camProjection
	}

	proto.pixel = function(){$
		return this.color
	}

	proto.toolMacros = {
		draw:function(overload){
			this.$STYLEPROPS(overload, 1)
			this.$ALLOCDRAW()
			this.turtle.walk()
			this.$WRITEPROPS()
		},
		begin:function(overload){
			this.$STYLEPROPS(overload, 2)
			this.$ALLOCDRAW()
			this.beginTurtle()
		},
		end:function(){
			var ot = this.endTurtle()
			this.turtle.walk(ot)
			this.$WRITEPROPS()
		}
	}
})