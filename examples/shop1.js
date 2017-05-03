new require('styles/dark')

module.exports = class extends require('base/app'){ //top
	prototype() {
		this.tools = {
			Bg    :require("shaders/bg").extend({
				borderRadius:5,
				color       :'#ffffffff'
			}),
			Image :require("shaders/image").extend({
			}),
			Text  :require('shaders/text').extend({
				color   :'#3d3d3dff',
				wrapping:'word',
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
			{name:'Mahogany obsidian', price:70, image:require('./images/shop1.jpg')},
			{name:'Imperial jasper green', price:60, image:require('./images/shop2.jpg')},
			{name:'Lake superior agate', price:70, image:require('./images/shop3.jpg')},
			{name:'Binghamite', price:70, image:require('./images/shop4.jpg')},
			{name:'Imperial jasper red', price:50, image:require('./images/shop5.jpg')},
			{name:'Titanium ring Cube', price:150, image:require('./images/shop6.jpg')},
		]
	}
	
	onDraw() {
		this.beginBg({
			w         :'100%',
			h         :'100%',
			moveScroll:0
		})
		this.beginBg({
			w      :'100%',
			margin :[2, 0, 0, 0],
			padding:5,
			color  :'#d7d7d7ff'
		})
		this.drawText({
			align:[0.5, 0],
			color:'#949494ff',
			text :'Web Shop'
		})
		this.endBg()
		for(var i = 0;i < this.products.length;i++){
			var product = this.products[i]
			this.beginBg({
				margin :[2, 0, 0, 0],
				padding:5,
				color  :'#d7d7d7ff'
			})
			this.drawImage({
				
				image:product.image,
				w    :100,
				h    :100
			})
			this.beginBg({
				margin :[0, 0, 0, 5],
				padding:[0, 10, 0, 10],
				w      :150,
				color  :'#c8c3c3ff'
			})
			this.drawText({
				//margin:[40, 10, 0, 10],
				fontSize:20,
				text    :product.name,
			})
			this.lineBreak()
			this.drawText({
				fontSize:14,
				italic  :-0.1,
				text    :'Price: ' + product.price + ' Euros'
			})
			this.endBg()
			this.drawButton({
				icon   :'shopping-basket',
				id     :'btn' + i,
				onClick:_=>{
					
				}
			})
			this.endBg()
			
			
			
			this.lineBreak()
		}
		this.endBg(true)
	}
}