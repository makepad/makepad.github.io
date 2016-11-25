var types = require('base/types')
var painter = require('services/painter')

module.exports = class Bg extends require('./quad'){

	prototype(){
		
		this.props = {
			borderColor: {value:'white'},
			borderRadius: {value:0},
			borderWidth: {value:0},

			fieldSampler:{kind:'sampler', sampler:painter.SAMPLER2DLINEAR},
			mesh:{kind:'geometry', type:types.vec4},
		}

		this.verbs = {
			draw:function(overload){
				this.STYLEPROPS(overload, 1)
				this.ALLOCDRAW(overload)
				this.turtle.walk()
				this.WRITEPROPS()
			},
			begin:function(overload){
				this.STYLEPROPS(overload, 2)
				this.ALLOCDRAW(overload)
				var t = this.turtle
				t.shiftPadding(t._borderWidth)
				this.beginTurtle()
			},
			end:function(doBounds){
				var ot = this.endTurtle(doBounds)
				this.turtle.walk(ot)
				this.WRITEPROPS()
			}
		}

		var mesh = this.mesh = new painter.Mesh(types.vec4)

		//add the 9 quads
		mesh.push(
			0,   0,     0, 0, // 0
			0.2, 0,   0.5, 0, // 1
			0.8, 0,   0.5, 0, // 2
			1.0, 0,   1.0, 0, // 3
			
			0,   0.2,   0, 0.5, // 4
			0.2, 0.2, 0.5, 0.5, // 5
			0.8, 0.2, 0.5, 0.5, // 6
			1.0, 0.2, 1.0, 0.5, // 7

			0,   0.8,   0, 0.5, // 8
			0.2, 0.8, 0.5, 0.5, // 9
			0.8, 0.8, 0.5, 0.5, // 10
			1.0, 0.8, 1.0, 0.5, // 11

			0,   1.0,   0, 1.0, // 12
			0.2, 1.0, 0.5, 1.0, // 13
			0.8, 1.0, 0.5, 1.0, // 14
			1.0, 1.0, 1.0, 1.0 // 15
		)
		// add the 32 triangles
		var indices = this.indices = new painter.Mesh(types.uint16)
		indices.push(
			 0, 1, 4, 1, 5, 4,
			 1, 2, 5, 2, 6, 5,
			 2, 3, 6, 3, 7, 6,
			 4, 5, 8, 5, 9, 8,
			 5, 6, 9, 6,10, 9,
			 6, 7,10, 7,11,10,
			 8, 9,12, 9,13,12,
			 9,10,13,10,14,13,
			10,11,14,11,15,14
		)

		// vertexids
		//0  1  2  3
	    //4  5  6  7
	    //8  9  10 11
	    //12 13 14 15

	    var csize = 128, hsize = csize>>1
	    var circleu8 = new Uint8Array(csize*csize)
	    for(let y = 0; y < csize; y++){
		    for(let x = 0; x < csize; x++){
		    	var xd = x-(csize>>1)
		    	var yd = y-(csize>>1)
		    	circleu8[y*csize + x] = 128 + ((hsize) - Math.round(Math.sqrt(xd*xd + yd*yd))) 
		    }
		}

	    this.fieldSampler = new painter.Texture(painter.LUMINANCE, painter.UNSIGNED_BYTE, 0, csize, csize, circleu8)
	}

    vertexPre(){}
	vertexStyle(){}
	pixelStyle(){}

	vertex(){$
		this.vertexPre()
		this.vertexStyle()

		if(this.visible < .5) return  vec4(0.)

		this.borderRadius = max(1., this.borderRadius)
		
		if(this.mesh.x == 0.2){
			this.mesh.x = clamp(this.borderRadius / this.w,0.,1.)
		}
		else if(this.mesh.x == 0.8){
			this.mesh.x = clamp(1. - this.borderRadius / this.w,0.,1.)
		}
		if(this.mesh.y == 0.2){
			this.mesh.y = clamp(this.borderRadius / this.h,0.,1.)
		}
		else if(this.mesh.y == 0.8){
			this.mesh.y = clamp(1. - this.borderRadius / this.h,0.,1.)
		}

		var pos = this.scrollAndClip(this.mesh.xy)
			
		return vec4(pos , 0., 1.0) * this.viewPosition * this.camPosition * this.camProjection
	}

	pixel(){$
		//var antialias = this.borderRadius*4.*this.pixelRatio
		this._aa = this.borderRadius*4.*this.pixelRatio
		this._scale = 1.
		this.result = vec4(0.)
		this.blur = 0.
		this.shape = (.5-texture2D(this.fieldSampler, this.mesh.zw).x)
		
		this.fill(this.color)
		if(this.borderWidth < 0.1){
			return this.result
		}
		return this.stroke(this.borderColor, this.borderWidth)
	}
}