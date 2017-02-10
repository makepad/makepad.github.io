new require('styles/dark')
module.exports = class extends require('base/drawapp'){
	prototype() {
		this.tools = {
			Slider:require('stamps/slider').extend({
			})
		}
		
	}
	onSlide(sld) {
		console.error(1)
		_=[sld.id, sld.value]
	}
	onDraw() {
		//_='HELLO WORLD ' + this.time
		var t = 0.5
		for(let i = 0;i < 4;i++){
			t = clamp(t + (1 - random() * 2) * 0.1, 0, 1)
			
			this.drawSlider({
				w       :40,
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