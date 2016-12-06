module.exports = class Slider extends require('base/stamp'){

	prototype(){
		this.props = {
			vertical:false,
			value:{this:'view',value:0},
			knobSize:20,
			range:[0,1],
			step:0,
			onValue:undefined,
			onValueStamp:undefined
		}

		this.dragOffset = -1
		this.inPlace = 1
		this.tools = {
			Bg:require('shaders/quad').extend({
				color:'gray',
				padding:5
			}),
			Knob:require('shaders/quad').extend({
				color:'white',
				vertical:{noTween:1,value:0.},
				pos:{noTween:1,value:0.},
				poff:{noTween:1,value:-1},
				psize:{noTween:1,value:0.},
				step:{noTween:1,value:0.},
				range:{noTween:1,value:[0.,1.]},
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
			})
		}

		this.styles = {
			default:{
				Knob:{
					color:'#a'
				}
			},
			over:{
				Knob:{
					color:'#c'
				}
			},
			sliding:{
				Knob:{
					color:'#f'
				}
			}
		}
	}
	
	mapValue(pos){
		var v = clamp(pos,0,1) * (this.range[1]-this.range[0])+this.range[0]
		if(this.step){
			v = floor(v / this.step+.5) * this.step
		}
		return v
	}

	onFingerDown(e){
		// check where we clicked
		var pos = (this.value - this.range[0])/(this.range[1]-this.range[0])
		if(this.vertical){
			var yp = this.dragSize * pos + this.innerPadding[0]
			if(e.y>yp && e.y < yp+this.knobSize){
				this.dragOffset = e.y - yp + this.innerPadding[0]
			}
			else {
				// compute pos
				this.dragOffset = 0.5*this.knobSize + this.innerPadding[0]
				this.value = this.mapValue((e.y -  this.dragOffset)/this.dragSize)
				if(this.onValueStamp) this.onValueStamp({value:this.value})
				//if(this.onValue) this.onValue.call(this.view, this.value)
			}
		}
		else{
			var xp = this.dragSize * pos + this.innerPadding[3]

			if(e.x>xp && e.x < xp+this.knobSize){
				this.dragOffset = e.x - xp + this.innerPadding[3]
			}
			else {
				// compute pos
				this.dragOffset = 0.5*this.knobSize + this.innerPadding[3]
				this.value = this.mapValue((e.x - this.dragOffset)/this.dragSize)
				if(this.onValueStamp) this.onValueStamp({value:this.value})
				//if(this.onValue) this.onValue.call(this.view, this.value)
			}
		}
		this.state = this.styles.sliding
	}

	onFingerMove(e){
		//console.log(this.view.name)
		if(this.vertical){
			this.value = this.mapValue((e.y - this.dragOffset)/this.dragSize)
		}
		else{
			this.value = this.mapValue((e.x - this.dragOffset)/this.dragSize)
		}
		if(this.onValueStamp) this.onValueStamp({value:this.value})
		//if(this.onValue) this.onValue.call(this.view, this.value)
	}

	onFingerOver(){
		this.state = this.styles.over
	}

	onFingerOut(){
		this.state = this.styles.default
	}

	onFingerUp(e){
		this.dragOffset = -1
		this.state = e.samePick?this.styles.over:this.styles.default
	}

	onDraw(){
		this.beginBg(this.wrap())
		this.innerPadding = this.turtle.padding
		var pos = (this.value - this.range[0])/(this.range[1]-this.range[0])
		if(this.vertical){
			this.dragSize = this.turtle._h - this.knobSize
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
	}
}