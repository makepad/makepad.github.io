
return require('base/app').extend({

	tools:{
		Bg: require('tools/rect').extend({
		}),
		Quad: require('tools/quad').extend({
		}),

		Text: require('tools/text').extend({
			font:require('fonts/ubuntu_monospace_256.font')
		})
	},

	onDraw:function(){
		var rnd = Math.random
		for(let i = 0 ; i < 20; i++){
			this.beginBg({
				//x:(i%15)*100,
				//y:Math.floor(i/15)*150,
				w:100,
				borderColor:[rnd()*.5,rnd()*.5,rnd()*.5,1],
				padding:[0,5,5,5],
				borderWidth:[20,0,0,0],
				color:[rnd(),rnd(),rnd(),1],
				align:[0.,0.]
			})

				this.drawText({text:'HELLO WORLD SHOW TEXT WRAPPING',wrapping:'word',color:'black',margin:[0,0,0,0]})
				this.drawBg({w:35,h:15,margin:[0,0,10,10],color:'red'})
				this.beginBg({
					//y:'$0',
					x:'@0',
					w:'100%',
					//align:[0.5,0.5],
					padding:[5,5,5,5],
					margin:[0,0,0,0],
					color:'orange'
				})	
					//console.log(this.turtle.dump())
					this.drawQuad({w:30,h:30},1)
					this.drawText({text:'text '})

				this.endBg()
				this.drawText({text:'Flowing around A B C',wrapping:'word',color:'black',margin:[0,0,0,0]})
				this.drawBg({w:35,h:15,margin:[0,0,0,10],color:'red'})
			this.endBg()
		}
	}
})