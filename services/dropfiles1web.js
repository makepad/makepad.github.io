var userMessage = {
}

bus.onmessage = function(msg){
	if(!userMessage[msg.fn]) console.error('cant find '+msg.fn)
	userMessage[msg.fn](msg)
}

function dragenter(e) {
	e.stopPropagation()
	e.preventDefault()
}

function dragover(e) {
	e.stopPropagation()
	e.preventDefault()
}

var drop = function(e) {
	e.stopPropagation()
	e.preventDefault()

	var dt = e.dataTransfer
	var files = dt.files
	
	for(var i = 0; i < files.length; i++){
		var file = files[i]
		var reader = new FileReader()
		reader.onload = function(e){
			bus.postMessage({
				fn:'ondrop',
				filename:file.name,
				filedata:e.target.result
			})
		}.
		reader.readAsBinaryString(file)
	}
}

// make canvas a dropzone
canvas.addEventListener("dragenter", dragenter, false)
canvas.addEventListener("dragover", dragover, false)
canvas.addEventListener("drop", drop, false)
