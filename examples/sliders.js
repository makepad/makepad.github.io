new require('styles/dark')
module.exports = class extends require('base/drawapp'){
	prototype() {
		
		this.tools = {
		}
		
		this.tools = {
			Slider:require('views/slider').extend({
				Slider:{
					method   :function(v) {
						return 'white'
						//return mix('#0090fbff', '#ff0b00ff', abs(sin(this.mesh.y * 18 + v + this.time)))
					},
					pixel    :function() {
						this.viewport()
						this.box(0., 0., this.w, this.h, 1.)
						this.fill(this.bgColor)
						if(this.vertical < 0.5) {
							this.box(this.slide, 0., this.knobSize, this.h, 1.)
							this.fill(this.knobColor)
						}
						else {
							this.box(0., this.slide, this.w, this.knobSize, 1.)
							this.fill(this.method(this.slide / this.h))
						}
						return this.result
					},
					knobColor:'green'
					
				}
			})
		}
		
	}
	onSlide(sld) {
		_=[sld.id, sld.value]
	}
	onDraw() {
		//_='HELLO WORLD ' + this.time
		var t = 0.5
		for(let i = 0;i < 4;i++){
			//t = clamp(t + (1 - random() * 2) * 0.1, 0, 1)
			
			this.drawSlider({
				w       :49,
				margin  :0,
				knobSize:50,
				h       :250,
				vertical:true,
				value   :t,
				id      :i,
				onSlide :this.onSlide
			})
		}
		//this.redraw(true)
		
	}
}