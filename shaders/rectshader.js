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
		shadowradius: 1.0,
		shadowoffset: [1.0, 1.0],
		shadowalpha: 0.5
	}

	this.shadowcolor = [0,0,0,0]

	this.mesh = painter.Mesh(types.vec3).pushQuad(
		-1,-1, 0,
		 1,-1, 0,
		-1, 1, 0,
		 1, 1, 0
	).pushQuad(
		-1,-1, 1,
		 1,-1, 1,
		-1, 1, 1,
		 1, 1, 1
	)

	this.vertex = function(){$
		if (props.visible < 0.5) return vec4(0.0)

		// store the part id on a varying
		vary.partid = mesh.z

		// compute the normal rect positions
		var pos = vec3(
			(mesh.x*.5+.5)*props.w + props.x,
			(mesh.y*.5+.5)*props.h + props.y,
			0.
		)
		// pass in the rect
		vary.pos = pos.xy - vec2(props.x, props.y)

		// compute the inner radii

		vary.quick = vec4(
			max(props.borderradius.x, props.borderradius.w) + props.borderwidth.w,
			max(props.borderradius.x, props.borderradius.y)+ props.borderwidth.x,
			props.w - max(props.borderradius.y, props.borderradius.z) - props.borderwidth.y,
			props.h - max(props.borderradius.z, props.borderradius.w) - + props.borderwidth.z
		)

		return vec4(pos, 1.0) * view.position * camera.position * camera.projection
	}

	this.pixel = function(){$
		//var dt = vary.roundcornermax
		var p = vary.pos
		var aaedge = min(length(vec2(length(dFdx(p)), length(dFdy(p)))) * SQRT12, 1.0)

		if(vary.partid < 0.5){
			return 'black'
		}
		else{
			if(p.x > vary.quick.x && p.x < vary.quick.z && p.y > vary.quick.y && p.y < vary.quick.w){
				return props.color
			}

			var br = props.borderradius * 2.
			var hwh = vec2(.5*props.w, .5*props.h)
			var ph = abs(p-hwh)
			var phtl = ph - (hwh - br.xx)
			var phtr = ph - (hwh - br.yy)
			var phbr = ph - (hwh - br.zz)
			var phbl = ph - (hwh - br.ww)
			// the main field
			var ftl = length(max(phtl + props.borderwidth.wx, 0.)) - br.x
			var ftr = length(max(phtr + props.borderwidth.yx, 0.)) - br.y
			var fbr = length(max(phbr + props.borderwidth.yz, 0.)) - br.z
			var fbl = length(max(phbl + props.borderwidth.wz, 0.)) - br.w
			// the border fields
			var btl = length(max(phtl, 0.)) - br.x 
			var btr = length(max(phtr, 0.)) - br.y
			var bbr = length(max(phbr, 0.)) - br.z
			var bbl = length(max(phbl, 0.)) - br.w
			var mx = clamp(((p.x / props.w)-.5)*1000., 0., 1.)
			var my = clamp(((p.y / props.h)-.5)*1000., 0., 1.)
			// mix the fields
			var fill = mix(mix(ftl, ftr, mx), mix(fbl, fbr, mx),my)
			var border = mix(mix(btl, btr, mx), mix(bbl, bbr, mx),my) //+ 20.
			// i need to draw a border from border field to fill field?
			var col = mix(props.bordercolor, vec4(props.bordercolor.rgb, 0.), clamp(border,0.,1.))
			return mix(props.color, col, clamp(fill, 0., 1.))
		}
		//var screenpos = vary.screenpos
		return 'red'
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