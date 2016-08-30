var service = require('$fingers1')

var Fingers = require('base/class').extend(function Fingers(proto){
	require('base/events')(proto)
})

var fingers = module.exports = new Fingers()

fingers.setCursor = function(cursor){
	bus.postMessage({
		fn:'setCursor',
		cursor:cursor
	})
}

service.onMessage = function(msg){
	if(fingers[msg.fn]) fingers[msg.fn](msg)
}