module.exports = require('shaders/quadshader').extend(function FastMarkerShader(proto){

	var types = require('types')
	var painter = require('painter')

	// special
	proto.props = {
		x1:0.,
		x2:0.,
		x3:0.,
		x4:0.,
		level:0.,
		borderRadius:4.,
		borderWidth:1.,
		bgColor: {pack:'float12', value:'gray'},
		opColor: {pack:'float12', value:'gray'},
		borderColor: {pack:'float12', value:'gray'},

		noBounds: {kind:'uniform',value:0},
		turtleClip:{kind:'uniform',value:[-50000,-50000,50000,50000]},
		visible:{kind:'uniform',noTween:1, value:1.},
		tween: {kind:'uniform', value:0.},
		ease: {kind:'uniform', value:[0,0,1.0,1.0]},
		duration: {kind:'uniform', value:0.},
		delay: {styleLevel:1, value:0.},
		lockScroll:{kind:'uniform', noTween:1, value:1.}
	}

	proto.vertexStyle = function(){$
		this.y += this.level*2.
		this.h -= this.level*4.
		this.x = this.x1 //- 2.
		this.x2 -= this.x1
		this.x3 -= this.x1
		this.w = this.x4 - this.x1// + 4.
		this.opColor = this.bgColor*1.2
		this.borderColor = this.bgColor
		this.opMargin = 3.
	}

	proto.pixel = function(){$
		var p = this.mesh.xy * vec2(this.w, this.h)
		var antialias = 1./length(vec2(length(dFdx(p.x)), length(dFdy(p.y))))
		
		// background field
		var bBg = this.borderRadius
		var hBg = vec2(.5*this.w, .5*this.h)
		var fBg = length(max(abs(p-hBg) - (hBg - vec2(bBg)), 0.)) - bBg

		// operator field
		var bHan = this.borderRadius
		var pHan = p - vec2(this.x2+this.opMargin, this.opMargin)
		var hHan = vec2(.5*(this.x3-this.x2- this.opMargin*2.), .5*(this.h - this.opMargin*2.))
		var fHan = length(max(abs(pHan-hHan) - (hHan - vec2(bHan)), 0.)) - bHan

		// mix the fields
		var finalBg = mix(this.borderColor, vec4(this.borderColor.rgb, 0.), clamp(fBg*antialias+1.,0.,1.))
		var finalBorder = mix(this.bgColor, finalBg, clamp((fBg+this.borderWidth) * antialias + 1., 0., 1.))
		return mix(this.opColor, finalBorder, clamp(fHan * antialias + 1., 0., 1.))
	}

	proto.toolMacros = {
		stop:function(o, x1, x2, x3, x4, h){
			this.$PROPVARDEF()
			this.$PROP(o,'x1') = x1
			this.$PROP(o,'x2') = x2
			this.$PROP(o,'x3') = x3
			this.$PROP(o,'x4') = x4
			this.$PROP(o,'h') = h
		},
		start:function(y, level, style){
			this.$ALLOCDRAW(1, true)
			this.$WRITEPROPS({
				$fastWrite:true,
				y:y,
				level:level,
				borderRadius:style.borderRadius,
				bgColor:style.bgColor,
				opColor:style.opColor,
				borderColor:style.borderColor,
				borderWidth:style.borderWidth,
			})
			return this.$PROPLEN() - 1
		}
	}
})