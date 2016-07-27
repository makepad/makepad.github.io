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
				pixelStyle2:function(){
					this.handlePos = (.5+.5*sin(2.*this.time+this.id*0.2))*(1.-this.slideHeight)
				}
			}
		})
	},
	padding:10,
	onDraw:function(){
		this.beginRect(this)
		for(var i = 0; i < 1000; i++)
		this.drawScrollBar({
			id:i,
			margin:1,
			handleSize:0.2,
			//slidePos:abs(sin(i*0.1))*0.75,
			w:16,
			h:100//'100%',
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
				w:1800,
				h:900
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