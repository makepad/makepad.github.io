new require('styles/dark')
module.exports = class extends require('base/drawapp'){
	prototype() {
		this.tools = {
			Slider:require('stamps/slider').extend({
			})
		}
		
	}
	
	onDraw() {
		//_='HELLO WORLD ' + this.time
		var t = 0.5
		for(let i = 0;i < 4000;i++){
			t = clamp(t + (1 - random() * 2) * 0.1, 0, 1)
			
			this.drawSlider({
				w       :4,
				margin  :0,
				knobSize:20,
				h       :100,
				vertical:true,
				value   :t,
				id      :i,
			})
		}
		//this.redraw(true)
		
	}
}