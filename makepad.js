// the makepad App
module.exports = require('app').extend(function(proto){
	var storage = require('storage')

	var editFile = "storage/livecode2.js"
	//var editFile = "storage/livecode2.js"
	//var editFile = "storage/livecode4.js"
	// var editFile = "views/codeview.js"

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
		storage.loadText(editFile).then(function(text){
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
				onKeyS:function(e){
					if(!e.meta && !e.ctrl) return true
					// lets save it
					storage.saveText(editFile, this.text)
				},
				onText:function(){
					if(!this.error && this.text){
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