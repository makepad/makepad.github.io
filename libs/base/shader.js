var painter = require('services/painter')
var types = require('base/types')

module.exports = class Shader extends require('base/compiler'){
	
	prototype() {
		
		// default shader properties
		this.props = {
			// painter uniforms
			time            :{kind:'uniform', block:'painter', value:1.0},
			
			pixelRatio      :{kind:'uniform', block:'painter', type:types.float},
			workerId        :{kind:'uniform', block:'painter', type:types.float},
			fingerInfo      :{kind:'uniform', block:'painter', type:types.mat4},
			vertexPostMatrix:{kind:'uniform', block:'painter', type:types.mat4},
			camPosition     :{kind:'uniform', block:'painter', type:types.mat4},
			camProjection   :{kind:'uniform', block:'painter', type:types.mat4},
			// todo uniforms (also modified by painter)
			paintId         :{kind:'uniform', block:'todo', value:0.},
			viewScroll      :{kind:'uniform', block:'todo', type:types.vec2},
			viewSpace       :{kind:'uniform', block:'todo', type:types.vec4},
			viewPosition    :{kind:'uniform', block:'todo', type:types.mat4},
			viewInverse     :{kind:'uniform', block:'todo', type:types.mat4},
			// draw uniforms 
			viewClip        :{kind:'uniform', value:[0, 0, 0, 0]},
			pickAlpha       :{kind:'uniform', value:0.5},
			
			pickId          :{mask:0, value:0.},
			animStart       :{mask:0, value:1.0},
			animState       :{mask:0, value:0.},
			animNext        :{mask:0, value:0.},
			
			state           :'default',
			queue           :0,
			id              :0,
			// clipping ordering and scrolling
			order           :0,
			moveScroll      :1,
			turtleClip      :[-50000, -50000, 50000, 50000],
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
				if(!prop.block || prop.block === 'draw') continue
				painter.nameId('thisDOT' + key)
			}
		}
		
		// safety for infinite loops
		this.propAllocLimit = 1500000
		
		this.tweenTime = this.tweenAll
		
		this.verbs = {
			length:function() {
				if(!$props) return 0
				return this.PROPLEN()
			},
			//order:function(overload) {
			//	this.ALLOCDRAW(overload, 0)
			//	return $props
			//},
			reuse :function(overload, length) {
				this.ALLOCDRAW(overload, 0)
				// lets flip it again since we are reusing
				$props.flip()
				//return $props
				// alright so. now what.
				// make sure we are drawn
				//var $props = this.orderNAME(overload)
				//var $props = this.$shaders.NAME.$props
				if(length !== undefined) {
					console.error("LENGTH NOT ZERO")
				}
				//	$props.oldLength = 
				//	$props.length = length
				//}
				//else if($props.oldLength !== undefined) {
				//	$props.length = $props.oldLength
				//	$props.oldLength = undefined
				//	$props.dirty = false
				//}
			}
		}
		
		
	}
	
	//
	//
	// Entrypoints
	//
	//
	
	vertexMain() {$
		// reference the props
		this.time
		this.animStart
		this.animState
		this.animNext
		
		//if(this.tween > 0.01) {
		//	this.normalTween = clamp((this.animTime - this.tweenStart) / this.duration, 0.0, 1.0)
		//	T = this.easedTween = this.tweenTime(
		//		this.tween,
		//		this.normalTween,
		//		this.ease.x,
		//		this.ease.y,
		//		this.ease.z,
		//		this.ease.w
		//	)
		//}
		$INITIALIZEVARIABLES
		
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
			gl_FragColor = vec4(this.paintId / 255., floor(this.pickId / 65536.0)/255., floor(this.pickId / 256.0) / 255., mod(this.pickId, 256.0) / 255.)
		}
		else {
			gl_FragColor = color
		}
	}
	
	//
	//
	// Timing functions
	//
	//
	
	linear(t) {
		return clamp(t, 0., 1.)
	}
	
	ease(t, begin, end) {
		if(t < 0.) return 0.
		if(t > 1.) return 1.
		var a = -1. / max(1., (begin * begin))
		var b = 1. + 1. / max(1., (end * end))
		var t2 = pow(((a - 1.) * -b) / (a * (1. - b)), t)
		return (-a * b + b * a * t2) / (a * t2 - b)
	}
	
	bounce(t, dampen) {
		if(t < 0.) return 0.
		if(t > 1.) return 1.
		// add bounciness
		var it = t * (1. / (1. - dampen)) + 0.5
		var inlog = (dampen - 1.) * it + 1.
		if(inlog <= 0.) return 1.
		var k = floor(log(inlog) / log(dampen))
		var d = pow(dampen, k)
		return 1. - (d * (it - (d - 1.) / (dampen - 1.)) - pow((it - (d - 1.) / (dampen - 1.)), 2.)) * 4.
	}
	
	elastic(t, duration, frequency, decay, ease) {
		if(t < 0.) return 0.
		if(t > 1.) return 1.
		var easein = ease
		var easeout = 1.
		if(ease < 0.) easeout = -ease,easein = 1.
		
		if(t < duration) {
			return this.easeTiming(t / duration, easein, easeout)
		}
		else {
			// we have to snap the frequency so we end at 0
			var w = (floor(.5 + (1. - duration) * freq * 2.) / ((1. - duration) * 2.)) * PI * 2.
			var velo = (this.easeTiming(1.001, easein, easeout) - this.easeTiming(1., easein, easeout)) / (0.001 * dur)
			
			return 1. + velo * ((sin((t - duration) * w) / exp((t - duration) * decay)) / w)
		}
	}
	
	bezier(t, cp0, cp1, cp2, cp3) {
		if(t < 0.) return 0.
		if(t > 1.) return 1.
		if(abs(cp0 - cp1) < 0.001 && abs(cp2 - cp3) < 0.001) return t
		
		var epsilon = 1.0 / 200.0 * t
		var cx = 3.0 * cp0
		var bx = 3.0 * (cp2 - cp0) - cx
		var ax = 1.0 - cx - bx
		var cy = 3.0 * cp1
		var by = 3.0 * (cp3 - cp1) - cy
		var ay = 1.0 - cy - by
		var u = t
		
		for(let i = 0;i < 6;i++){
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
		for(let i = 0;i < 8;i++){
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
		pos = (vec4(f.xy, 0., 1.) * this.viewInverse).xy + vec2(this.moveScroll * this.viewScroll.x, this.moveScroll * this.viewScroll.y)
		return (f[2] > 0. && this.paintId == f[2] && (this.pickId < 0. || this.pickId == f[3]))?true:false
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
		pos = (vec4(f.xy, 0., 1.) * this.viewInverse).xy + vec2(this.moveScroll * this.viewScroll.x, this.moveScroll * this.viewScroll.y)
		return (this.paintId == f2 && (this.pickId < 0. || this.pickId == f[3]))?true:false
	}
	
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
	// Simple vector API
	//
	//
	
	antialias(p) {
		return 1. / length(vec2(length(dFdx(p)), length(dFdy(p))))
	}
	
	premulAlpha(color) {
		return vec4(color.rgb * color.a, color.a)
	}
	
	
	// 2D canvas api for shader
	viewport(pos = this.mesh.xy * vec2(this.w, this.h)) {$
		this.pos = pos
		this.result = vec4(0.)
		this._oldShape = 
		this.shape = 1e+20
		this.blur = 0.00001
		this._aa = this.antialias(pos)
		this._scale = 1.
		return pos
	}
	
	translate(x, y) {$
		this.pos -= vec2(x, y)
	}
	
	rotate(a, x = 0., y = 0.) {$
		var ca = cos(-a), sa = sin(-a)
		var p = this.pos - vec2(x, y)
		this.pos = vec2(p.x * ca - p.y * sa, p.x * sa + p.y * ca) + vec2(x, y)
	}
	
	scale(f, x = 0., y = 0.) {$
		this._scale *= f
		this.pos = (this.pos - vec2(x, y)) * f + vec2(x, y)
	}
	
	clear(color) {
		this.result = vec4(color.rgb * color.a + this.result.rgb * (1. - color.a), color.a)
	}
	
	_calcBlur(w) {
		var f = w - this.blur
		var wa = clamp(-w * this._aa, 0., 1.)
		var wb = this.blur < 0.0001?1.0:clamp(-w / this.blur, 0., 1.)
		return wa * wb
	}
	
	fillKeep(color) {$
		var f = this._calcBlur(this.shape)
		var source = vec4(color.rgb * color.a, color.a)
		var dest = this.result
		this.result = source * f + dest * (1. - source.a * f)
		return this.result
	}
	
	fill(color) {$
		this.fillKeep(color)
		this._oldShape = this.shape = 1e+20
		return this.result
	}
	
	strokeKeep(color, width, displace = 0.) {$
		var f = this._calcBlur(abs(this.shape + displace) - width / this._scale)
		var source = vec4(color.rgb * color.a, color.a)
		var dest = this.result
		this.result = source * f + dest * (1. - source.a * f)
	}
	
	stroke(color, width, displace = 0.) {$
		this.strokeKeep(color, width, displace)
		this._oldShape = this.shape = 1e+20
		return this.result
	}
	
	glowKeep(color, width, displace = 0.) {$
		var f = this._calcBlur(abs(this.shape + displace) - width / this._scale)
		var source = vec4(color.rgb * color.a, color.a)
		var dest = this.result
		this.result = vec4(source.rgb * f, 0.) + dest
	}
	
	glow(color, width, displace = 0.) {$
		this.glowKeep(color, width, displace)
		this._oldShape = this.shape = 1e+20
		return this.result
	}
	
	union() {
		this._oldShape = this.shape = min(this.field, this._oldShape)
	}
	
	intersect() {
		this._oldShape = this.shape = max(this.field, this._oldShape)
	}
	
	subtract() {
		this._oldShape = this.shape = max(-this.field, this._oldShape)
	}
	
	gloop(k) {
		var h = clamp(.5 + .5 * (this._oldShape - this.field) / k, 0., 1.)
		this._oldShape = this.shape = mix(this._oldShape, this.field, h) - k * h * (1.0 - h)
	}

	blend(k){
		this._oldShape = this.shape = mix(this._oldShape, this.field, k)
	}
	
	circle(x, y, r) {$
		var c = this.pos - vec2(x, y)
		this.field = (length(c.xy) - r) / this._scale
		this._oldShape = this.shape
		this.shape = min(this.shape, this.field)
	}
	
	box(x, y, w, h, r) {$
		var p = this.pos - vec2(x, y)
		var size = vec2(.5 * w, .5 * h)
		var bp = max(abs(p - size.xy) - (size.xy - vec2(2. * r).xy), vec2(0.))
		this.field = (length(bp) - 2. * r) / this._scale
		this._oldShape = this.shape
		this.shape = min(this.shape, this.field)
	}
	
	rect(x, y, w, h) {$
		var s = vec2(w, h) * .5
		var d = abs(vec2(x, y) - this.pos + s) - s
		var dm = min(d, vec2(0.))
		this.field = max(dm.x, dm.y) + length(max(d, vec2(0.)))
		this._oldShape = this.shape
		this.shape = min(this.shape, this.field)
	}
	
	moveTo(x, y) {$
		this._lastPos = 
		this._startPos = vec2(x, y)
	}
	
	lineTo(x, y) {$
		var p = vec2(x, y)
		var pa = this.pos - this._lastPos.xy
		var ba = p - this._lastPos
		var h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)
		this.field = length(pa - ba * h) / this._scale
		//this.shape = sin(this.mesh.x*this.field)*1.
		//this.box(10,10,100,100)
		this._oldShape = this.shape
		this.shape = min(this.shape, this.field)
		this._lastPos = p
	}
	
	closePath() {$
		this.lineTo(this._startPos.x, this._startPos.y)
	}
	
	hsv2rgb(c) { //http://gamedev.stackexchange.com/questions/59797/glsl-shader-change-hue-saturation-brightness
		var K = vec4(1., 2. / 3., 1. / 3., 3.)
		var p = abs(fract(c.xxx + K.xyz) * 6. - K.www)
		return vec4(c.z * mix(K.xxx, clamp(p - K.xxx, 0., 1.), c.y), c.w)
	}
	
	hsv2rgbJS(c) { // simply devectorized
		return [
			c[2] * mix(1, clamp(abs(fract(c[0] + 1) * 6. - 3) - 1, 0., 1.), c[1]),
			c[2] * mix(1, clamp(abs(fract(c[0] + 2/3.) * 6. - 3) - 1, 0., 1.), c[1]),
			c[2] * mix(1, clamp(abs(fract(c[0] + 1/3.) * 6. - 3) - 1, 0., 1.), c[1]),
			c[3]
		]
	}
	
	rgb2hsv(c) {
		var K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0)
		var p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g))
		var q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r))
		
		var d = q.x - min(q.w, q.y)
		var e = 1.0e-10
		return vec4(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x, c.w)
	}

	rgb2hsvJS(c){ // devectorized 

		var pc = c[1]<c[2]//step(c[2],c[1])
		var p0 = pc?c[2]:c[1]//mix(c[2],c[1],pc)
		var p1 = pc?c[1]:c[2]//mix(c[1],c[2],pc)
		var p2 = pc?-1:0//mix(-1,0,pc)
		var p3 = pc?2/3:-1/3//mix(2/3,-1/3,pc)

		var qc = c[0]<p0//step(p0, c[0])
		var q0 = qc?p0:c[0]//mix(p0, c[0], qc)
		var q1 = p1
		var q2 = qc?p3:p2//mix(p3, p2, qc)
		var q3 = qc?c[0]:p0//mix(c[0], p0, qc)

		var d = q0 - min(q3, q1)
		var e = 1.0e-10
		return [
			abs(q2 + (q3 - q1) / (6.0 * d + e)), 
			d / (q0 + e), 
			q0, 
			c[3]
		]
	}


	//
	//
	// Default macros
	//
	//
}
