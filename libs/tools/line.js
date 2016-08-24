module.exports = require('base/shader').extend(function RectShader(proto){

	var types = require('base/types')
	var painter = require('services/painter')

	proto.props = {
		visible: {noTween:true, value:1.0},

		// start x
		sx: {styleLevel:1, value:NaN},
		sy: {styleLevel:1, value:NaN},
		// end x / y line x /y
		x: NaN,
		y: NaN,
		first: {styleLevel:1, value:false},

		point:{noTween:1, noStyle:1, value:0},
		lineWidth:1,
		outlineWidth:0.,
		color:{pack:'float12', value:[1,1,1,1]},
		outlineColor:{pack:'float12', value:[1,0,0,1]},

		shadowColor:{pack:'float12', value:[0,0,0,1]},
		shadowBlur:0.,
		shadowOffset:[0,0],
		
		mesh:{kind:'geometry', type:types.vec3},
		// internal props
		ax: {noStyle:1, value:NaN},
		ay: {noStyle:1, value:NaN},
		bx: {noStyle:1, value:NaN},
		by: {noStyle:1, value:NaN},
		cx: {noStyle:1, value:NaN},
		cy: {noStyle:1, value:NaN},
		dx: {noStyle:1, value:NaN},
		dy: {noStyle:1, value:NaN},
	}

	proto.mesh = painter.Mesh(types.vec3).pushQuad(
		0, 0, 0,
		1, 0, 0,
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

	// intersect line of a->b and c->d and return error if we are too parallel
	proto.intersectLine = function(a, ab, c, cd, error){
		var b = a + ab
		var d = c + cd
		var det = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x)
		if( abs(det)< 3.){
			return error
		}
		var m = a.x * b.y - a.y * b.x
		var n = c.x * d.y - c.y * d.x
		return vec2(
			(m * (c.x - d.x) - (a.x - b.x) * n) / det,
			(m * (c.y - d.y) - (a.y - b.y) * n) / det
		)
	}

	proto.vertex = function(){$
		
		this.vertexStyle()

		if (this.visible < 0.5) return vec4(0.)
		if(this.mesh.z < 0.5){
			if(abs(this.shadowOffset.x)<0.001 && abs(this.shadowOffset.y)<0.001 && this.shadowBlur<2.0){
				return vec4(0)
			}
		}

		// the four points we use in this line segment
		var a = vec2(this.ax, this.ay)
		var b = vec2(this.bx, this.by)
		var c = vec2(this.cx, this.cy)
		var d = vec2(this.dx, this.dy)
		// direction vectors
		var ab = b - a
		var bc = c - b
		var cd = d - c

		var lw = this.lineWidth * .5
		var side = this.mesh.xy * 2.-1.
		var f = this.mesh.x
		// compute normals with linewith
		var nab = normalize(vec2(ab.y, -ab.x)) * lw
		var nbc = normalize(vec2(bc.y, -bc.x)) * lw
		var ncd = normalize(vec2(cd.y, -cd.x)) * lw

		// intersect the lines
		this.pos = this.intersectLine(
			mix(a,c,f) + mix(nab,nbc,f) * side.y, mix(ab,bc,f),
			mix(b,d,f) + mix(nbc,ncd,f) * side.y, mix(bc,cd,f),
			mix(b,c,f) + nbc * side.y
		)
		
		if(this.mesh.z < 0.5){
			this.pos.xy += this.shadowOffset.xy
		}

		return vec4(this.pos.x + this.x, this.pos.y + this.y, 0, 1.) * this.viewPosition * this.camPosition * this.camProjection
	}

	proto.pixel = function(){$
		// map the field to pixels?
		var antialias = 1./length(vec2(length(dFdx(this.pos.x)), length(dFdy(this.pos.y))))
		var outline = (abs(this.mesh.y-.5)-.5)*2.*this.lineWidth// * 2. * this.lineWidth //- 0.5*this.lineWidth

		if(this.mesh.z < 0.5){
			var shoutline = outline / this.shadowBlur
			return mix(this.shadowColor, vec4(this.shadowColor.rgb,0.), pow(clamp(shoutline+1., 0., 1.),1.2))
		}

		var fill = outline + this.outlineWidth
		var borderfinal = vec4()
		if(abs(outline - fill) < 0.1) borderfinal = vec4(this.color.rgb,0.)
		else borderfinal = mix(this.outlineColor, vec4(this.outlineColor.rgb, 0.), clamp(outline*antialias + 1.,0.,1.))
		return mix(this.color, borderfinal, clamp(fill * antialias + 1., 0., 1.))
	}

	proto.toolMacros = {
		draw:function(overload){
			this.$STYLEPROPS(overload)
			this.$ALLOCDRAW()
			var t = this.turtle
			// lets make a little capture object
			var p = t._NAMEPoints || (t._NAMEPoints = {})
			// we dont have startx /starty
			if(isNaN(t._sx) || isNaN(t._sy)){
				// if our frameId doesnt line up
				if(t._first || p.frameId !== this.view._frameId){
					p.frameId = this.view._frameId
					p.points = 1
					p.ax = p.bx = p.cx = p.dx = t._x
					p.ay = p.by = p.cy = p.dy = t._y
					return
				}
				p.points ++
				p.ax = p.bx, p.ay = p.by
				p.bx = p.cx, p.by = p.cy
				p.cx = t._x, p.cy = t._y
				p.dx = p.cx + (p.cx - p.bx),
				p.dy = p.cy + (p.cy - p.by)
				if(p.points === 2){
					p.ax = p.bx - (p.cx - p.bx)
					p.ay = p.by - (p.cy - p.by)
				}
				else{
					var offset = this.$PROPLEN()
					this.$PROPVARDEF()
					this.$PROP(offset - 1, 'dx') = p.cx
					this.$PROP(offset - 1, 'dy') = p.cy
				}
			}
			else{
				p.points = 4
				p.bx = t._sx, p.by = t._sy
				p.cx = t._x, p.cy = t._y
				var dx = p.cx - p.bx
				var dy = p.cy - p.by
				p.ax = p.bx - dx, p.ay = p.by - dx
				p.dx = p.cx + dx, p.dy = p.cy + dy
				if(isNaN(t._x) || isNaN(t._y)){
					p.cx = t.sx
					p.cy = t.sy
					p.points = 1
					return
				}
			}
			t._x = 0
			t._y = 0
			this.$WRITEPROPS({
				point:p.points,
				ax: p.ax, ay: p.ay,
				bx: p.bx, by: p.by,
				cx: p.cx, cy: p.cy,
				dx: p.dx, dy: p.dy
			})
		}
	}
})