module.exports = require('base/drawapp').extend({ 
	tools: { 
		Line: { 
			lineWidth: 2 
		}, 
		Slider: require('tools/slider').extend({ 
			inPlace: 0 
		}) 
	}, 
	onDraw: function() { 
		var v = this.drawSlider({ 
			w: 200, 
			h: 30, 
			range: [0, 1], 
		}) 
		this.drawLine({sx: 0, sy: 0}) 
		for(let f = 0; f < 490; f++) { 
			var s = 0 
			for(let i = 0; i < 100; i++) { 
				var f1 = sin(i / 1000 * PI * 2 * 400.) 
				var f2 = sin(i / 1000 * PI * 2 * f) 
				s += f1 + f2 
			} 
			this.drawLine({ 
				x: f * 1, 
				y: s * 1 + 200 
			}) 
		} 
	} 
})