
bus.onMessage = function(msg){
	if(!dropFiles[msg.fn])console.log('Cannot find '+msg.fn)
	dropFiles[msg.fn](msg)
}

dropFiles.ondrop = function(){}
