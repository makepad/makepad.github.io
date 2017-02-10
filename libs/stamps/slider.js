module.exports = class Slider extends require('base/stamp'){
	
	prototype() {
		
		this.props = {
			vertical    :false,
			value       :0,
			knobSize    :20,
			range       :[0, 1],
			step        :0,
			onValue     :undefined,
			onValueStamp:undefined
		}
		//this.wrapped = false
		this.dragOffset = -1
		this.tools = {
			Slider:require('shaders/quad').extend({
				vertical   :0,
				value      :0,
				step       :0,
				range      :[0., 1.],
				bgColor    :'gray',
				knobColor  :'white',
				knobSize   :20,
				vertexStyle:function() {$
					var pos = vec2()
					var rw = (this.range.y - this.range.x)
					var rs = 0., v = 0.
					if(this.vertical < 0.5) {
						rs = this.w - this.knobSize
					}
					else {
						rs = this.h - this.knobSize
					}
					
					if(this.isFingerDown(pos) > 0) {
						this.slide = 100.
						/*
						if(this.vertical<0.5){
						v = clamp((pos.x - this.x) / rs,0.,1.)*rw+this.range.x
						}
						else{
						v = clamp((pos.y - this.y) / rs,0.,1.)*rw+this.range.x
						}
						if(this.step>0.) v = floor(v/this.step+.5)*this.step
						this.slide = ((v-this.range.x)/rw)*rs
						*/
					}
					else this.slide = ((this.value - this.range.x) / rw) * rs
				},
				pixel      :function() {$
					this.viewport()
					this.box(0., 0., this.w, this.h, 1.)
					this.fill(this.bgColor)
					if(this.vertical < 0.5) {
						this.box(0., 0., 10., 10., 1.)
						this.fill(this.knobColor)
					}
					else {
						this.box(0., this.slide, this.w, this.knobSize, 1.)
						//this.box(0.,0.,10.,10.,1.)
						this.fill(this.knobColor)
					}
					return this.result
				}
			})
			/*
			Knob:require('shaders/quad').extend({
			color:'white',
			vertical:0,
			pos:0,
			poff:-1,
			psize:0,
			step:0,
			range:[0.,1.],
			vertexPre:function(){$
			var pos = vec2()
			if(this.isFingerDown(pos) > 0 && this.poff > 0.){
			var rw = (this.range.y-this.range.x)
			var rs = 0., v=0.
			if(this.vertical<0.5){
			rs = (this.psize - this.w)
			v = clamp((pos.x - this.x - this.poff) / rs,0.,1.)*rw+this.range.x
			}
			else{
			rs = (this.psize - this.h)
			v = clamp((pos.y - this.y - this.poff) / rs,0.,1.)*rw+this.range.x
			}
			if(this.step>0.) v = floor(v/this.step+.5)*this.step
			this.pos= ((v-this.range.x)/rw)*rs
			}
			if(this.vertical < 0.5){
			this.x += this.pos
			}
			else{
			this.y += this.pos
			}
			}
			})*/
		}
		
	}
	
	mapValue(pos) {
		var v = clamp(pos, 0, 1) * (this.range[1] - this.range[0]) + this.range[0]
		if(this.step) {
			v = floor(v / this.step + .5) * this.step
		}
		return v
	}
	
	onFingerDown(e) {
		_=e
		return
		// check where we clicked
		var pos = (this.value - this.range[0]) / (this.range[1] - this.range[0])
		if(this.vertical) {
			var yp = this.dragSize * pos + this.innerPadding[0]
			if(e.y > yp && e.y < yp + this.knobSize) {
				this.dragOffset = e.y - yp + this.innerPadding[0]
			}
			else {
				// compute pos
				this.dragOffset = 0.5 * this.knobSize + this.innerPadding[0]
				this.value = this.mapValue((e.y - this.dragOffset) / this.dragSize)
				//if(this.onValueStamp) this.onValueStamp({value:this.value})
				if(this.onValue) this.onValue.call(this.view, this) //this.value)
			}
		}
		else {
			var xp = this.dragSize * pos + this.innerPadding[3]
			
			if(e.x > xp && e.x < xp + this.knobSize) {
				this.dragOffset = e.x - xp + this.innerPadding[3]
			}
			else {
				// compute pos
				this.dragOffset = 0.5 * this.knobSize + this.innerPadding[3]
				this.value = this.mapValue((e.x - this.dragOffset) / this.dragSize)
				//if(this.onValueStamp) this.onValueStamp({value:this.value})
				if(this.onValue) this.onValue.call(this.view, this)
			}
		}
		this.state = this.styles.sliding
	}
	
	onFingerMove(e) {
		return
		
		//console.log(this.view.name)
		if(this.vertical) {
			this.value = this.mapValue((e.y - this.dragOffset) / this.dragSize)
		}
		else {
			this.value = this.mapValue((e.x - this.dragOffset) / this.dragSize)
		}
		if(this.onValueStamp) this.onValueStamp({value:this.value})
		//if(this.onValue) this.onValue.call(this.view, this.value)
	}
	
	onFingerOver() {
	}
	
	onFingerOut() {
	}
	
	onFingerUp(e) {
	}
	
	onDraw() {
		//var pos = (this.value - this.range[0])/(this.range[1]-this.range[0])
		//this.dragSize = this.turtle.height
		this.drawSlider({
			w       :'100%',
			h       :'100%',
			knobSize:this.knobSize,
			vertical:this.vertical,
			range   :this.range,
			step    :this.step,
			value   :this.value
		})
		/*
		if(this.vertical){
		this.dragSize = this.turtle._h - this.knobSize
		console.log(this.turtle.dump())
		this.drawKnob({
		vertical:this.vertical,
		w:this.turtle._w,
		h:this.knobSize,
		step:this.step,
		poff:this.dragOffset>=0?this.dragOffset-this.innerPadding[0]:-1,
		psize: this.turtle._h,
		pos:this.dragSize * pos
		})
		}
		else{
		this.dragSize = this.turtle._w - this.knobSize
		this.drawKnob({
		vertical:this.vertical,
		w:this.knobSize,
		h:this.turtle._h,
		step:this.step,
		range:this.range,
		poff:this.dragOffset>=0?this.dragOffset-this.innerPadding[3]:-1,
		psize: this.turtle._w,
		pos:this.dragSize * pos
		})
		}
		this.endBg()
		*/
	}
}