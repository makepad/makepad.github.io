module.exports = require('base/shader').extend(function Rect9Shader(proto){
	
	var types = require('base/types')
	var painter = require('services/painter')

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
		noBounds: {styleLevel:1, value:1},
		
		color: {pack:'float12', value:'gray'},
		borderColor: {pack:'float12', value:'white'},
		borderRadius: {value:0},
		borderWidth: {value:0},

		moveScroll:{noTween:1, value:1.},
		turtleClip:{styleLevel:3, noInPlace:1, noCast:1, value:[-50000,-50000,50000,50000]},
		viewClip:{kind:'uniform', value:[-50000,-50000,50000,50000]},
		fieldSampler:{kind:'sampler', sampler:painter.SAMPLER2DLINEAR},
		mesh:{kind:'geometry', type:types.vec4},
	}

	var mesh = proto.mesh = new painter.Mesh(types.vec4)

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
	var indices = proto.indices = new painter.Mesh(types.uint16)
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

    proto.fieldSampler = new painter.Texture(painter.LUMINANCE, painter.UNSIGNED_BYTE, 0, csize, csize, circleu8)

    proto.vertexPre = function(){}
	proto.vertexStyle = function(){}
	proto.pixelStyle = function(){}

	proto.vertex = function(){$
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

		var shift = vec2(this.x - this.viewScroll.x*this.moveScroll, this.y - this.viewScroll.y*this.moveScroll)
		var size = vec2(max(0.,this.w), max(0.,this.h))

		this.mesh.xy = (clamp(
			this.mesh.xy * size + shift, 
			max(this.turtleClip.xy, this.viewClip.xy),
			min(this.turtleClip.zw, this.viewClip.zw)
		) - shift) / size

		var pos = vec2(
			this.mesh.x * this.w,
			this.mesh.y * this.h
		) + shift
			
		return vec4(pos , 0., 1.0) * this.viewPosition * this.camPosition * this.camProjection
	}

	proto.pixel = function(){$
		var antialias = this.borderRadius*4.*this.pixelRatio
		var field = (.5-texture2D(this.fieldSampler, this.mesh.zw).x)
		var fieldaa = field*antialias+1.
		if(this.borderWidth < 0.1){
			return  mix(this.color,vec4(this.color.rgb,0.), clamp(fieldaa, 0., 1.))
		}
		var borderfinal = mix(this.borderColor, vec4(this.borderColor.rgb, 0.), clamp(fieldaa,0.,1.))
		return mix(this.color, borderfinal, clamp(fieldaa + this.borderWidth, 0., 1.))
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
			var t = this.turtle
			t.shiftPadding(t._borderWidth)
			this.beginTurtle()
		},
		end:function(doBounds){
			var ot = this.endTurtle(doBounds)
			this.turtle.walk(ot)
			this.$WRITEPROPS()
		}
	}
})