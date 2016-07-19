var service = require('services/fingers')

var Fingers = require('class').extend(function Fingers(proto){
	require('events')(proto)
})

var fingers = module.exports = new Fingers()

fingers.setCursor = function(cursor){
	bus.postMessage({
		fn:'setCursor',
		cursor:cursor
	})
}

var bus = service.bus

bus.onmessage = function(msg){
	if(fingers[msg.fn]) fingers[msg.fn](msg)
}