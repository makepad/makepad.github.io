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
			max(props.borderradius.x, props.borderradius.w),
			max(props.borderradius.x, props.borderradius.y),
			props.w - max(props.borderradius.y, props.borderradius.z),
			props.h - max(props.borderradius.z, props.borderradius.w)
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
				return 'blue'
			}

			var br = props.borderradius
			var hwh = vec2(.5*props.w, .5*props.h)
			var ph = abs(p-hwh)
			var dtl = length(max(ph - (hwh - 2. * br.xx), 0.)) - 2. * br.x
			var dtr = length(max(ph - (hwh - 2. * br.yy), 0.)) - 2. * br.y
			var dbr = length(max(ph - (hwh - 2. * br.zz), 0.)) - 2. * br.z
			var dbl = length(max(ph - (hwh - 2. * br.ww), 0.)) - 2. * br.w

			var fx = clamp(((p.x / props.w)-.5)*1000., 0., 1.)
			var fy = clamp(((p.y / props.h)-.5)*1000., 0., 1.)
			var d = mix(mix(dtl, dtr, fx), mix(dbl, dbr, fx),fy)

			return mix('red', 'green',d+1.5)// d*0.1+1.5)
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