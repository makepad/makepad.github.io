
var App = require('app').extend({
	tools:{
		Rect:require('shaders/rectshader').extend({
			shadowOffset:[10,10]
		})
	},
	onDraw:function(){

		this.beginRect({
			x:10,
			y:10,
			w:100,
			h:100
		})
		this.drawRect({
			x:'10',y:'10',
			color:'red',
			w:40,h:40
		})
		this.endRect()
	}
})()