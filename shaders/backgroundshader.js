module.exports = require('shader').extend(function Rect9Shader(proto){
	
	// cheap round border rectangle for backdrops in UI
	// tries to make the compute per filled pixel minimal
	// for GPUs that don't seem to take the fastpaths in rectshader

	var types = require('types')
	var painter = require('painter')

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
		noBounds: {styleLevel:1, value:0},
		
		color: {pack:'float12', value:'gray'},
		borderColor: {pack:'float12', value:'white'},
		borderRadius: {value:0},
		borderWidth: {value:0},

		lockScroll:{noTween:1, value:1.},
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
	var indices = proto.indices = painter.Mesh(types.uint16)
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
    for(var y = 0; y < csize; y++){
	    for(var x = 0; x < csize; x++){
	    	var xd = x-(csize>>1)
	    	var yd = y-(csize>>1)
	    	circleu8[y*csize + x] = 128 + ((hsize) - Math.round(Math.sqrt(xd*xd + yd*yd))) 
	    }
	}

    proto.fieldSampler = new painter.Texture(painter.LUMINANCE, painter.UNSIGNED_BYTE, 0, csize, csize, circleu8)

	proto.vertexStyle = function(){}
	proto.pixelStyle = function(){}

	proto.vertex = function(){$
		this.vertexStyle()
		this.borderRadius = max(1., this.borderRadius)
		
		if(this.mesh.x == 0.2){
			this.mesh.x = this.borderRadius / this.w
		}
		else if(this.mesh.x == 0.8){
			this.mesh.x = 1. - this.borderRadius / this.w
		}
		if(this.mesh.y == 0.2){
			this.mesh.y = this.borderRadius / this.h
		}
		else if(this.mesh.y == 0.8){
			this.mesh.y = 1. - this.borderRadius / this.h
		}

		var shift = vec2(this.x - this.viewScroll.x*this.lockScroll, this.y - this.viewScroll.y*this.lockScroll)
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
			
		return vec4(pos , 0., 1.0) * this.viewPosition * this.camPosition * this.camProjection
	}

	proto.pixel = function(){$
		var antialias = this.borderRadius*4.*this.pixelRatio
		var field = (.5-texture2D(this.fieldSampler, this.mesh.zw).x)
		if(this.borderWidth < 0.1){
			return vec4(this.color.rgb,1.0-clamp(field*antialias+1., 0., 1.))
		}
		var borderfinal = mix(this.borderColor, vec4(this.borderColor.rgb, 0.), clamp(field*antialias+1.,0.,1.))
		return mix(this.color, borderfinal, clamp(field * antialias + 1. + this.borderWidth, 0., 1.))
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