new require('styles/dark')
module.exports = class extends require('base/drawapp'){
	prototype() {
		this.tools = {
			Button:require('stamps/button').extend({
				Text:{
					fontSize:10,
					//color   :'red'
				}
			})
		}
		
	}
	constructor() {
		super()
		for(var i = 0;i < 100;i++){
			//	_={i}
		}
	}
	
	onFingerHover(e) {
		_=e
	}
	onDraw() {
		//_='HELLO WORLD ' + this.time
		for(let i = 0;i < 500;i++){
			this.drawButton({
				id     :i,
				text   :'Test' + i,
				onClick:function(btn) {
					_=btn
				}
			})
			if(i && !(i % 8)) this.turtle.lineBreak()
		}
		//this.redraw(true)
		
	}
}