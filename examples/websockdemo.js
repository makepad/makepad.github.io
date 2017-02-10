new require('styles/dark')
let socket = require('services/socket')

module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		this.props = {
			winner:-1,
			page  :0
		}
	}
	
	constructor() {
		super()
		socket.postMessage({msg:"CONNECT"})
		socket.onMessage = msg=>{
			_=msg
			this.msg = JSON.stringify(msg)
			this.redraw()
		}
	}
	
	
	onDraw() {
		this.drawText({
			text:'Recv:' + this.msg
		})
	}
}