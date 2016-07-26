var service = require('services/audio')
var bus = service.bus

var channels = []

for(var i = 0; i < service.args.numChannels; i++){
	channels.push(new Float32Array(service.args.bufSize))
}

bus.onMessage = function(msg){
	if(msg.fn === 'onOutput'){
		audio.onOutput(channels)
		bus.postMessage({
			fn:'nextOutput',
			channels:channels
		})
	}
}

var Audio = require('class').extend({
	mixin: require('events')
})

var audio = module.exports = new Audio()
