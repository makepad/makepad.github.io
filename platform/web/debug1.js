module.exports = class extends require('/platform/service'){

	constructor(...args){
		super(...args)
		this.name = 'debug1'
		this.args.test = '1'
	}

	// service log
	user_log(msg){
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
}