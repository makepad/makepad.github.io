module.exports = require('./tweenshader').extend(function RectShader(proto){

	var types = require('types')
	var painter = require('painter')

	// special
	proto.props = {
		visible: {notween:true, nostyle:true, value:1.0},

		x: NaN,
		y: NaN,
		w: NaN,
		h: NaN,
		z: 0,

		align: 'lefttop',
		margin: [0,0,0,0],
		padding: [0,0,0,0],

		color: {packing:'float',value:'red'},
		borderwidth: {packing:'int',value:[0,0,0,0]},
		bordercolor: {packing:'float',value:[0,0,0,1]},
		borderradius: {packing:'int', value:[4,4,4,4]},
		shadowcolor: {packing:'float',value:[0,0,0,0.5]},

		shadowblur: 1.0,
		shadowspread: 1.0,
		shadowx: 1.0,
		shadowy: 1.0
	}

	proto.mesh = painter.Mesh(types.vec3).pushQuad(
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

	proto.vertexstyle = function(){}
	proto.pixelstyle = function(){}

	proto.vertex = function(){$
		
		this.vertexstyle()

		if (this.visible < 0.5) return vec4(0.0)

		var pos = vec2(
			this.mesh.x*this.w,
			this.mesh.y*this.h
		)
		var borderadjust = 1.
		if(this.mesh.z < 0.5){
			// bail if we have no visible shadow
			if(abs(this.shadowx)<0.001 && abs(this.shadowy)<0.001 && this.shadowblur<2.0 && abs(this.shadowspread) < 0.001){
				return vec4(0)
			}
			borderadjust = max(1.,this.shadowblur)
		}

		this.borderradius = min(max(this.borderradius,vec4(borderadjust)),vec4(min(this.w,this.h)*0.5))

		// compute the normal rect positions
		var meshmz = this.mesh.xy *2. - 1.
		if(this.mesh.z < 0.5){
			pos.xy += vec2(this.shadowx, this.shadowy) + vec2(this.shadowspread) * meshmz//+ vec2(this.shadowblur*0.25) * meshmz
		}

		var br = this.borderradius * 2. 
		
		return vec4(pos + vec2(this.x, this.y), 0., 1.0) * this.view.position * this.camera.position * this.camera.projection
	}

	proto.pixel = function(){$
		//var dt = vary.roundcornermax
		var p = this.mesh.xy * vec2(this.w, this.h)

		this.pixelstyle()
		
		// NOT ENOUGH VARYINGS ON IOS. otherwise this goes in the vertex shader
		var quick = vec4(
			max(this.borderradius.x, this.borderradius.w) + this.borderwidth.w,
			max(this.borderradius.x, this.borderradius.y)+ this.borderwidth.x,
			this.w - max(this.borderradius.y, this.borderradius.z) - this.borderwidth.y,
			this.h - max(this.borderradius.z, this.borderradius.w) - this.borderwidth.z
		)

		// quick out
		if(this.mesh.z < 0.5){
			quick += vec4(this.shadowblur,this.shadowblur,-this.shadowblur,-this.shadowblur)
			if(p.x > quick.x && p.x < quick.z && p.y > quick.y && p.y < quick.w){
				// alright shadow
				return this.shadowcolor
			}
		}
		else{
			if(p.x > quick.x && p.x < quick.z && p.y > quick.y && p.y < quick.w){
				return this.color
			}
		}

		//var aaedge = min(length(vec2(length(dFdx(p)), length(dFdy(p)))) * SQRT12, 1.0)
		var br = this.borderradius
		var hwh = vec2(.5*this.w, .5*this.h)
		var ph = abs(p-hwh)
		// the border fields
		var btl = length(max(ph - (hwh - br.xx), 0.)) - br.x
		var btr = length(max(ph - (hwh - br.yy), 0.)) - br.y
		var bbr = length(max(ph - (hwh - br.zz), 0.)) - br.z
		var bbl = length(max(ph - (hwh - br.ww), 0.)) - br.w 
		var mx = clamp((this.mesh.x - .5)*1000., 0., 1.)
		var my = clamp((this.mesh.y - .5)*1000., 0., 1.)

		// border field (same as shadow)
		var border = mix(
			mix(btl, btr, mx), 
			mix(bbl, bbr, mx),my
		) 

		if(this.mesh.z < 0.5){
			var shborder = border / this.shadowblur
			return mix(this.shadowcolor, vec4(this.shadowcolor.rgb,0.), pow(clamp(shborder*2.+1., 0., 1.),1.2))
		}
		else{ // inner field
			// inner radius
			var ir = vec4(
				max(br.x - max(this.borderwidth.x, this.borderwidth.w), 1.),
				max(br.y - max(this.borderwidth.y, this.borderwidth.x), 1.),
				max(br.z - max(this.borderwidth.y, this.borderwidth.z), 1.),
				max(br.w - max(this.borderwidth.w, this.borderwidth.z), 1.))
			// inner field displaced by inner radius and borderwidths
			var ftl = length(max(ph - (hwh - ir.xx) + this.borderwidth.wx, 0.)) - ir.x
			var ftr = length(max(ph - (hwh - ir.yy) + this.borderwidth.yx, 0.)) - ir.y
			var fbr = length(max(ph - (hwh - ir.zz) + this.borderwidth.yz, 0.)) - ir.z
			var fbl = length(max(ph - (hwh - ir.ww) + this.borderwidth.wz, 0.)) - ir.w
			// mix the fields
			var fill = mix(mix(ftl, ftr, mx), mix(fbl, fbr, mx),my)
			
			var borderfinal = vec4()
			// remove the error in the border
			if(abs(border - fill) < 0.1) borderfinal = vec4(this.color.rgb,0.)
			else borderfinal = mix(this.bordercolor, vec4(this.bordercolor.rgb, 0.), clamp(border*2.+1.,0.,1.))

			return mix(this.color, borderfinal, clamp(fill * 2. + 1., 0., 1.))
		}
	}

	proto.canvasmacros = {
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