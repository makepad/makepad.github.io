new require('styles/dark')
module.exports = class extends require('base/app'){

	prototype(){
		this.tools = {
			Button: require('views/button').extend({
			}),
			Bg:require('shaders/bg').extend({
			}),
			Fill:require('shaders/bg').extend({
			})
		}
	}

	constructor(){
		super()
	}

	onDraw(){
		// yeah our scroll area isnt filled. we need to fill it
		this.beginBg({
			w:'100%',
			h:'100%'
		})

		
		this.drawBg({
			borderRadius:8,
			color:'red',
			align:[1,0],
			margin:[0,0,0,5],
			w:100,
			h:100
		})

		this.drawButton({
			id:'i1',
			heavy:false,
			text:'HELLO',
		})
		
		this.drawButton({
			id:'i2',
			heavy:false,
			text:'HELLO',
		})
		//this.turtle._x = 100
		this.drawFill({
			debug:1,
			borderRadius:8,
			color:'green',
			w:'100#',
			h:100
		})
		/*
		for(var i = 0; i < 5;i++){
			this.drawButton({
				id:i,
				heavy:i%2?true:false,
				text:''+i,
				icon:'search'
			})
		}
		*/
		this.endBg()
	}
}
