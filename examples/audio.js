var audio = require('services/audio')
var wav = require('parsers/wav')
var painter = require('services/painter')

module.exports = class extends require('base/drawapp'){
	
	prototype() {
		this.props = {}
		this.tools = {
			Button: require('tools/button').extend({
				onDownStamp: function() {
					this.view.playNote(this.index)
				}
			}),
		}
	}
	
	constructor() {
		super()
		
		audio.reset()
		
		var sample1 = wav.parse(require('./sample1.wav'), true)
		var sample2 = wav.parse(require('./sample2.wav'), true)
		
		this.playFlow = new audio.Flow({
			gain1: {
				to: 'output',
				gain: 0.5
			},
			gain2: {
				to: 'output',
				gain: 0.5
			},
			buffer1: {
				to: 'gain1',
				rate: 44100,
				speed: 1,
				loop: false,
				start: 0,
				data: sample1.data
			},
			buffer2: {
				to: 'gain2',
				rate: 44100,
				speed: 1,
				loop: false,
				start: 0,
				data: sample2.data
			}
		})
	}
	playNote(index, sample) {
		
		var fac = pow(2, index / 12)
		//var just=[16/9*0.5,243/128*0.5,1,256/243,9/8,32/27,81/64,4/3,729/512,3/2,128/81,27/16]
		//var fac=just[(index-1)%12]*pow(2,floor((index-1)/12))
		if(!fac) return
		var sam1 = sample
		var sam2 = 1 - sam1
		this.playFlow.play({
			gain1: {
				gain: sam1 * .5
			},
			gain2: {
				gain: sam2
			},
			buffer1: {
				playbackRate: fac * 1.15 * 0.5
			},
			buffer2: {
				playbackRate: fac * 2
			}
		})
	}
	onKeyDown(e) {
		var map = audio.keyboardNoteMap[e.name]
		if(map) this.playNote(map[0], map[1])
	}
	
	onDraw() {
		var xp = 0, yp = 100
		function click() {
			console.log(this.text)
		}
		this.turtle.wx += 15
		this.drawButton({text: 'C#', index: 2})
		this.drawButton({text: 'D#', index: 4})
		this.turtle.wx += 32
		this.drawButton({text: 'F#', index: 7})
		this.drawButton({text: 'G#', index: 9})
		this.drawButton({text: 'A#', index: 11})
		this.turtle.lineBreak()
		this.drawButton({text: 'C1', index: 1})
		this.drawButton({text: 'D1', index: 3})
		this.drawButton({text: 'E1', index: 5})
		this.drawButton({text: 'F1', index: 6})
		this.drawButton({text: 'G1', index: 8})
		this.drawButton({text: 'A1', index: 10})
		this.drawButton({text: 'B1', index: 12})
		this.turtle.lineBreak()
	}
}