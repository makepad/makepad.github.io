var Div = require('canvas').extend({
	props:{
		bgColor:[1,0,0,1]
	},
	onDraw:function(){
		this.drawRect({
			w:this.$w,
			h:this.$h,
			color:this.bgColor
		})
	}
})

var Text = require('canvas').extend({
	padding:10,
	onDraw:function(){
		this.beginRect(this)
		this.drawText({
			color:'white',
			text:this.text
		})
		this.endRect()
	}
})

var Scrollbars = require('canvas').extend({
	tools:{
		ScrollBar:require('stamps/scrollbarstamp').extend({
			ScrollBar:{
				pixelStyle:function(){
					this.slidePos = (.5+.5*sin(2.*this.time+this.id*0.2))*(1.-this.slideHeight)
				}
			}
		})
	},
	padding:10,
	onDraw:function(){
		this.beginRect(this)
		for(var i = 0; i < 1500; i++)
		this.drawScrollBar({
			id:i,
			slidePos:clamp(random(),0,0.75),
			w:8,
			h:50//'100%',
		})
		this.endRect()
	}
})

var App = require('app').extend({
	onCompose:function(){
		return [
			//Text({
			//	text:'TextNode'
			//}),
			Scrollbars({
				w:800,
				h:800
			}),
			Div({
				surface:true,
				margin:10,
				bgColor:'gray'},
				Div({
					margin:10,
					bgColor:'orange',
					padding:10,
					onFingerDown:function(){
						this.w = 40
						this.margin = 40
						this.bgColor = 'blue'
					}},
					Div({
						x:'0',
						w:10,
						h:10
					})
				)
			)
		]
	}
})()