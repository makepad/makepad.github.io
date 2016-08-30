exports.log = function(data){
	service.bus.postMessage({
		fn:'log',
		data:data
	})
}