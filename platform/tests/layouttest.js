new require('styles/dark')
var audio = require('services/audio')
module.exports = class extends require('base/app'){

	prototype(){
		this.tools = {
			Button: require('stamps/button').extend({
			}),
			Bg:require('shaders/bg').extend({

			})
		}
	}

	constructor(){
		super()
		
		this.recFlow = new audio.Flow({ 
			gain1: { 
				to: 'output', 
				gain:1.0, 
			}, 
			input1: {
				to: 'gain1',
				device: 'Mic1' 
			},
			input2: {
				to: 'gain1',
				device: 'Mic2' 
			},
			input3: {
				to: 'gain1',
				device: 'Mic3' 
			} 
		}) 
		this.recFlow.start() 
		
	}

	onDraw(){
		this.drawBg({
			debug:1,
			borderRadius:8,
			color:'red',
			w:100,
			h:100
		})
		console.log(this.drawBg.toString())
		for(var i=0;i<1000;i++)
		this.drawButton({
			id:i,
			icon:'search'
		})
	}
}
