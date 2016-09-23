var types = require('base/types')
var painter = require('services/painter')

module.exports = class ShadowQuad extends require('base/shader'){

	// special
	prototype(){
		this.props = {
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
			shadowColor: {pack:'float12', value:[0,0,0,0.5]},
			shadowBlur: 0.0,
			shadowSpread: 0.0,
			shadowOffset: {value:[0.0,0.0]},

			mesh:{kind:'geometry', type:types.vec3},
		}

		this.mesh = new painter.Mesh(types.vec3).pushQuad(
			0,0, 0,
			1,0, 0,
			0, 1, 0,
			1, 1, 0
		)
		.pushQuad(
			0,0, 1,
			1,0, 1,
			0, 1, 1,
			1, 1, 1
		)

		this.verbs = {
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
	}

	vertexStyle(){
	}

	vertexPost(){
	}

	vertexPre(){$
	}

	vertex(){$
		this.vertexPre()
		this.vertexStyle()

	
		if (this.visible < 0.5) return vec4(0.0)

		// compute the normal rect positions
		var shift = vec2(this.x - this.viewScroll.x*this.moveScroll, this.y - this.viewScroll.y*this.moveScroll)
		if(this.mesh.z < 0.5){
			shift += this.shadowOffset.xy + vec2(this.shadowSpread) * (this.mesh.xy *2. - 1.)//+ vec2(this.shadowBlur*0.25) * meshmz
		}

		// lets clip it
		var size = vec2(this.w, this.h)

		this.mesh.xy = (clamp(
			this.mesh.xy * size + shift, 
			max(this.turtleClip.xy, this.viewClip.xy),
			min(this.turtleClip.zw, this.viewClip.zw)
		) - shift) / size

		var pos = vec2(
			this.mesh.x * this.w,
			this.mesh.y * this.h
		) + shift

		var adjust = 1.
		if(this.mesh.z < 0.5){
			// bail if we have no visible shadow
			if(abs(this.shadowOffset.x)<0.001 && abs(this.shadowOffset.y)<0.001 && this.shadowBlur<2.0 && abs(this.shadowSpread) < 0.001){
				return vec4(0)
			}
			adjust = max(1.,this.shadowBlur)
		}

		this.pos = pos

		return vec4(pos,0.,1.) * this.viewPosition * this.camPosition * this.camProjection
	}

	pixel(){$
		if(this.mesh.z <.5){
			return this.shadowColor
		}
		return this.color
	}
}