new require('styles/dark')
var painter = require('services/painter')
module.exports = class extends require('base/app'){ //top
	prototype() {
		this.nest = {
			Bg     :require("shaders/bg").extend({
				borderRadius:5,
				color       :'#ffffffff'
			}),
			HeatMap:require("shaders/image").extend({
				pickAlpha   :1.,
				imageSampler:{kind:'sampler', sampler:painter.SAMPLER2DLINEAR},
				pixel       :function() {
					var col = texture2D(this.imageSampler, this.mesh.xy)
					var f = clamp(col.x * 10., 0., 1.)
					return mix('#0000', mix('#00ff0fd4', '#ff060082', f), f)
				}
			}),
			Image  :require("shaders/image").extend({
			}),
			Text   :require('shaders/text').extend({
				color   :'#3d3d3dff',
				wrapping:'word',
				fontSize:24,
				font    :require('fonts/ubuntu_regular_256.font')
			}),
			Icon   :require('shaders/text').extend({
				color   :'#3d3d3dff',
				fontSize:24,
				font    :require('fonts/fontawesome_makepad.font')
			}),
			Line   :require('shaders/line').extend({
				color:'black'
			}),
			Button :require('views/button').extend({
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
			{name:'Titanium ring cube', price:150, image:require('./images/shop6.jpg')},
		]
		
		this.cart = module.worker.cart || (module.worker.cart = [])
		this.heatmap = this.createTexture({
			w:16,
			h:16
		})
	}
	
	onFingerHoverGlobal(e) {
		var l = this.toLocal(e)
		// --- Fill heatmap here! --- 
		this.heatmap.update()
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
		
		this.Bg2 = _=>{
			w:'100%'
			margin:[2, 0, 0, 0]
			padding:5
			color:'#d7d7d7ff'
		}
		
		this.drawText({
			align:[0.5, 0],
			color:'#949494ff',
			text :'Web Shop'
		})
		this.endBg()
		for(var i = 0;i < this.products.length;i++){
			let product = this.products[i]
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
				item   :i,
				onClick:btn=>{
					// --- Add product to cart here ---
					
					this.redraw()
				}
			})
			this.endBg()
			this.lineBreak()
		}
		this.beginBg({
			margin :[2, 0, 0, 0],
			y      :45,
			w      :100,
			align  :[0.97, 0],
			padding:5,
			color  :'#d7d7d7ff'
		})
		this.drawText({
			color   :'#949494ff',
			fontSize:20,
			text    :'Cart'
		})
		var total = 0
		for(var i = 0;i < this.cart.length;i++){
			total += this.cart[i].price
		}
		this.lineBreak()
		this.drawText({
			color   :'#949494ff',
			fontSize:10,
			text    :'Total:' + total + ' Euros'
		})
		this.lineBreak()
		
		for(var i = 0;i < this.cart.length;i++){
			let product = this.cart[i]
			this.beginBg({
				color  :'#a9a9a9ff',
				w      :90,
				padding:8
			})
			
			this.drawImage({
				image :product.image,
				margin:[0, 0, 5, 0],
				w     :50,
				h     :50
			})
			this.lineBreak()
			this.drawText({
				color   :'#000000ff',
				fontSize:10,
				wrapping:'word',
				text    :product.name
			})
			this.drawText({
				color   :'#000000ff',
				fontSize:10,
				wrapping:'word',
				text    :'\nEuro: ' + product.price
			})
			this.lineBreak()
			this.drawButton({
				id     :'rem' + i,
				text   :'Remove',
				icon   :'close',
				onClick:btn=>{
					// --- Remove product from cart here ---
					
					this.redraw()
				}
			})
			this.endBg({})
		}
		
		this.endBg()
		this.endBg(true)
		this.xmap = this.turtle.x2
		this.ymap = this.turtle.y2
		this.drawHeatMap({
			order:2,
			x    :0,
			y    :0,
			w    :this.xmap,
			h    :this.ymap,
			image:this.heatmap
		})
	}
}