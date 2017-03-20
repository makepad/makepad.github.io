var types = require('base/types')
var painter = require('services/painter')

module.exports = class Line extends require('base/shader'){

	prototype(){
		this.props = {
			visible: 1.0,

			space: 0.,

			// start x
			sx: NaN,
			sy: NaN,
			// end x / y line x /y
			x: NaN,
			y: NaN,
			dx:0,
			dy:0,
			first: false,

			point:{mask:0,value:0},
			lineWidth:1,
			outlineWidth:0.,
			color:{pack:'float12', value:[1,1,1,1]},
			outlineColor:{pack:'float12', value:[1,0,0,1]},

			shadowColor:{pack:'float12', value:[0,0,0,1]},
			shadowBlur:0.,
			shadowOffset:[0,0],
			
			turtleClip:{value:[-50000,-50000,50000,50000]},
			viewClip:{kind:'uniform', value:[-50000,-50000,50000,50000]},
			moveScroll:{value:1.},

			mesh:{kind:'geometry', type:types.vec3},
			// internal props
			ax: {mask:0, value:NaN},
			ay: {mask:0, value:NaN},
			bx: {mask:0, value:NaN},
			by: {mask:0, value:NaN},
			cx: {mask:0, value:NaN},
			cy: {mask:0, value:NaN},
			dx: {mask:0, value:NaN},
			dy: {mask:0, value:NaN},
		}

		this.mesh = new painter.Mesh(types.vec3).pushQuad(
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

		this.verbs = {
			draw:function(overload){
				this.STYLEPROPS(overload, 1)
				this.ALLOCDRAW(overload, 1)
				var t = this.turtle
				// lets make a little capture object
				var p = t._NAMEPoints || (t._NAMEPoints = {})
				var space = t._space
				// we dont have startx /starty
				if(isNaN(t._sx) || isNaN(t._sy)){
					if(space===1){
						t._x = t._x*t.width+t.sx
						t._y = t._y*t.height+t.sy
					}
					else if(space ===2){
						t._x = (.5+.5*t._x)*t.width+t.sx
						t._y = (.5+.5*t._y)*t.height+t.sy
					}
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
						this.PROP[offset - 1, 'dx'] = p.cx
						this.PROP[offset - 1, 'dy'] = p.cy
					}
				}
				else{
					if(space===1){
						t._x = t._x*t.width+t.sx
						t._y = t._y*t.height+t.sy
						t._sx = t._sx*t.width+t.sx
						t._sy = t._sy*t.height+t.sy
					}
					else if(space===2){
						t._x = (.5+.5*t._x)*t.width+t.sx
						t._y = (.5+.5*t._y)*t.height+t.sy
						t._sx = (.5+.5*t._sx)*t.width+t.sx
						t._sy = (.5+.5*t._sy)*t.height+t.sy
					}
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
				this.WRITEPROPS({
					point:p.points,
					ax: p.ax, ay: p.ay,
					bx: p.bx, by: p.by,
					cx: p.cx, cy: p.cy,
					dx: p.dx, dy: p.dy
				})
			}
		}
	}

	vertexStyle(){}
	pixelStyle(){}

	// intersect line of a->b and c->d and return error if we are too parallel
	intersectLine(a, ab, c, cd, error){
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

	vertex(){$
		
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
		
		var shift = vec2(this.viewScroll.x*this.moveScroll, this.viewScroll.y*this.moveScroll)
		
		this.pos.xy-=shift
		/*
		this.pos = (clamp(
			this.pos - shift, 
			max(this.turtleClip.xy, this.viewClip.xy),
			min(this.turtleClip.zw, this.viewClip.zw)
		))*/

		if(this.mesh.z < 0.5){
			this.pos.xy += this.shadowOffset.xy
		}

		return vec4(this.pos.x + this.x, this.pos.y + this.y, 0, 1.) * this.viewPosition * this.camPosition * this.camProjection
	}

	pixel(){$
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
		return this.premulAlpha(mix(this.color, borderfinal, clamp(fill * antialias + 1., 0., 1.)))
	}
}