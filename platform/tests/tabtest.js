new require('styles/dark')
var audio = require('services/audio')
module.exports = class extends require('base/app'){

	prototype(){
		this.tools = {
			Tabs: require('views/tabs').extend({
			}),
			Button: require('stamps/button').extend({
			}),
			View:require('views/draw').extend({
				xOverflow:'none',
				onDraw(){
					
					this.beginQuad({color:'#4',h:'100%',w:'100%'})
					for(var i =0; i < 100; i++){
						this.drawRounded({margin:2,color:'random',w:25,h:25, borderRadius:this.br})
					}
					this.endQuad()
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
		this.tabs = new this.Tabs(this, {id:'t1',w:'100%',h:'100%',tabs:[view1,view2,view3]})
	}

	onDraw(){
		//this.drawButton({id:2,text:'hi'})
		this.tabs.draw(this)
		//this.drawTabs({id:1,w:'100%',h:'100%',tabs:[this.myView,this.myView,this.myView,this.myView]})
	}
}
