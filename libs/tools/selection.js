var types = require('base/types')
var painter = require('services/painter')

module.exports = class Selection extends require('tools/quad'){
	// special
	prototype(){
		this.props = {
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
			moveScroll:{kind:'uniform', noTween:1, value:1.}
		}
			
		this.verbs = {
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
	}

	pixel(){$
		var p = this.mesh.xy * vec2(this.w, this.h)
		var aa = this.antialias(p)

		var bg = this.boxDistance(p, 0., 0., this.w, this.h, this.borderRadius)
		var up = this.wp>0.?this.boxDistance(p, this.xp - this.x, -this.h*0.9, this.wp, this.h, this.borderRadius):100.
		var dn = this.wn>0.?this.boxDistance(p, this.xn - this.x, +this.h*0.9, this.wn, this.h, this.borderRadius):100.
		var sum = this.blendDistance(this.blendDistance(bg, up, this.gloop), dn, this.gloop)
		
		return this.colorBorderDistance(aa, sum, this.borderWidth, this.bgColor, this.borderColor)
	}
}