new require('styles/dark')
var audio = require('services/audio')
module.exports = class extends require('base/app'){

	prototype(){
		this.tools = {
			Tabs: require('views/tabs').extend({
			}),
			Fill: require('shaders/quad').extend({
			}),
			View2:require('views/draw').extend({
				onDraw(){
					this.beginQuad({color:'red'})
					this.drawText({text:'HI'});this.lineBreak();
					this.drawText({text:'HI'})
					this.drawText({text:'HI'})
					this.drawText({text:'HI'})
					this.drawText({text:'HI'})
					this.endQuad()
				}
			}),
			View:require('views/draw').extend({
				xOverflow:'none',
				onDraw(){
					this.beginQuad({color:'#7',w:'100%'})
					for(var i =0; i < 3500; i++){
						this.drawQuad({margin:2,color:'random',w:25,h:25})
					}
					this.endQuad()
				}
			})
		}
	}

	constructor(){
		super()
		// lets make a new thing
		this.myView = new this.View(this, {id:'myView'})
	}

	onDraw(){
		this.drawTabs({id:1,w:'100%',h:'100%',tabs:[this.myView]})
	}
}
