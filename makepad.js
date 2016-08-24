module.exports = require('base/app').extend(function(proto){

	var storage = require('services/storage')
	var Worker = require('services/worker')
	var Code = require('views/code')
	var Tree = require('views/tree')

	var projectFile = "./makepad.json"
	var currentFile = "./examples/windtree.js"
	// which file to load
	if(storage.search) currentFile = storage.search.slice(1)

	var User = require('views/draw').extend({
		name:'User',
		surface:true,
		Background:{
			color:'#333'
		},
		onDraw:function(){
			this.drawBackground(this.viewGeom)
		}
	})

	proto.onInit = function(){
		storage.loadText(projectFile).then(function(text){
			var proj = JSON.parse(text)
			//console.log(JSON.stringify(proj, true, 2))
			this.find('Tree').data = proj
			//this.find('CodeView').text = text
		}.bind(this))

		storage.loadText(currentFile).then(function(text){
			this.find('Code').text = text
		}.bind(this))
		
	}

	proto.runUserApp = function(source){
		var user = this.find('User')
		var args = {
			painter1:{
				fbId: user.$renderPasses.surface.framebuffer.fbId
			}
		}
		if(!this.userApp){
			this.userApp = new Worker(source, args)
		}
		else this.userApp.run(source, args)
	}

	proto.onCompose = function(){
		return [
			Tree({
				data:[],
				w:'0%',
				h:'100%'
			}),
			Code({
				onKeyS:function(e){
					if(!e.meta && !e.ctrl) return true
					// lets save it
					this.serializeWithFormatting()

					storage.saveText(currentFile, this.serializeWithFormatting())
				},
				onParsed:function(){
					this.app.runUserApp(this.text)
				},
				Text:{
					color:'white',
					font:require('fonts/ubuntu_monospace_256.font'),
				},
				w:'50%',
				h:'100%'
			}),
			User({
				w:'50%',
				h:'100%'
			})
			
		]
	}
})