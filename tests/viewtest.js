var styles = {
	CSize:{
		name:'CSize',
		Rect:{
			padding:20
		},
		Text:{
			//outlineWidth:10,
			//outlineColor:'black',
			fontSize:20
		},
		margin:30
	},
	MyDiv:{
		//margin:[10,10,0,10],
		//x:0,
		//y:0,
		w:150,
		h:40,
		bgColor:'orange'
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

// create a couple of styled classes
var MyDiv = Div.extend(styles.MyDiv)

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
				name:'MyDiv',
				surface:true,
				y:100,
				rotate:45,
				//w:200,
				//h:200,
				bgColor:'purple'},
				MyDiv({
					margin:10,
					//w:100,
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