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
		this.recording = []
		this.samples = 0
		
		var out = wav.parse(require('./sample1.wav'), true)
		this.recording.push(out.data)
		this.samples = out.data[0].length
		
		this.playFlow = new audio.Flow({
			buffer1: {
				to: 'output',
				rate: 44100,
				loop: true,
				start: 0
			}
		})
		
	}
	
	onDraw() {
		
	}
}