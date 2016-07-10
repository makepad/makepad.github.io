
bus.onmessage = function(msg){
	if(!dropfiles[msg.fn])console.log('Cannot find '+msg.fn)
	dropfiles[msg.fn](msg)
}

dropfiles.ondrop = function(){}
