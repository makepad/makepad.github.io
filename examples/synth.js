new require('styles/dark')
var audio = require('services/audio')
module.exports = class extends require('base/drawapp'){
	prototype() {
		this.tools = {
			audio.Node.extend({
				play(){
					1+2
				}
			})
		}
	}
	
	constructor() {
		/*
		// how do we visually edit this audioflow
		var trk = audio.Node.extend({
			snd1  :audio.Node.extend({
				data:require('examples/audio/bicycle.wav'),
				play(...args){
					for(var arg of args){
						// lets start a parallel note
						var node = context.createBufferSource(data)
						node.playbackRate = 440/arg
						node.connect(context)
						node.start(0)
					}
				}
			}),
			play    :function() {
				// we generate the entire track
				// wire up our graph? (or atleast default ptrs)
				snd1.out = context
				loop(i=>{
					snd1.play(C,E,G)
					sleep(1)
					snd1.play(G,E,C)
					sleep(1)
					return 4 - i
				})
			}
		})*/

		// we can also use playBla and use it as tools

	}
	onDraw() {
	}
}

