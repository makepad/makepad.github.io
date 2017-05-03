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
			{name:'Item1', price:50, image:require('./images/shop1.jpg')},
			{name:'Item2', price:70, image:require('./images/shop2.jpg')},
			{name:'Item2', price:70, image:require('./images/shop3.jpg')},
			{name:'Item2', price:70, image:require('./images/shop4.jpg')},
			{name:'Item2', price:70, image:require('./images/shop5.jpg')},
			{name:'Item2', price:70, image:require('./images/shop6.jpg')},
		]
	}
	
	onDraw() {
		this.beginBg({
			w         :'100%',
			h         :'100%',
			moveScroll:0
		})
		for(var i = 0;i < this.products.length;i++){
			var product = this.products[i]
			this.drawText({
				margin:[40, 10, 0, 10],
				text  :product.name
			})
			this.drawImage({
				margin:5,
				image :product.image,
				w     :100,
				h     :100
			})
			this.drawText({
				text:'$' + product.price
			})
			this.drawButton({
				text   :'Buy!',
				id     :'btn' + i,
				onClick:_=>{
					
				}
			})
			
			this.lineBreak()
		}
		this.endBg(true)
	}
}