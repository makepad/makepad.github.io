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
	
	proto.pixel = function(){$
		var p = this.mesh.xy * vec2(this.w, this.h)
		var aa = this.antialias(p)

		var bg = this.boxField(p, 0., 0., this.w, this.h, this.borderRadius)
		var up = this.wp>0.?this.boxField(p, this.xp - this.x, -this.h*0.9, this.wp, this.h, this.borderRadius):100.
		var dn = this.wn>0.?this.boxField(p, this.xn - this.x, +this.h*0.9, this.wn, this.h, this.borderRadius):100.
		var sum = this.blendField(this.blendField(bg, up, this.gloop), dn, this.gloop)
		
		return this.colorBorderField(aa, sum, this.borderWidth, this.bgColor, this.borderColor)
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