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

		visible: {notween:true, nostyle:true, value:1.0},

		align: 'lefttop',
		margin: [0,0,0,0],
		padding: [0,0,0,0],

		color: 'red',
		borderwidth: [0,0,0,0],
		bordercolor: [0,0,0,0],
		borderradius: [4,4,4,4],
		//borderinner: 1.0,
		shadowblur: 1.0,
		shadowspread: 1.0,
		shadowx: 1.0,
		shadowy: 1.0
	}

	this.shadowcolor = [0,0,0,0.5]

	this.mesh = painter.Mesh(types.vec3).pushQuad(
		-1,-1, 0,
		 1,-1, 0,
		-1, 1, 0,
		 1, 1, 0
	)
	.pushQuad(
		-1,-1, 1,
		 1,-1, 1,
		-1, 1, 1,
		 1, 1, 1
	)

	this.vertex = function(){$
		if (props.visible < 0.5) return vec4(0.0)

		var pos = vec2(
			(mesh.x*.5+.5)*props.w,
			(mesh.y*.5+.5)*props.h
		)

		vary.pos = pos.xy

		vary.quick = vec4(
			max(props.borderradius.x, props.borderradius.w) + props.borderwidth.w,
			max(props.borderradius.x, props.borderradius.y)+ props.borderwidth.x,
			props.w - max(props.borderradius.y, props.borderradius.z) - props.borderwidth.y,
			props.h - max(props.borderradius.z, props.borderradius.w) - + props.borderwidth.z
		)

		// compute the normal rect positions
		if(mesh.z < 0.5){
			pos.xy += vec2(props.shadowx, props.shadowy) + vec2(props.shadowspread) * mesh.xy+ vec2(props.shadowblur*0.5) * mesh.xy

			vary.quick.x += props.shadowblur
			vary.quick.y += props.shadowblur
			vary.quick.z -= props.shadowblur
			vary.quick.w -= props.shadowblur

		}

		var br = props.borderradius * 2. 
		

		return vec4(pos + vec2(props.x, props.y), 0., 1.0) * view.position * camera.position * camera.projection
	}

	this.pixel = function(){$
		//var dt = vary.roundcornermax
		var p = vary.pos

		//return 'black'
		// quick out
		if(p.x > vary.quick.x && p.x < vary.quick.z && p.y > vary.quick.y && p.y < vary.quick.w){
			if(mesh.z < 0.5){
				// alright shadow
				return shadowcolor
			}
			else{
				return props.color
			}
		}

		//var aaedge = min(length(vec2(length(dFdx(p)), length(dFdy(p)))) * SQRT12, 1.0)

		var br = props.borderradius * 2. 
		var hwh = vec2(.5*props.w, .5*props.h)
		var ph = abs(p-hwh)
		// the border fields
		var btl = length(max(ph - (hwh - br.xx), 0.)) - br.x
		var btr = length(max(ph - (hwh - br.yy), 0.)) - br.y
		var bbr = length(max(ph - (hwh - br.zz), 0.)) - br.z
		var bbl = length(max(ph - (hwh - br.ww), 0.)) - br.w
		var mx = clamp(mesh.x*1000., 0., 1.)
		var my = clamp(mesh.y*1000., 0., 1.)

		// border field (same as shadow)
		var border = mix(
			mix(btl, btr, mx), 
			mix(bbl, bbr, mx),my
		) //+ 20.

		if(mesh.z < 0.5){
			var shborder = border / props.shadowblur
			return mix(shadowcolor, vec4(shadowcolor.rgb,0.), pow(clamp(shborder*2.+1., 0., 1.),1.2))
		}
		else{ // main shape
			var ir = vec4( //- props.borderwidth.x //inner border radius, todo FIX
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
			
			// i need to draw a border from border field to fill field?
			var col = mix(props.bordercolor, vec4(props.bordercolor.rgb, 0.), clamp(border*2.+1.,0.,1.))
			//return col
			return mix(props.color, col, clamp(fill*2.+1., 0., 1.))
			//return mix(col2, vec4(col2.rgb, 0.), clamp(border*2.+1.,0.,1.))
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