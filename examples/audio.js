var audio = require('services/audio')
var wav = require('parsers/wav')
var painter = require('services/painter')

module.exports = class extends require('base/drawapp'){
	
	prototype() {
		
		this.props = {
			zoom: 1000.,
			selStart: 0,
			selEnd: 0,
			zoomRange: [2, 1000],
			zoomScroll: 0,
		}
		this.tools = {
			Rect: {
				color: '#07c7'
			},
			Quad: {color: 'red'},
			Grid: require('tools/grid')
		}
	}
	
	constructor() {
		super()
		
		audio.reset()
		
		var sample1 = wav.parse(require('./sample1.wav'), true)
		
		this.playFlow = new audio.Flow({
			gain1: {
				to: 'output',
				gain: 0.6
			},
			buffer1: {
				to: 'gain1',
				rate: 44100,
				loop: true,
				start: 0
			}
		})
		
		this.playFlow.start({
			buffer1: {
				data: sample1.data
			}
		})
		
	// alright. so.
	// the sequencer API!
	// what is it going to be like.
	
	}
	
	onDraw() {
		
	}
}