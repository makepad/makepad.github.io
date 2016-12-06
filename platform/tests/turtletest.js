new require('styles/dark')

return require('base/app').extend({

	tools:{
		Bg: require('shaders/rounded').extend({
		}),
		Quad: require('shaders/quad').extend({
		}),
		Text: require('shaders/text').extend({
			font:require('fonts/ubuntu_monospace_256.font')
		}),
		Button: require('stamps/button').extend({
		}),
	},

	onDraw:function(){
		var rnd = Math.random

		this.beginBg({
			color:'red',
			padding:5,
			//x:100,
			//y:100,
			w:300,
			h:80
		})
		// alignment how. left, right top bottom, center
		// stack = x*1000+y
		this.beginBg({color:'green', align:[0,1], w:100,padding:0})
		this.drawButton({id:1,align:[1,1],text:'hi'})
		this.endBg()
		/*
		this.beginBg({color:'green', align:[1,1], w:30, h:30,padding:5})
		this.drawBg({color:'orange',w:5,h:5,align:[1,0]})
		this.drawBg({color:'orange',w:5,h:5,align:[1,0]})
		this.endBg()
		*/
		/*
		this.drawBg({color:'yellow',x:'@0',y:'@0',w:5,h:5})	
		this.beginBg({color:'green', x:'@0', y:'@0', w:30, h:30,padding:5})
		this.drawBg({color:'orange',w:5,h:5,align:[1,0]})
		this.drawBg({color:'orange',w:5,h:5,align:[1,0]})
		this.endBg()

		this.drawBg({align:[1,0],w:50,h:50,color:'orange',padding:5})
		
		this.beginBg({color:'purple', w:30, h:30,padding:5,align:[1.,0]})
		this.drawBg({color:'orange',w:5,h:5,align:[1,0]})
		this.drawBg({color:'orange',w:5,h:5,align:[1,0]})
		this.endBg()
		
		this.drawBg({align:[0,0],w:50,h:50,color:'blue',padding:5})
		
		this.beginBg({color:'#7777', w:'100%',h:30,padding:5,align:[0.,0.]})
		this.drawBg({color:'green',w:5,h:5})
		this.drawBg({color:'green',w:5,h:5,align:[1,0]})
		this.endBg()*/

		//this.drawButton({text:'A', align:[1,0]})
		//this.drawButton({text:'B', align:[0,0]})
		//this.drawBg({align:[0,0],w:'50%',h:50,color:'orange'})
		//this.drawBg({align:[0,0],w:'100%',h:50,color:'gray'})

		this.endBg()

		for(let i = 0 ; i < 20; i++){
			this.beginBg({
				//x:(i%15)*100,
				//y:Math.floor(i/15)*150,
				down:0,
				w:100,
				borderColor:[rnd()*.5,rnd()*.5,rnd()*.5,1],
				padding:[0,5,5,5],
				borderWidth:[20,0,0,0],
				color:[rnd(),rnd(),rnd(),1],
			})

				this.drawText({text:'HELLO WORLD SHOW TEXT WRAPPING',wrapping:'word',color:'black',margin:[0,0,0,0]})
				this.drawBg({w:35,h:15,margin:[0,0,10,10],color:'red'})
				this.turtle.lineBreak()
				this.beginBg({
					//y:'$0',
					//x:'@0',
					w:'100%',
					//align:[0.5,0.5],
					padding:[5,5,5,5],
					margin:[0,0,0,0],
					color:'orange'
				})	
					//console.log(this.turtle.dump())
					this.drawQuad({w:30,h:30},1)
					this.drawText({text:'text '+i})

				this.endBg()
				this.drawText({text:'Flowing around A B C',wrapping:'word',color:'black',margin:[0,0,0,0]})
				this.drawBg({w:35,h:15,margin:[0,0,0,10],color:'red'})
			this.endBg()
		}
	}
})