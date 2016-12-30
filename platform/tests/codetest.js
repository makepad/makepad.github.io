new require('styles/dark')

module.exports = class extends require('base/app'){

	prototype(){
		this.tools = {
			Code: require('views/code').extend({
				w:'100%',
				h:'100%'
			})
		}
	}

	constructor(){
		super()
		console.log ()
		this.code = new this.Code(this, {text:require('/examples/tiny.js').__module__.source})
		
		//this.code = new this.Code(this, {text:'function t(){\nvar t=2+\nfunction t(){}\n}'})
		//this.code = new this.Code(this, {text:module.source})
		//this.code = new this.Code(this, {text:'if(x){\n\t1+2\nif(t){\n}\n}'})
	}

	onDraw(){
		this.code.draw(this)
	}
}
