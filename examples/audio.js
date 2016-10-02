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
				gain: 0.5
			},
			buffer1: {
				to: 'gain1',
				rate: 44100,
				speed: 1,
				loop: false,
				start: 0,
				data: sample1.data
			}
		})
		
	
	
	// we have sequenced and realtime, 2 different apis
	//audio.play(this.playFlow,['c','d','e','f'])
	// ARSD  curves for realtime
	
	}
	
	onKeyDown(e) {
		var base = 440
		function freq(n) {
			return base / 440 * pow(2, n / 12)
		}
		var factor = {
			'a': freq(1),
			'w': freq(2),
			's': freq(3),
			'e': freq(4),
			'd': freq(5),
			'f': freq(6),
			't': freq(7),
			'g': freq(8),
			'y': freq(9),
			'h': freq(10),
			'u': freq(11),
			'j': freq(12),
			'k': freq(13),
			'o': freq(14),
			'l': freq(15),
			'p': freq(16),
			'semiColon': freq(17),
			'accent': freq(18),
		}
		this.playFlow.start({
			buffer1: {
				speed: factor[e.name]
			}
		})
		console.log(e)
	}
	
	onDraw() {
		
	}
}