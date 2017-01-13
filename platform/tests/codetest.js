new require('styles/dark')

module.exports = class extends require('base/app'){

	prototype(){
		this.tools = {
			Rect:require('shaders/quad'),
			Code: require('views/code').extend({
				w:'100#',
				h:'100%'
			})
		}
	}

	constructor(){
		super()

		//this.code = new this.Code(this, {text:require('/examples/tiny.js').__module__.source})
		let code = 
		'let a = [//A\n'+
		//'	a[0],//B\n\n'+
		'	b[1]//C\n'+
		']//D\n'
		
		this.code = new this.Code(this, {text:code})
		//this.code = new this.Code(this, {text:module.source})
		//this.code = new this.Code(this, {text:'if(x){\n\t1+2\nif(t){\n}\n}'})
	}

	onDraw(){
		/*this.drawRect({
			w:100,
			h:100,
			color:'red'
		})*/
		this.code.draw(this)
	}
}
