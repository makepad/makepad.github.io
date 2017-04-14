new require('styles/dark')

module.exports = class extends require('base/app'){

	prototype(){
		this.tools = {
			Splitter: require('views/splitter').extend({
				w:'100%',
				h:'100%'
			}),
			Button: require('views/button').extend({
			}),
			View:require('views/draw').extend({
				xOverflow:'none',
				w:'100%',
				h:'100#',
				down:1,
				onDraw(){
					//return
					this.beginQuad({color:'#4',w:'100%', h:'100%'})
					this.drawRounded({align:[0,1], color:'random', w:25,h:25})
					this.drawRounded({align:[1,1], color:'random', w:25,h:25})
					this.drawRounded({align:[0,0], color:'random', w:25,h:25})
					this.drawRounded({align:[1,0], color:'random', w:25,h:25})
					//for(var i =0; i < 1000; i++){
					//	this.drawRounded({margin:2,color:'random',w:25,h:25, borderRadius:this.br})
					//}
					this.endQuad()
				}
			}),
			View2:require('views/draw').extend({
				xOverflow:'none',
				w:'100%',
				h:'100%',
				onDraw(){
					this.drawQuad({color:'red',w:'100%',h:'100',down:1})
					console.log(this.turtle.dump())
					this.subview.draw(this)
				}
			})
		}
	}

	constructor(){
		super()
		// lets make a new thing
		var view1 = new this.View(this, {tabName:'myfile1.js',id:'v1', br:0})
		var view2 = new this.View(this, {tabName:'myfile2.js',id:'v2', br:10})
		var view3 = new this.View(this, {tabName:'myfile3.js',id:'v3', br:30})
		var view4 = new this.View2(this, {id:'v4',subview:view3})
		this.view4 = view4
		this.split2 = new this.Splitter(this, {id:'s2', panes:[view1, view4]})
		//this.split1 = new this.Splitter(this, {id:'s1', panes:[this.split2,view2]})
	}

	onDraw(){
		//this.view4.draw(this)
		//this.drawButton({id:2,text:'hi'})
		//this.split1.draw(this)
		this.split2.draw(this)
		//this.drawTabs({id:1,w:'100%',h:'100%',tabs:[this.myView,this.myView,this.myView,this.myView]})
	}
}
