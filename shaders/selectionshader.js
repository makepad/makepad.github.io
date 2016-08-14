module.exports = require('shaders/quadshader').extend(function(proto){

	var types = require('types')
	var painter = require('painter')

	// special
	proto.props = {
		xp:0,
		wp:0,
		xn:0,
		wn:0,

		borderRadius:{kind:'uniform', value:4.},
		borderWidth:{kind:'uniform', value:1.},
		bgColor: {kind:'uniform', value:'gray'},
		borderColor: {kind:'uniform', value:'gray'},

		fieldPush: {kind:'uniform',value:0},
		gloop: {kind:'uniform',value:8},

		noBounds: {kind:'uniform',value:0},
		turtleClip:{kind:'uniform',value:[-50000,-50000,50000,50000]},
		visible:{kind:'uniform',noTween:1, value:1.},
		tween: {kind:'uniform', value:0.},
		ease: {kind:'uniform', value:[0,0,1.0,1.0]},
		duration: {kind:'uniform', value:0.},
		delay: {styleLevel:1, value:0.},
		lockScroll:{kind:'uniform', noTween:1, value:1.}
	}

	proto.vertex = function(){$
		this.vertexStyle()

		if(this.visible < 0.5){
			return vec4(0.)
		}

		var shift = vec2(this.x - this.viewScroll.x*this.lockScroll, this.y - this.viewScroll.y*this.lockScroll)
		var size = vec2(this.w, this.h)

		this.mesh.xy = (clamp(
			this.mesh.xy * size + shift, 
			max(this.turtleClip.xy, this.viewClip.xy),
			min(this.turtleClip.zw, this.viewClip.zw)
		) - shift) / size

		var pos = vec4(
			this.mesh.xy * size + shift, 
			0., 
			1.
		)
		return pos * this.viewPosition * this.camPosition * this.camProjection
	}

	proto.blend = function(a, b, k){
	    var h = clamp(.5 + .5 * (b - a) / k, 0., 1.)
	    return mix(b, a, h) - k * h * (1.0 - h)
	}

	proto.pixel = function(){$
		var p = this.mesh.xy * vec2(this.w, this.h)
		var antialias = 1./length(vec2(length(dFdx(p.x)), length(dFdy(p.y))))

		// background field
		var bgSize = vec2(.5*this.w, .5*this.h)
		var bgField = length(max(abs(p-bgSize) - (bgSize - vec2(this.borderRadius)), 0.)) - this.borderRadius

		var upSize = vec2(.5*this.wp, .5*this.h)
		var upPos = vec2(this.xp-this.x,-this.h*.9)
		var upField = this.wp>0.?length(max(abs(p-upPos-upSize) - (upSize - vec2(this.borderRadius)), 0.)) - this.borderRadius:100.

		var dnSize = vec2(.5*this.wn, .5*this.h)
		var dnPos = vec2(this.xn-this.x,+this.h*.9)
		var dnField = this.wn>0.?length(max(abs(p-dnPos-dnSize) - (dnSize - vec2(this.borderRadius)), 0.)) - this.borderRadius:100.

		var field = this.blend(this.blend(bgField, upField, this.gloop),dnField,this.gloop) + this.fieldPush

		var finalBg = mix(this.borderColor, vec4(this.borderColor.rgb, 0.), clamp(field*antialias+1.,0.,1.))
		return mix(this.bgColor, finalBg, clamp((field+this.borderWidth) * antialias + 1., 0., 1.))
	}

	proto.toolMacros = {
		fast:function(x,y,w,h,xp,wp,xn,wn){
			this.$ALLOCDRAW(1, true)
			this.$WRITEPROPS({
				x:x,
				y:y,
				w:w,
				h:h,
				xp:xp,
				wp:wp,
				xn:xn,
				wn:wn
			})
			return this.$PROPLEN() - 1
		}
	}
})