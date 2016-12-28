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
	
		this.code = new this.Code(this, {text:'var x = {\nx:1,y:2}'})
		//this.code = new this.Code(this, {text:'if(x){\n\t1+2\nif(t){\n}\n}'})
	}

	onDraw(){
		this.code.draw(this)
	}
}
