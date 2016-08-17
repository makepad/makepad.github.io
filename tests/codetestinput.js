module.exports = require('apps/drawapp').extend({
	onDraw:function(){
		this.drawRect({
			x:0,
			y:0,
			w:100,
			h:100
		})
	}
})