var styles = {
	CSize:{
		name:'CSize',
		Rect:{
			padding:20
		},
		Text:{
			fontSize:20
		},
		margin:30
	}
}

var Div = require('canvas').extend(styles.Div,{
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

var CSize = require('canvas').extend(styles.CSize,{
	props:{
		bgColor:[1,0,0,1]
	},
	onDraw:function(){
		this.beginRect()
		this.drawText({
			color:'white',
			text:this.text
		})
		this.endRect()
	}
})

var App = require('app').extend({
	onCompose:function(){
		return [
			CSize({
				text:'Full view textnode'
			}),
			Div({
				//w:100,
				h:100,
				bgColor:'blue'},
				Div({
					margin:[10,10,0,10],
					w:50,
					h:40,
					bgColor:'orange',
					onFingerTap:function(){
						this.w = 150
						this.bgColor = 'red'
					}
				})
			)
		]
	}
})()