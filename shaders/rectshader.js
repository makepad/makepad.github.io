module.exports = require('./tweenshader').extend(function RectShader(proto){

	var types = require('types')
	var painter = require('painter')

	proto.props = {
		visible: {noTween:true, value:1.0},

		x: NaN,
		y: NaN,
		w: NaN,
		h: NaN,
		z: 0,

		align: {forceStyle:true, value:'lefttop'},
		margin: {forceStyle:true, value:[0,0,0,0]},
		padding: {forceStyle:true, value:[0,0,0,0]},

		color: {pack:'float12', value:'red'},
		borderColor: {pack:'float12' ,value:[0,0,0,1]},
		shadowColor: {pack:'float12', value:[0,0,0,0.5]},

		borderWidth: {pack:'int12', value:[0,0,0,0]},
		borderRadius: {pack:'int12', value:[4,4,4,4]},

		shadowBlur: 1.0,
		shadowSpread: 1.0,
		shadowOffset: [1.0,1.0],

		mesh:{kind:'geometry', type:types.vec3},
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

	proto.vertexStyle = function(){}
	proto.pixelStyle = function(){}

	proto.vertex = function(){$
		
		this.vertexStyle()

		if (this.visible < 0.5) return vec4(0.0)

		var pos = vec2(
			this.mesh.x*this.w,
			this.mesh.y*this.h
		)
		var adjust = 1.
		if(this.mesh.z < 0.5){
			// bail if we have no visible shadow
			if(abs(this.shadowOffset.x)<0.001 && abs(this.shadowOffset.y)<0.001 && this.shadowBlur<2.0 && abs(this.shadowSpread) < 0.001){
				return vec4(0)
			}
			adjust = max(1.,this.shadowBlur)
		}

		this.borderRadius = min(max(this.borderRadius,vec4(adjust)),vec4(min(this.w,this.h)*0.5))

		// compute the normal rect positions
		if(this.mesh.z < 0.5){
			pos.xy += this.shadowOffset.xy + vec2(this.shadowSpread) * (this.mesh.xy *2. - 1.)//+ vec2(this.shadowBlur*0.25) * meshmz
		}

		var br = this.borderRadius * 2. 
		
		return vec4(pos + vec2(this.x, this.y), 0., 1.0) * this.viewPosition * this.camPosition * this.camProjection
	}

	proto.pixel = function(){$
		//var dt = vary.roundcornermax
		var p = this.mesh.xy * vec2(this.w, this.h)

		this.pixelStyle()
		
		// NOT ENOUGH VARYINGS ON IOS. otherwise this goes in the vertex shader
		var quick = vec4(
			max(this.borderRadius.x, this.borderRadius.w) + this.borderWidth.w,
			max(this.borderRadius.x, this.borderRadius.y)+ this.borderWidth.x,
			this.w - max(this.borderRadius.y, this.borderRadius.z) - this.borderWidth.y,
			this.h - max(this.borderRadius.z, this.borderRadius.w) - this.borderWidth.z
		)

		// quick out
		if(this.mesh.z < 0.5){
			quick += vec4(this.shadowBlur,this.shadowBlur,-this.shadowBlur,-this.shadowBlur)
			if(p.x > quick.x && p.x < quick.z && p.y > quick.y && p.y < quick.w){
				// alright shadow
				return this.shadowColor
			}
		}
		else{
			if(p.x > quick.x && p.x < quick.z && p.y > quick.y && p.y < quick.w){
				return this.color
			}
		}

		//var aaedge = min(length(vec2(length(dFdx(p)), length(dFdy(p)))) * SQRT12, 1.0)
		var br = this.borderRadius
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
			var shborder = border / this.shadowBlur
			return mix(this.shadowColor, vec4(this.shadowColor.rgb,0.), pow(clamp(shborder*2.+1., 0., 1.),1.2))
		}
		else{ // inner field
			// inner radius
			var ir = vec4(
				max(br.x - max(this.borderWidth.x, this.borderWidth.w), 1.),
				max(br.y - max(this.borderWidth.y, this.borderWidth.x), 1.),
				max(br.z - max(this.borderWidth.y, this.borderWidth.z), 1.),
				max(br.w - max(this.borderWidth.w, this.borderWidth.z), 1.))
			// inner field displaced by inner radius and borderWidths
			var ftl = length(max(ph - (hwh - ir.xx) + this.borderWidth.wx, 0.)) - ir.x
			var ftr = length(max(ph - (hwh - ir.yy) + this.borderWidth.yx, 0.)) - ir.y
			var fbr = length(max(ph - (hwh - ir.zz) + this.borderWidth.yz, 0.)) - ir.z
			var fbl = length(max(ph - (hwh - ir.ww) + this.borderWidth.wz, 0.)) - ir.w
			// mix the fields
			var fill = mix(mix(ftl, ftr, mx), mix(fbl, fbr, mx),my)
			
			var borderfinal = vec4()
			// remove the error in the border
			if(abs(border - fill) < 0.1) borderfinal = vec4(this.color.rgb,0.)
			else borderfinal = mix(this.borderColor, vec4(this.borderColor.rgb, 0.), clamp(border*2.+1.,0.,1.))

			return mix(this.color, borderfinal, clamp(fill * 2. + 1., 0., 1.))
		}
	}

	proto.canvasMacros = {
		draw:function(overload){
			this.$STYLEPROPS(len)
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