module.exports = require('shader').extend(function TweenShader(proto){
	var types = require('types')

	var abs = Math.abs
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
	
		for(var i = 0; i < 6; i++){
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
		for(var i = 0; i < 8; i++){
			var x = ((ax * u + bx) * u + cx) * u
			if(abs(x - t) < epsilon) return ((ay * u + by) * u + cy) * u
			if(t > x) w = u
			else v = u
			u = (v - w) *.5 + w
		}

		return ((ay * u + by) * u + cy) * u
	}

	proto.tween = function(){
		if(this.duration < 0.01) return 1.
		return this.tweenBezier(
			this.ease.x, 
			this.ease.y, 
			this.ease.z, 
			this.ease.w, 
			clamp((this.time - this.tweenStart) / this.duration, 0.0, 1.0)
		)
	}

	proto.props = {
		time: {kind:'uniform', value:0.},
		ease: {noTween:true, value:[0,0,1.0,1.0]},
		viewPosition:{kind:'uniform', type:types.mat4},
		camPosition:{kind:'uniform', type:types.mat4},
		camProjection:{kind:'uniform', type:types.mat4},
	}
})