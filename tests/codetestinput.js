module.exports = require('apps/drawapp').extend({
	require,//here
	require,
	onDraw:function(){
		//1
		this.drawRect({x:1}) //2
		//3
	}
})