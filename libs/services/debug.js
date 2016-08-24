exports.log = function(data){
	service.bus.postMessage({
		data:data
	})
}