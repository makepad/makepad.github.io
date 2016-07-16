module.exports = require('./tweenshader').extend(function RectShader(){

	var types = require('types')
	var painter = require('painter')

	// special
	this.props = {
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
		shadowy: 1.0,
		visible: {notween:true, nostyle:true, value:1.0}

	}

	this.mesh = painter.Mesh(types.vec3).pushQuad(
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

	this.vertex = function(){$
		
		this.vertexstyle()

		if (props.visible < 0.5) return vec4(0.0)

		var pos = vec2(
			mesh.x*props.w,
			mesh.y*props.h
		)
		var borderadjust = 1.
		if(mesh.z < 0.5){
			borderadjust = max(1.,props.shadowblur)
		}
		props.borderradius = min(max(props.borderradius,vec4(borderadjust)),vec4(min(props.w,props.h)*0.5))

		// compute the normal rect positions
		var meshmz = mesh.xy *2. - 1.
		if(mesh.z < 0.5){
			pos.xy += vec2(props.shadowx, props.shadowy) + vec2(props.shadowspread) * meshmz//+ vec2(props.shadowblur*0.25) * meshmz
		}

		var br = props.borderradius * 2. 
		
		return vec4(pos + vec2(props.x, props.y), 0., 1.0) * view.position * camera.position * camera.projection
	}

	this.vertexstyle = function(){
	}

	this.pixelstyle = function(){
	}

	this.colorfn = function(){
		return props.color
	}

	this.bordercolorfn = function(){
		return props.bordercolor
	}

	this.shadowcolorfn = function(){
		return props.shadowcolor
	}

	this.pixel = function(){$
		//var dt = vary.roundcornermax
		var p = mesh.xy * vec2(props.w, props.h)

		this.pixelstyle()
		
		var shadowcolor = shadowcolorfn()
		var bordercolor = bordercolorfn()
		var color = colorfn()

		// NOT ENOUGH VARYINGS ON IOS. otherwise this goes in the vertex shader
		var quick = vec4(
			max(props.borderradius.x, props.borderradius.w) + props.borderwidth.w,
			max(props.borderradius.x, props.borderradius.y)+ props.borderwidth.x,
			props.w - max(props.borderradius.y, props.borderradius.z) - props.borderwidth.y,
			props.h - max(props.borderradius.z, props.borderradius.w) - props.borderwidth.z
		)

		// quick out
		if(mesh.z < 0.5){
			quick += vec4(props.shadowblur,props.shadowblur,-props.shadowblur,-props.shadowblur)
			if(p.x > quick.x && p.x < quick.z && p.y > quick.y && p.y < quick.w){
				// alright shadow
				return shadowcolor
			}
		}
		else{
			if(p.x > quick.x && p.x < quick.z && p.y > quick.y && p.y < quick.w){
				return color
			}
		}

		//var aaedge = min(length(vec2(length(dFdx(p)), length(dFdy(p)))) * SQRT12, 1.0)
		var br = props.borderradius 
		var hwh = vec2(.5*props.w, .5*props.h)
		var ph = abs(p-hwh)
		// the border fields
		var btl = length(max(ph - (hwh - br.xx), 0.)) - br.x
		var btr = length(max(ph - (hwh - br.yy), 0.)) - br.y
		var bbr = length(max(ph - (hwh - br.zz), 0.)) - br.z
		var bbl = length(max(ph - (hwh - br.ww), 0.)) - br.w 
		var mx = clamp((mesh.x-.5)*1000., 0., 1.)
		var my = clamp((mesh.y-.5)*1000., 0., 1.)

		// border field (same as shadow)
		var border = mix(
			mix(btl, btr, mx), 
			mix(bbl, bbr, mx),my
		) 

		if(mesh.z < 0.5){
			var shborder = border / props.shadowblur
			return mix(shadowcolor, vec4(shadowcolor.rgb,0.), pow(clamp(shborder*2.+1., 0., 1.),1.2))
		}
		else{ // main shape
			var ir = vec4(
				max(br.x - max(props.borderwidth.x, props.borderwidth.w), 1.),
				max(br.y - max(props.borderwidth.y, props.borderwidth.x), 1.),
				max(br.z - max(props.borderwidth.y, props.borderwidth.z), 1.),
				max(br.w - max(props.borderwidth.w, props.borderwidth.z), 1.))
			// the main field
			var ftl = length(max(ph - (hwh - ir.xx) + props.borderwidth.wx, 0.)) - ir.x
			var ftr = length(max(ph - (hwh - ir.yy) + props.borderwidth.yx, 0.)) - ir.y
			var fbr = length(max(ph - (hwh - ir.zz) + props.borderwidth.yz, 0.)) - ir.z
			var fbl = length(max(ph - (hwh - ir.ww) + props.borderwidth.wz, 0.)) - ir.w
			// mix the fields
			var fill = mix(mix(ftl, ftr, mx), mix(fbl, fbr, mx),my)

			var borderfinal = vec4()
			// remove the error in the border
			if(abs(border - fill) < 0.1) borderfinal = vec4(color.rgb,0.)
			else borderfinal = mix(bordercolor, vec4(bordercolor.rgb, 0.), clamp(border*2.+1.,0.,1.))

			return mix(color, borderfinal, clamp(fill * 2. + 1., 0., 1.))
		}
	}

	this.canvasmacros = {
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