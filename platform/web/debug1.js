module.exports = require('/platform/service').extend(function debug1(proto){

	proto.onConstruct = function(){
		this.args.test = '1'
	}

	// service log
	proto.user_log = function(msg){
		var div = this.div
		if(!div){
			this.div = div = document.createElement('div')
			div.style.position = 'absolute'
			div.style.left = 10
			div.style.top = 10
			document.body.appendChild(div)
		}
		// we should log this to the html screen
		div.innerHTML += JSON.stringify(msg.data)+'</br>'
	}
})