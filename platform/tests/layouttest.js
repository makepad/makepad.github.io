new require('styles/dark')
var audio = require('services/audio')
module.exports = class extends require('base/app'){

	prototype(){
		this.tools = {
			Button: require('stamps/button').extend({
			}),
		}
	}

	constructor(){
		super()
		/*		
		this.recFlow = new audio.Flow({ 
			gain1: { 
				to: 'output', 
				gain:28.0, 
			}, 
			input1: {
				to: 'gain1',
				device: 'Microphone' 
			} 
		}) 
		this.recFlow.start() 
		*/
	}

	onDraw(){
		for(var i=0;i<1000;i++)
		this.drawButton({id:i,icon:'search'})
	}
}
