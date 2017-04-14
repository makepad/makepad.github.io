new require('styles/dark')
module.exports = class extends require('base/app'){

	prototype(){
		this.tools = {
			Button: require('views/button').extend({
			}),
			Bg:require('shaders/bg').extend({
			})
		}
	}

	constructor(){
		super()
	}

	onDraw(){

		this.drawBg({
			borderRadius:8,
			color:'red',
			w:100,
			h:100
		})
	
		for(var i = 0; i < 500;i++){
			this.drawButton({
				id:i,
				heavy:i%2?true:false,
				text:''+i,
				icon:'search'
			})
		}
		this.drawBg({
			borderRadius:8,
			color:'red',
			align:[0,1],
			w:100,
			h:100
		})
	}
}
