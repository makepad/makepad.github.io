// the makepad App
module.exports = require('app').extend(function(proto){
	var load = require('load')

	var Worker = require('worker')

	var CodeView = require('views/codeview')

	//var Splitter = require('views/splitter')
	var UserCode = require('views/drawview').extend({
		name:'UserCode',
		surface:true,
		Background:{
			color:'#333'
		},
		onDraw:function(){
			this.drawBackground(this.viewGeom)
		}
	})

	proto.onInit = function(){
		load.text("tests/livecode1.js").then(function(text){
			console.error(text)
			this.find('CodeView').text = text
		}.bind(this))
	}

	proto.runUserApp = function(source){
		var userview = this.find('UserCode')
		var args = {
			painter:{
				fbId: userview.$renderPasses.surface.framebuffer.fbId
			}
		}
		if(!this.userApp){
			this.userApp = new Worker(source, args)
		}
		else this.userApp.run(source, args)
	}

	proto.onCompose = function(){
		return [
			CodeView({
				//text:'',
				onText:function(){
					if(!this.error && this.text){
						console.error(this.text)
						this.app.runUserApp(this.text)
					}
				},
				Text:{
					color:'white',
					font:require('fonts/ubuntu_monospace_256.sdffont'),
				},
				w:'50%',
				h:'100%'
			}),
			UserCode({
				w:'50%',
				h:'100%'
			})
		]
	}
})