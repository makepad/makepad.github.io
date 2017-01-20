new require('styles/dark')
module.exports = require('base/drawapp').extend({
	tools :{
		Button:require('stamps/button').extend({
			Text:{
				fontSize:20
			}
		})
	},
	onDraw:function() {
		for(let i = 0;i < 500;i++){
			this.drawButton({
				id  :i,
				text:'B' + i
			})
			if(i && !(i % 8)) this.turtle.lineBreak()
		}
	}
})