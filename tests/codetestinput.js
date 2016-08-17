module.exports = require('apps/drawapp').extend({
	onDraw:function(){
		for(var x = 0; x < 10; x++)
		this.drawRect({x:1,y:1,w:100,h:100})
	}
})