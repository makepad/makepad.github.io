var types = require('base/types')
var painter = require('services/painter')

module.exports = class Quad extends require('base/shader'){

	prototype(){
		// special
		this.props = {
			visible: 1.,

			x: NaN,
			y: NaN,
			dx:0,
			dy:0,
			w: NaN,
			h: NaN,
			z: 0,
			dx:0,
			dy:0,
			down: {value:0},
			align: {value:[undefined,undefined]},
			margin: {value:[0,0,0,0]},
			wrap: {mask:2, value:1},
			padding: {mask:2, value:[0,0,0,0]},
			
			turtleClip:{value:[-50000,-50000,50000,50000]},
			viewClip:{kind:'uniform', value:[-50000,-50000,50000,50000]},
			moveScroll:{value:1.},
			debug:{value:false},
			color: {value:'#5'},

			mesh:{kind:'geometry', type:types.vec2},
		}


		var x = new painter.Mesh(types.vec2)
		this.mesh = new painter.Mesh(types.vec2).push(0,0,0,1,1,0,1,1)
		this.indices = new painter.Mesh(types.uint16)
		this.indices.push(0,1,2,2,1,3)

		this.verbs = {
			draw:function(overload){ 
				this.STYLEPROPS(overload, 1)
				this.ALLOCDRAW(overload)
				this.turtle.walk()
				this.WRITEPROPS()
			},
			begin:function(overload){
				this.STYLEPROPS(overload, 3)
				this.ALLOCDRAW(overload)
				this.beginTurtle()
			},
			end:function(doBounds){
				var ot = this.endTurtle(doBounds)
				this.turtle.walk(ot)
				this.WRITEPROPS()
				return ot
			}
		}
	}

	vertexStyle(){$
	}

	vertexPost(){$
	}

	vertexPre(){$
	}

	scrollAndClip(meshxy, delta){
		var shift = vec2(this.x - this.viewScroll.x*this.moveScroll+this.dx, this.y - this.viewScroll.y*this.moveScroll+this.dy) + delta
		var size = vec2(max(0.,this.w), max(0.,this.h))
		
		meshxy = (clamp(
			meshxy * size + shift, 
			max(this.turtleClip.xy, this.viewClip.xy),
			min(this.turtleClip.zw, this.viewClip.zw)
		) - shift) / size
	
		return meshxy * size + shift
	}

	vertex(){$
		this.vertexPre()
		this.vertexStyle()

		if(this.visible < 0.5){
			return vec4(0.)
		}

		var pos = this.scrollAndClip(this.mesh.xy, vec2(0.))

		return vec4(pos,0.,1.) * this.viewPosition * this.camPosition * this.camProjection
	}

	pixel(){$
		return this.color
	}
}