var types = require('base/types')
var painter = require('services/painter')

module.exports = class Clip extends require('base/shader'){

	prototype(){
		// special
		this.props = {
			visible: {value:1.0},

			x: {value:NaN},
			y: {value:NaN},
			w: {value:NaN},
			h: {value:NaN},
			z: 0,

			down: {value:0},
			align: {value:[undefined,undefined]},
			margin: {value:[0,0,0,0]},
			wrap: {mask:2, value:1},
			padding: {mask:2, value:[0,0,0,0]},

			turtleClip:{value:[-50000,-50000,50000,50000]},
			viewClip:{kind:'uniform', value:[-50000,-50000,50000,50000]},
			moveScroll:{value:1.},
		}

		var x = new painter.Mesh(types.vec2)
		this.mesh = new painter.Mesh(types.vec2).pushQuad(0,0,0,1,1,0,1,1)

		this.verbs = {
			draw:function(overload){
				this.$STYLEPROPS(overload, 1)
				this.$ALLOCDRAW()
				this.turtle.walk()
				this.$WRITEPROPS()
			},
			begin:function(overload){
				this.$STYLEPROPS(overload, 3)
				this.$ALLOCDRAW()
				this.beginTurtle()
			},
			end:function(doBounds){
				var ot = this.endTurtle(doBounds)
				this.turtle.walk(ot)
				this.$WRITEPROPS()
			}
		}
	}

	vertexStyle(){$
	}

	vertexPost(){$
	}

	vertexPre(){$
	}

	vertex(){$
		this.vertexPre()
		this.vertexStyle()

		if(this.visible < 0.5){
			return vec4(0.)
		}

		var shift = vec2(this.x - this.viewScroll.x*this.moveScroll, this.y - this.viewScroll.y*this.moveScroll)
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

		return pos * this.viewPosition * this.camPosition * this.camProjection
	}

	pixel(){$
		return 'red'
	}
}