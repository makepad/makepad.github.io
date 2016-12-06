var types = require('base/types')
var painter = require('services/painter')

module.exports = class Selection extends require('shaders/quad'){
	// special
	prototype(){
		this.props = {
			xp:0,
			wp:0,
			xn:0,
			wn:0,

			borderRadius:{kind:'uniform', value:4.},
			bgColor: {kind:'uniform', value:'gray'},
			gloopiness: {kind:'uniform',value:8},
			turtleClip:{kind:'uniform',value:[-50000,-50000,50000,50000]},
			visible:{kind:'uniform',noTween:1, value:1.},
			moveScroll:{kind:'uniform', noTween:1, value:1.}
		}
			
		this.verbs = {
			fast:function(x,y,w,h,xp,wp,xn,wn){
				this.ALLOCDRAW(null,1)
				this.WRITEPROPS({
					x:x + this.turtle.$xAbs,
					y:y+ this.turtle.$yAbs,
					w:w,
					h:h,
					xp:xp,
					wp:wp,
					xn:xn,
					wn:wn
				})
				return this.PROPLEN() - 1
			}
		}
	}

	pixel(){$
		this.viewport()

		this.box(0., 0., this.w, this.h, this.borderRadius)
		if(this.wp > 0.){
			this.box(this.xp - this.x, -this.h*0.9, this.wp, this.h, this.borderRadius)
			this.gloop(this.gloopiness)
		}
		if(this.wn > 0.){
			this.box(this.xn - this.x, +this.h*0.9, this.wn, this.h, this.borderRadius)
			this.gloop(this.gloopiness)
		}
		return this.fill(this.bgColor)
	}
}