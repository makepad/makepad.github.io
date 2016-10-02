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
			'a': freq(0), //b0 alias
			'z': freq(1), //c1
			's': freq(2), //c#1
			'x': freq(3), //d1
			'd': freq(4), //d#1
			'c': freq(5), //e1
			'f': freq(5), //e1 alias
			'v': freq(6), //f1
			'g': freq(7), //f#1
			'b': freq(8), //g1
			'h': freq(9), //g#1
			'n': freq(10), //a1
			'j': freq(11), //a#1
			'm': freq(12), //b
			'k': freq(12), //b alias
			'comma': freq(13), //c2
			'l': freq(14), //c#2
			'period': freq(15), //d2
			'semiColon': freq(16), //d#2
			'slash': freq(17), //e2
			'singleQuote': freq(18), //f2
			'num1': freq(12), //b2 alias,
			'q': freq(13), //c2
			'num2': freq(14), //c#2
			'w': freq(15), //d2
			'num3': freq(16), //d#2
			'e': freq(17), //e2
			'num4': freq(17), //e2
			'r': freq(18), //f2
			'num5': freq(19), //f#2
			't': freq(20), //g2
			'num6': freq(21), //g#2
			'y': freq(22), //a2
			'num7': freq(23), //a#2
			'u': freq(24), //b2
			'num8': freq(24), //b2
			'i': freq(25), //c3
			'num9': freq(26), //c#3
			'o': freq(27), //d3
			'num0': freq(28), //d#3
			'p': freq(29), //e3
		}
		var fac = factor[e.name]
		if(!fac) return
		this.playFlow.play({
			buffer1: {
				speed: fac
			}
		})
		
	}
	
	onDraw() {
		
	}
}