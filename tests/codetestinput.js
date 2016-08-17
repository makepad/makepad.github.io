module.exports = require('apps/drawapp').extend({
	onDraw:function(){
		this.drawRect({x:1,y:1,w:100,h:100})
	}
})