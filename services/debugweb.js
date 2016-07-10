var div

exports.log = function(data){
	service.bus.onmessage({data:data})
}

service.bus.onmessage = function(msg){
	if(!div){
		div = document.createElement('div')
		div.style.position = 'absolute'
		div.style.left = 10
		div.style.top = 10
		document.body.appendChild(div)
	}
	// we should log this to the html screen
	div.innerHTML += JSON.stringify(msg.data)+'</br>'
}