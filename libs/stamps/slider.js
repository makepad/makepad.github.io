module.exports = class Slider extends require('base/stamp'){
	
	prototype() {
		let colors = module.style.colors

		this.props = {
			id          :'',
			vertical    :false,
			value       :0,
			knobSize    :20,
			range       :[0, 1],
			step        :0,
			onSlide     :undefined
		}
	
		this.states = { // animation!
			default         :{
				to       :{
					Slider  :{
						bgColor      :colors.bgTop,
						//glowSize   :0,
						knobColor:'white'//colors.textMed
					}
				},
				duration :0.8,
				interrupt:false
			},
			over            :{
				to      :{
					Slider  :{
						bgColor      :colors.bgHi,
						knobColor:'red',
						//glowSize   :1
					}
				},
				duration:0.05
			},
			down            :{
				0:{
					Slider  :{
						bgColor      :colors.bgHi,
						knobColor:'red',
						//glowSize   :1
					}
				},
				to      :{
					Slider  :{
						bgColor      :colors.bgHi,
						knobColor:'red',
						//glowSize   :1
					}
				},
				duration:0.2
			}
		}

		//this.wrapped = false
		this.dragOffset = -1
		this.tools = {
			Slider:require('shaders/quad').extend({
				vertical   :0,
				value      :0,
				step       :0,
				//glowSize   :0,
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
					
					//if(this.isFingerDown(pos) > 0) {
						//this.slide = 100.
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
					//}
					//else 
					this.slide = ((this.value - this.range.x) / rw) * rs
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
		
		var le = this.toLocal(e)
		// check where we clicked
		var pos = (this.value - this.range[0]) / (this.range[1] - this.range[0])
		if(this.vertical) {
			var yp = this.dragSize * pos// + this.innerPadding[0]
			if(le.y > yp && le.y < yp + this.knobSize) {
				this.dragOffset = le.y - yp// + this.innerPadding[0]
			}
			else {
				// compute pos
				this.dragOffset = 0.5 * this.knobSize// + this.innerPadding[0]
				this.value = this.mapValue((le.y - this.dragOffset) / this.dragSize)
				//if(this.onValueStamp) this.onValueStamp({value:this.value})
				if(this.onSlide) this.onSlide.call(this.view, this) //this.value)
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
				if(this.onSlide) this.onSlide.call(this.view, this)
			}
		}

		this.setState('down')
	}
	
	onFingerMove(e) {
		var le = this.toLocal(e)
		//console.log(this.view.name)
		if(this.vertical) {
			this.value = this.mapValue((le.y - this.dragOffset) / this.dragSize)
		}
		else {
			this.value = this.mapValue((le.x - this.dragOffset) / this.dragSize)
		}
		this.setState('down', false, {value:this.value})
		if(this.onSlide) this.onSlide.call(this.view, this)
	}
	
	onFingerOver() {
		this.setState('over')
	}
	
	onFingerOut() {
		this.setState('default')
	}
	
	onFingerUp(e) {
		this.setState(e.samePick?'over':'default')
	}
	
	onDraw() {
		//var pos = (this.value - this.range[0])/(this.range[1]-this.range[0])
		this.dragSize = this.turtle.height - this.knobSize
		this.drawSlider({
			w       :'100%',
			h       :'100%',
			knobSize:this.knobSize,
			vertical:this.vertical,
			range   :this.range,
			step    :this.step,
			value   :this.value
		})
	}
}