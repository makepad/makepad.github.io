module.exports = require('shader').extend(function QuadShader(proto){

	var types = require('types')
	var painter = require('painter')

	// special
	proto.props = {
		visible: {noTween:true, value:1.0},

		x: NaN,
		y: NaN,
		w: NaN,
		h: NaN,
		z: 0,

		wrap: {styleLevel:2, value:1},
		align: {styleLevel:2, value:[0,0]},
		padding: {styleLevel:2, value:[0,0,0,0]},
		margin: {styleLevel:1, value:[0,0,0,0]},

		color: {pack:'float12', value:'gray'},

		mesh:{kind:'geometry', type:types.vec2},
	}

	proto.mesh = painter.Mesh(types.vec2).pushQuad(0,0,0,1,1,0,1,1)

	proto.vertex = function(){$
		if(this.visible < 0.5){
			return vec4(0.)
		}

		var pos = vec4(
			this.mesh.x * this.w + this.x, 
			this.mesh.y * this.h + this.y, 
			0., 
			1.
		)

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