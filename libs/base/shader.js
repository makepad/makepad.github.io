module.exports = require('base/compiler').extend(function Shader(proto){

	var painter = require('services/painter')
	var types = require('base/types')

	// default shader properties
	proto.props = {
		// painter uniforms
		time:{kind:'uniform', block:'painter', value: 1.0},
		pixelRatio:{kind:'uniform', block:'painter',  type:types.float},
		workerId:{kind:'uniform', block:'painter', type:types.float},
		fingerInfo:{kind:'uniform', block:'painter', type:types.mat4},
		vertexPostMatrix:{kind:'uniform', block:'painter', type:types.mat4},
		camPosition:{kind:'uniform', block:'painter',  type:types.mat4},
		camProjection:{kind:'uniform', block:'painter',  type:types.mat4},
		// todo uniforms (also modified by painter)
		viewScroll:{kind:'uniform', block:'todo',  type:types.vec2},
		viewSpace:{kind:'uniform', block:'todo', type:types.vec4},
		viewPosition:{kind:'uniform', block:'todo', type:types.mat4},
		viewInverse:{kind:'uniform', block:'todo', type:types.mat4},
		todoId:{kind:'uniform', block:'todo', value:0.},
		// draw uniforms 
		viewClip:{kind:'uniform', value:[0,0,0,0]},
		pickAlpha:{kind:'uniform', value:0.5},

		pickId: {noTween:1, noStyle:1, value:0.},

		// tweening
		tween: {noTween:1, value:0.},
		ease: {noTween:1, value:[0,0,1.0,1.0]},
		duration: {noTween:1, value:0.},
		delay: {styleLevel:1, value:0.},
		tweenStart: {noTween:1, noStyle:1, value:1.0},

		// clipping and scrolling
		noBounds: {styleLevel:1, value:0},
		moveScroll:{noTween:1, value:1.},
		turtleClip:{styleLevel:3, noInPlace:1, noCast:1, value:[-50000,-50000,50000,50000]},
	}

	proto.defines = {
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
	for(let key in proto._props){
		var prop = proto._props[key]
		if(prop.kind === 'uniform'){
			if(!prop.block || prop.block === 'draw') continue
			painter.nameId('this_DOT_'+key)
		}
	}

	// safety for infinite loops
	proto.propAllocLimit = 150000

	proto.blending = [painter.SRC_ALPHA, painter.FUNC_ADD, painter.ONE_MINUS_SRC_ALPHA, painter.ONE, painter.FUNC_ADD, painter.ONE]
	proto.constantColor = undefined
	
	//
	//
	// Entrypoints
	//
	//

	proto.vertexMain = function(){$
		var T = 1.
		this.animTime = this.time
		if(this.tween > 0.01){
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
		if(this.vertexPostMatrix[0][0] != 1. || this.vertexPostMatrix[1][1] != 1.){
			gl_Position = position * this.vertexPostMatrix
		}
		else{
			gl_Position = position
		}
	}

	proto.pixelMain = function(){$
		var color = this.pixel()
		if(this.workerId < 0.){
			if(color.a < this.pickAlpha) discard
			gl_FragColor = vec4(this.todoId/255.,floor(this.pickId/256.0)/255.,mod(this.pickId,256.0)/255.,abs(this.workerId)/255.)
		}
		else{
			gl_FragColor = color
		}
	}

	//
	//
	// Tweening
	//
	//


	proto.tweenSimple = function(tween, time, easex, easey, easez, easew){
		if(tween == 1.) return time
		return this.tweenEase(time, easex, easey)
	}

	proto.tweenAll = function(tween, time, easex, easey, easez, easew){
		if(tween == 1.) return time
		if(tween == 2.){
			return this.tweenEase(time, easex, easey)
		}
		if(tween == 3.){
			return this.tweenBounce(time, easex)
		}
		if(tween == 4.){
			return this.tweenOvershoot(time, easex, easey, easez, easew)
		}
		if(tween == 5.){
		//	return this.tweenBezier(time, easex, easey, easez, easew)
		}
		
		return 1.
	}

	//proto.tweenTime = proto.tweenSimple
	proto.tweenTime = proto.tweenAll

	proto.tweenEase = function(t, easein, easeout){
		var a = -1. / max(1.,(easein*easein))
		var b = 1. + 1. / max(1.,(easeout*easeout))
		var t2 = pow(((a - 1.) * -b) / (a * (1. - b)), t)
		return (-a * b + b * a * t2) / (a * t2 - b)
	}

	proto.tweenBounce = function(t, f){
		// add bounciness
		var it = t * (1. / (1. - f)) + 0.5
		var inlog = (f - 1.) * it + 1.
		if(inlog <= 0.) return 1.
		var k = floor(log(inlog) / log(f))
		var d = pow(f, k)
		return 1. - (d * (it - (d - 1.) / (f - 1.)) - pow((it - (d-1.) / (f - 1.)), 2.)) * 4.
	}

	proto.tweenOvershoot = function(t, dur, freq, decay, ease){
		var easein = ease
		var easeout = 1.
		if(ease < 0.) easeout = -ease, easein = 1.

		if(t < dur){
			return this.tweenEase(t / dur, easein, easeout)
		}
		else{
			// we have to snap the frequency so we end at 0
			var w = (floor(.5+ (1.-dur)*freq*2. ) / ((1.-dur)*2.)) * PI * 2.
			var velo = ( this.tweenEase(1.001, easein, easeout) - this.tweenEase(1., easein, easeout))/(0.001*dur)

			return 1. + velo * ((sin((t - dur) * w) / exp((t - dur) * decay)) / w)
		}
	}

	proto.tweenBezier = function(cp0, cp1, cp2, cp3, t){

		if(abs(cp0 - cp1) < 0.001 && abs(cp2 - cp3) < 0.001) return t

		var epsilon = 1.0/200.0 * t
		var cx = 3.0 * cp0
		var bx = 3.0 * (cp2 - cp0) - cx
		var ax = 1.0 - cx - bx
		var cy = 3.0 * cp1
		var by = 3.0 * (cp3 - cp1) - cy
		var ay = 1.0 - cy - by
		var u = t

		for(let i = 0; i < 6; i++){
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
		for(let i = 0; i < 8; i++){
			var x = ((ax * u + bx) * u + cx) * u
			if(abs(x - t) < epsilon) return ((ay * u + by) * u + cy) * u
			if(t > x) w = u
			else v = u
			u = (v - w) *.5 + w
		}

		return ((ay * u + by) * u + cy) * u
	}

	//
	//
	// Fingers
	//
	//

	proto.fingerPos = function(i){
		var f = this.fingerInfo[i]
		return (vec4(f.xy,0.,1.) * this.viewInverse).xy + vec2(this.moveScroll * this.viewScroll.x, this.moveScroll * this.viewScroll.y)
	}

	proto.checkFingerDown = function(f, pos){
		if(f[2] > 0. && this.todoId == mod(f[2],256.) &&  abs(this.workerId) == floor(f[2]/256.) && (this.pickId < 0. || this.pickId == f[3]) ){
			pos = (vec4(f.xy,0.,1.) * this.viewInverse).xy + vec2(this.moveScroll * this.viewScroll.x, this.moveScroll * this.viewScroll.y)
			return true
		}
		return false
	}

	proto.isFingerDown = function(pos){$
		pos = vec2(0.)
		if(this.checkFingerDown(this.fingerInfo[0], pos)) return 1
		if(this.checkFingerDown(this.fingerInfo[1], pos)) return 2
		if(this.checkFingerDown(this.fingerInfo[2], pos)) return 3
		if(this.checkFingerDown(this.fingerInfo[3], pos)) return 4
		return 0
	}

	proto.checkFingerOver = function(f, pos){
		var f2 = abs(f[2])
		if(abs(this.workerId) == floor(f2/256.) && this.todoId == mod(f2,256.) && (this.pickId < 0. || this.pickId == f[3]) ){
			pos = (vec4(f.xy,0.,1.) * this.viewInverse).xy + vec2(this.moveScroll * this.viewScroll.x, this.moveScroll * this.viewScroll.y)
			return true
		}
		return false
	}

	// finger over
	proto.isFingerOver = function(pos){$
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

	proto.unionDistance = function(f1, f2){
		return min(f1, f2)
	}

	proto.intersectDistance = function(f1, f2){
		return max(f1, f2)
	}

	proto.subtractDistance = function(f1, f2){
		return max(-f1, f2)
	}

	proto.blendDistance = function(a, b, k){
	    var h = clamp(.5 + .5 * (b - a) / k, 0., 1.)
	    return mix(b, a, h) - k * h * (1.0 - h)
	}

	proto.boxDistance = function(p, x, y, w, h, r){
		var size = vec2(.5*w, .5*h)
		return length(max(abs(p - vec2(x, y)-size) - (size - vec2(2.*r)), 0.)) - 2.*r
	}

	proto.circleDistance = function(p, x, y, r){
		return distance(p, vec2(x,y)) - r
	}

	proto.lineDistance = function(p, x1, y1, x2, y2, r){
		var a = vec2(x1, y1)
		var b = vec2(x2, y2)
		var pa = p - a
		var ba = b - a
		return length(pa - ba * clamp(dot(pa,ba)/dot(ba,ba), 0., 1.)) - r
	}

	proto.antialias = function(p){
		return 1. / length(vec2(length(dFdx(p.x)), length(dFdy(p.y))))
	}

	proto.colorSolidDistance = function(antialias, field, fill){
		return mix(fill, vec4(fill.rgb, 0.), clamp(field * antialias + 1., 0., 1.))
	}

	proto.colorBorderDistance = function(antialias, field, borderWidth, fill, border){
		if(borderWidth<0.001) return mix(fill, vec4(fill.rgb,0.), clamp(field * antialias + 1., 0., 1.))
		var col = mix(border, vec4(border.rgb, 0.), clamp(field * antialias + 1.,0.,1.))
		return mix(fill, col, clamp((field + borderWidth) * antialias + 1., 0., 1.))
	}

	proto.animateUniform = function(uni){$
		return clamp((this.animTime - uni.x) / uni.y, 0., 1.) * (uni.w-uni.z) + uni.z
	}

	//
	//
	// Default macros
	//
	//

	proto.verbs = {
		length:function(){
			return this.$PROPLEN()
		},
		order:function(overload){
			this.$ALLOCDRAW(0)
		},
		reuse:function(overload){
			// make sure we are drawn
			this.orderNAME(overload)
			var $props = this.$shaders.NAME.$props
			if($props.oldLength !== undefined){
				$props.length = $props.oldLength
				$props.dirty = false
			}
		}
	}
})
