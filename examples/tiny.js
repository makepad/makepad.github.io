new require('styles/dark')

var jpg = require('parsers/jpg')
var data = require('/examples/jpeg1.jpg')
console.log(jpg)
jpg.decode(data)

module.exports = class extends require('base/drawapp'){ //top
	prototype() {
		this.tools = {
			Quad:{
				pixel:function() {$
					return 'red'
				}
			}
		}
	}
	
	constructor(...args) {
		super(...args)
		console.log("HERE")
	}
	
	onDraw() {
		this.drawQuad({w:'100%', h:'100%'})
	}
}