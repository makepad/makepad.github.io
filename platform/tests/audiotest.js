new require('styles/dark')
var audio = require('services/audio')

module.exports = class extends require('base/app'){

	prototype(){
		this.tools = {
			Test:audio.AudioNode.extend({
				init(){
					//var x = 1.
				},
				start(t = 0.){ // type inferred entirely
					return t+1.+1.
				},
				stop(t = 0.){
				}
			})
		}
	}

	constructor(){
		super()
		// lets start our testnode
		this.startTest({
			id:0
		})
	}

	onDraw(){
	}
}