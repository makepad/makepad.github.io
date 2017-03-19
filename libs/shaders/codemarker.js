module.exports = class CodeMarker extends require('shaders/quad'){

	prototype(){
		// special
		this.props = {
			x1:0.,
			x2:0.,
			x3:0.,
			x4:0.
		}
		this.states = {
			default:{
				to:{opacity:1.},
				duration:0.
			},
			create:{
				0:{opacity:0},
				99:{opacity:0},
				to:{opacity:1},
				duration:0.5
			}
		}
	}

	vertexPre(){$
		this.x2 -= 2. 
		this.x3 += 2. 
		this.x = this.x1
		this.w = this.x4 - this.x1
		this.h += 2.
	}

	pixel(){$
		var bg = '#09000000' // very faint read 
		var pos = this.viewport()
		this.result = bg
		this.pos.x = mod(this.pos.x,8.)

		// dashed line
		this.moveTo(0., this.h - 1.)
		this.lineTo(3., this.h - 1.)
		this.stroke('#c00',1.)
		this.pos = pos

		// end of the line cut out
		if(this.pos.x < this.h*0.2) this.result = bg
		if(this.pos.x > this.x2) this.result = bg

		// starting circle
		this.circle(this.h*0.25,this.h*0.75-2.,this.h*.2)
		this.fill('#c00')

		// arrow
		var start = this.x2 + this.h*0.2
		var end = this.x3 - this.h*0.2
		this.moveTo(start, this.h - 1.)
		this.lineTo(start+(end-start)*0.5, this.h - 2.)
		this.lineTo(end, this.h - 1.)
		this.stroke('#ccc',1.)

		this.result.rgba *= this.opacity
		return this.result
	}
}