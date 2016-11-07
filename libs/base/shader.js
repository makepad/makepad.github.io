var painter = require('services/painter')
var types = require('base/types')

module.exports = class Shader extends require('base/compiler'){
	
	prototype() {
		
		// default shader properties
		this.props = {
			// painter uniforms
			time:{kind:'uniform', block:'painter', value:1.0},
			pixelRatio:{kind:'uniform', block:'painter', type:types.float},
			workerId:{kind:'uniform', block:'painter', type:types.float},
			fingerInfo:{kind:'uniform', block:'painter', type:types.mat4},
			vertexPostMatrix:{kind:'uniform', block:'painter', type:types.mat4},
			camPosition:{kind:'uniform', block:'painter', type:types.mat4},
			camProjection:{kind:'uniform', block:'painter', type:types.mat4},
			// todo uniforms (also modified by painter)
			viewScroll:{kind:'uniform', block:'todo', type:types.vec2},
			viewSpace:{kind:'uniform', block:'todo', type:types.vec4},
			viewPosition:{kind:'uniform', block:'todo', type:types.mat4},
			viewInverse:{kind:'uniform', block:'todo', type:types.mat4},
			todoId:{kind:'uniform', block:'todo', value:0.},
			// draw uniforms 
			viewClip:{kind:'uniform', value:[0, 0, 0, 0]},
			pickAlpha:{kind:'uniform', value:0.5},
			
			pickId:{noTween:1, noStyle:1, value:0.},
			
			// tweening
			tween:{noTween:1, value:0.},
			ease:{noTween:1, value:[0, 0, 1.0, 1.0]},
			duration:{noTween:1, value:0.},
			delay:{styleLevel:1, value:0.},
			tweenStart:{noTween:1, noStyle:1, value:1.0},
			
			// clipping and scrolling
			noBounds:{styleLevel:1, value:0},
			moveScroll:{noTween:1, value:1.},
			turtleClip:{styleLevel:3, noInPlace:1, noCast:1, value:[ - 50000,  - 50000, 50000, 50000]},
		}
		
		this.defines = {
			'PI':'3.141592653589793',
			'E':'2.718281828459045',
			'LN2':'0.6931471805599453',
			'LN10':'2.302585092994046',
			'LOG2E':'1.4426950408889634',
			'LOG10E':'0.4342944819032518',
			'SQRT1_2':'0.70710678118654757',
			'TORAD':'0.017453292519943295',
			'GOLDEN':'1.618033988749895'
		}
		
		// Allocate non draw block names
		for(let key in this._props){
			var prop = this._props[key]
			if(prop.kind === 'uniform') {
				if( ! prop.block || prop.block === 'draw') continue
				painter.nameId('thisDOT' + key)
			}
		}
		
		// safety for infinite loops
		this.propAllocLimit = 150000
		
		this.blending = [painter.ONE, painter.FUNC_ADD, painter.ONE_MINUS_SRC_ALPHA, painter.ONE, painter.FUNC_ADD, painter.ONE_MINUS_SRC_ALPHA]
		this.constantColor = undefined
		
		this.tweenTime = this.tweenAll
		
		this.verbs = {
			length:function() {
				return this.$PROPLEN()
			},
			order:function(overload) {
				this.$ALLOCDRAW(0)
			},
			reuse:function(overload) {
				// make sure we are drawn
				this.orderNAME(overload)
				var $props = this.$shaders.NAME.$props
				if($props.oldLength !== undefined) {
					$props.length = $props.oldLength
					$props.dirty = false
				}
			}
		}
	}
	
	//
	//
	// Entrypoints
	//
	//
	
	vertexMain() {$
		var T = 1.
		this.animTime = this.time
		if(this.tween > 0.01) {
			this.normalTween = clamp((this.animTime - this.tweenStart) / this.duration, 0.0, 1.0)
			T = this.easedTween = this.tweenTime(
				this.tween,
				this.normalTween,
				this.ease.x,
				this.ease.y,
				this.ease.z,
				this.ease.w
			)
		}
		$CALCULATETWEEN
		var position = this.vertex()
		if(this.vertexPostMatrix[0][0] != 1. || this.vertexPostMatrix[1][1] != 1.) {
			gl_Position = position * this.vertexPostMatrix
		}
		else {
			gl_Position = position
		}
	}
	
	pixelMain() {$
		var color = this.pixel()
		if(this.workerId < 0.) {
			if(color.a < this.pickAlpha) discard
			gl_FragColor = vec4(this.todoId / 255., floor(this.pickId / 256.0) / 255., mod(this.pickId, 256.0) / 255., abs(this.workerId) / 255.)
		}
		else {
			gl_FragColor = color
		}
	}
	
	//
	//
	// Tweening
	//
	//
	
	
	tweenSimple(tween, time, easex, easey, easez, easew) {
		if(tween == 1.) return time
		return this.tweenEase(time, easex, easey)
	}
	
	tweenAll(tween, time, easex, easey, easez, easew) {
		if(tween == 1.) return time
		if(tween == 2.) {
			return this.tweenEase(time, easex, easey)
		}
		if(tween == 3.) {
			return this.tweenBounce(time, easex)
		}
		if(tween == 4.) {
			return this.tweenOvershoot(time, easex, easey, easez, easew)
		}
		if(tween == 5.) {
			//	return this.tweenBezier(time, easex, easey, easez, easew)
		}
		
		return 1.
	}
	
	//proto.tweenTime = proto.tweenSimple
	
	tweenEase(t, easein, easeout) {
		var a =  - 1. / max(1., (easein * easein))
		var b = 1. + 1. / max(1., (easeout * easeout))
		var t2 = pow(((a - 1.) *  - b) / (a * (1. - b)), t)
		return ( - a * b + b * a * t2) / (a * t2 - b)
	}
	
	tweenBounce(t, f) {
		// add bounciness
		var it = t * (1. / (1. - f)) + 0.5
		var inlog = (f - 1.) * it + 1.
		if(inlog <= 0.) return 1.
		var k = floor(log(inlog) / log(f))
		var d = pow(f, k)
		return 1. - (d * (it - (d - 1.) / (f - 1.)) - pow((it - (d - 1.) / (f - 1.)), 2.)) * 4.
	}
	
	tweenOvershoot(t, dur, freq, decay, ease) {
		var easein = ease
		var easeout = 1.
		if(ease < 0.) easeout =  - ease,easein = 1.
		
		if(t < dur) {
			return this.tweenEase(t / dur, easein, easeout)
		}
		else {
			// we have to snap the frequency so we end at 0
			var w = (floor(.5 + (1. - dur) * freq * 2.) / ((1. - dur) * 2.)) * PI * 2.
			var velo = (this.tweenEase(1.001, easein, easeout) - this.tweenEase(1., easein, easeout)) / (0.001 * dur)
			
			return 1. + velo * ((sin((t - dur) * w) / exp((t - dur) * decay)) / w)
		}
	}
	
	tweenBezier(cp0, cp1, cp2, cp3, t) {
		
		if(abs(cp0 - cp1) < 0.001 && abs(cp2 - cp3) < 0.001) return t
		
		var epsilon = 1.0 / 200.0 * t
		var cx = 3.0 * cp0
		var bx = 3.0 * (cp2 - cp0) - cx
		var ax = 1.0 - cx - bx
		var cy = 3.0 * cp1
		var by = 3.0 * (cp3 - cp1) - cy
		var ay = 1.0 - cy - by
		var u = t
		
		for(let i = 0;i < 6;i ++ ){
			var x = ((ax * u + bx) * u + cx) * u - t
			if(abs(x) < epsilon) return ((ay * u + by) * u + cy) * u
			var d = (3.0 * ax * u + 2.0 * bx) * u + cx
			if(abs(d) < 1e-6) break
			u = u - x / d
		}
		
		if(t > 1.) return (ay + by) + cy
		if(t < 0.) return 0.0
		
		var l = 0, w = 0.0, v = 1.0
		u = t
		for(let i = 0;i < 8;i ++ ){
			var x = ((ax * u + bx) * u + cx) * u
			if(abs(x - t) < epsilon) return ((ay * u + by) * u + cy) * u
			if(t > x) w = u
			else v = u
			u = (v - w) * .5 + w
		}
		
		return ((ay * u + by) * u + cy) * u
	}
	
	//
	//
	// Fingers
	//
	//
	
	fingerPos(i) {
		var f = this.fingerInfo[i]
		return (vec4(f.xy, 0., 1.) * this.viewInverse).xy + vec2(this.moveScroll * this.viewScroll.x, this.moveScroll * this.viewScroll.y)
	}
	
	checkFingerDown(f, pos) {
		if(f[2] > 0. && this.todoId == mod(f[2], 256.) && abs(this.workerId) == floor(f[2] / 256.) && (this.pickId < 0. || this.pickId == f[3])) {
			pos = (vec4(f.xy, 0., 1.) * this.viewInverse).xy + vec2(this.moveScroll * this.viewScroll.x, this.moveScroll * this.viewScroll.y)
			return true
		}
		return false
	}
	
	isFingerDown(pos) {$
		pos = vec2(0.)
		if(this.checkFingerDown(this.fingerInfo[0], pos)) return 1
		if(this.checkFingerDown(this.fingerInfo[1], pos)) return 2
		if(this.checkFingerDown(this.fingerInfo[2], pos)) return 3
		if(this.checkFingerDown(this.fingerInfo[3], pos)) return 4
		return 0
	}
	
	checkFingerOver(f, pos) {
		var f2 = abs(f[2])
		if(abs(this.workerId) == floor(f2 / 256.) && this.todoId == mod(f2, 256.) && (this.pickId < 0. || this.pickId == f[3])) {
			pos = (vec4(f.xy, 0., 1.) * this.viewInverse).xy + vec2(this.moveScroll * this.viewScroll.x, this.moveScroll * this.viewScroll.y)
			return true
		}
		return false
	}
	
	// finger over
	isFingerOver(pos) {$
		pos = vec2(0.)
		if(this.checkFingerOver(this.fingerInfo[0], pos)) return 1
		if(this.checkFingerOver(this.fingerInfo[1], pos)) return 2
		if(this.checkFingerOver(this.fingerInfo[2], pos)) return 3
		if(this.checkFingerOver(this.fingerInfo[3], pos)) return 4
		return 0
	}
	
	//
	//
	// Distance fields
	//
	//
	
	unionDistance(f1, f2) {
		return min(f1, f2)
	}
	
	intersectDistance(f1, f2) {
		return max(f1, f2)
	}
	
	subtractDistance(f1, f2) {
		return max( - f1, f2)
	}
	
	blendDistance(a, b, k) {
		var h = clamp(.5 + .5 * (b - a) / k, 0., 1.)
		return mix(b, a, h) - k * h * (1.0 - h)
	}
	
	boxDistance(p, x, y, w, h, r) {
		var size = vec2(.5 * w, .5 * h)
		return length(max(abs(p - vec2(x, y) - size) - (size - vec2(2. * r)), 0.)) - 2. * r
	}
	
	circleDistance(p, x, y, r) {
		return distance(p, vec2(x, y)) - r
	}
	
	lineDistance(p, x1, y1, x2, y2, r) {
		var a = vec2(x1, y1)
		var b = vec2(x2, y2)
		var pa = p - a
		var ba = b - a
		return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)) - r
	}
	
	antialias(p) {
		return 1. / length(vec2(length(dFdx(p.x)), length(dFdy(p.y))))
	}
	
	colorSolidDistance(antialias, field, fill) {
		return this.premulAlpha(mix(fill, vec4(fill.rgb, 0.), clamp(field * antialias + 1., 0., 1.)))
	}
	
	premulAlpha(color) {
		return vec4(color.rgb * color.a, color.a)
	}
	
	colorBorderDistance(antialias, field, borderWidth, fill, border) {
		if(borderWidth < 0.001) return this.premulAlpha(mix(fill, vec4(fill.rgb, 0.), clamp(field * antialias + 1., 0., 1.)))
		var col = mix(border, vec4(border.rgb, 0.), clamp(field * antialias + 1., 0., 1.))
		return this.premulAlpha(mix(fill, col, clamp((field + borderWidth) * antialias + 1., 0., 1.)))
	}
	
	animateUniform(uni) {$
		return clamp((this.animTime - uni.x) / uni.y, 0., 1.) * (uni.w - uni.z) + uni.z
	}
	
	// 2D canvas api for shader
	viewport(pos) {
		this._pos = pos
		this._aa = this.antialias(pos)
		this._result = vec4(0.)
		this._shape = 1e+20
		this._scale = 1.
		this._blur = 0.00001
	}
	
	blur(v) {
		this._blur = v
	}
	
	translate(x, y) {$
		this._pos -= vec2(x, y)
	}
	
	rotate(a, x, y) {$
		var ca = cos( - a), sa = sin( - a)
		var p = this._pos - vec2(x, y)
		this._pos = vec2(p.x * ca - p.y * sa, p.x * sa + p.y * ca) + vec2(x, y)
	}
	
	scale(f, x, y) {$
		this._scale *= f
		this._pos = (this._pos - vec2(x, y)) * f + vec2(x, y)
	}
	
	clear(color) {
		this._result = vec4(color.rgb * color.a + this._result.rgb * (1. - color.a), color.a)
	}
	
	result() {
		return this._result
	}
	
	_calcBlur(w) {
		var f = w - this._blur
		var wa = clamp( - w * this._aa, 0., 1.)
		var wb = clamp( - w / this._blur, 0., 1.)
		return wa * wb
	}
	
	fillKeep(color) {$
		var f = this._calcBlur(this._shape)
		var source = vec4(color.rgb * color.a, color.a)
		var dest = this._result
		this._result = source * f + dest * (1. - source.a * f)
	}
	
	fill(color) {$
		this.fillKeep(color)
		this._shape = 1e+20
	}
	
	strokeKeep(color, width) {$
		var f = this._calcBlur(abs(this._shape) - width / this._scale)
		var source = vec4(color.rgb * color.a, color.a)
		var dest = this._result
		this._result = source * f + dest * (1. - source.a * f)
	}
	
	stroke(color, width) {$
		this.strokeKeep(color, width)
		this._shape = 1e+20
	}
	
	glowKeep(color, width) {$
		var f = this._calcBlur(abs(this._shape) - width / this._scale)
		var source = vec4(color.rgb * color.a, color.a)
		var dest = this._result
		this._result = source * f + dest
	}
	
	glow(color, width) {$
		this.glowKeep(color, width)
		this._shape = 1e+20
	}
	
	union() {
		this._shape = max(this._field, this._oldShape)
	}
	
	subtract() {
		this._shape = max( - this._field, this._oldShape)
	}
	
	gloop(k) {
		var h = clamp(.5 + .5 * (this._oldShape - this._field) / k, 0., 1.)
		this._shape = mix(this._oldShape, this._field, h) - k * h * (1.0 - h)
	}
	
	circle(x, y, r) {$
		var c = this._pos - vec2(x, y)
		this._field = (length(c.xy) - r) / this._scale
		this._oldShape = this._shape
		this._shape = min(this._shape, this._field)
	}
	
	box(x, y, w, h, r) {$
		var p = this._pos - vec2(x, y)
		var size = vec2(.5 * w, .5 * h)
		var bp = max(abs(p - size.xy) - (size.xy - vec2(2. * r).xy), vec2(0.))
		this._field = (length(bp) - 2. * r) / this._scale
		this._oldShape = this._shape
		this._shape = min(this._shape, this._field)
	}
	
	field(f) {$
		this._field = f
		this._oldShape = this._shape
		this._shape = min(this._shape, this._field)
	}
	
	rectangle(x, y, w, h) {$
		var p = this._pos - vec2(x, y)
		this._field = length(max(abs(p) - vec2(w, h), 0.0)) / this._scale
		this._oldShape = this._shape
		this._shape = min(this._shape, this._field)
	}
	
	moveTo(x, y) {$
		this._lastPos = 
		this._startPos = vec2(x, y)
	}
	
	lineTo(x, y) {$
		var p = vec2(x, y)
		var pa = this._pos - this._lastPos.xy
		var ba = p - this._lastPos
		var h = clamp(dot(pa.xy, ba) / dot(ba, ba), 0., 1.)
		this._field = length(pa.xy - ba * h) / this._scale
		this._oldShape = this._shape
		this._shape = min(this._shape, this._field)
		this._lastPos = p
	}
	
	closePath() {$
		this.lineTo(this._startPos.x, this._startPos.y)
	}
	//
//
// Default macros
//
//
}
