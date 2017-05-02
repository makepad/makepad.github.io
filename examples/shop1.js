new require('styles/dark')

module.exports = class extends require('base/app'){ //top
	prototype() {
		this.tools = {
			Bg    :require("shaders/quad").extend({
				color:'#b86d61ff'
			}),
			Image :require("shaders/image").extend({
			}),
			Text  :require('shaders/text').extend({
				color   :'#e1e1e1ff',
				fontSize:24,
				font    :require('fonts/ubuntu_regular_256.font')
			}),
			Button:require('views/button').extend({
			})
		}
	}
	
	constructor() {
		super()
		this.products = [
			{name:'test', image:require('./images/plant.jpg')}
		]
	}
	
	onDraw() {
		this.beginBg({
			w:'100%',
			h:'100%'
		})
		for(var i = 0;i < this.products.length;i++){
			var product = this.products[i]
			this.drawText({
				text:product.name
			})
			this.drawImage({
				image:product.image
			})
		}
		this.endBg()
	}
}