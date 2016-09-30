
var storage = require('services/storage') 

class Code extends require('views/code'){ 
	prototype() { 
		this.drawPadding = [0, 0, 0, 4] 
		this.wrap = true 
		this.padding = [0, 0, 0, 0] 
		this.props = { 
			resource:null,
		} 
	}

	onKeyS(e) {
		this.inputDirty = false
		if(!e.meta && !e.ctrl) return true 
		var text = this.serializeWithFormatting()

		storage.save(this.resource.path, text) 
		this.store.act('setDirty',store=>{
			this.resource.dirty = false
		})
	} 

	onClearErrors(){
		if(this.errorTimeout) clearTimeout(this.errorTimeout)
		this.errorTimeout = this.errors = null
	}

	setErrors(errors){
		if(this.errorTimeout) clearTimeout(this.errorTimeout)
		if(errors.length){
			this.errorTimeout = setTimeout(e=>{
				this.errorTimeout = undefined
				this.errors = errors
			},500)
		}
		else this.errors = errors
	}

	onParsed() {
		this.store.act('parseCode',store=>{
			var res = this.resource
			res.dirty = this.inputDirty
			res.data = this.text 
			res.trace = this.trace 
			res.traceLines = this.$fastTextLines
			res.parseErrors.length = 0
		})
	}
	
	onResource(e){
		if(!this.initialized){
			this.text = this.resource.data
		}
	}

	onParseError(e){
		this.store.act('setParseError',store=>{
			var res = this.resource
			res.dirty = true
			res.parseErrors.length = 0
			res.parseErrors.push(e)
		})
	}

	onBeginFormatAST(){
		this.trace = ''
		this.probes = []
	}

	onProbe(node, lhs){
		// ok we have a probe, but what is it
		var name='prop'
		if(lhs){
			if(lhs.type === 'Identifier') name = lhs.name
			if(lhs.type === 'MemberExpression') name = lhs.property.name
		}
		//if(lhs.type === )
		this.redraw()
		return this.parent.probes.push({
			node:node,
			name:name
		}) - 1
	}

	onEndFormatAST(){
		// output probeset to my resource state
		this.trace += '\n'+$P.toString()
	}
}

class Errors extends require('views/tree'){
	prototype(){
		this.openWithText = false
		this.props = {
			resource:null
		}
		this.xOverflow='scroll'
		this.yOverflow='resize'
		this.tools = {
			Bg:{
				borderRadius:8,
				//color:'#777c'
			},
			Cursor:{
				duration:0.,
				selectedColor:'#955',
				hoverColor:'#733'
			},
			Text:{
				duration:0.
			},
			TreeLine:{
				duration:0.
			},
			Icon:{
				duration:0.,
				color:'#ff0'
			}
		}
	}

	onNodeSelect(node, path, e){
		
		// ok lets do something here.
		var path = node.path
		if(path && path !== this.resource.path){
			// lets open another source file if we can
			var other = this.store.resourceMap.get(path)
			if(other) this.app.addSourceTab(other)
		}
		//this.parent.onSelectError(node.error)
	}

	onDraw(){
		//console.log(this)
		super.onDraw(true)
	}

	onResource(e){
		if(!this.initialized) return

		if(!this.store.anyChanges(e, 3, 'runtimeErrors', null) && 
			!this.store.anyChanges(e, 0, 'parseErrors', null)) return

		// update the tree with data
		// generate the data the tree uses
		var old = this.data
		var tree = {folder:[]}
		var parseErrors = this.resource.parseErrors

		var errors = []

		if(parseErrors.length){
			parseErrors.forEach(e=>{
				var error = {name:e.message,error:e,icon:'exclamation-circle',folder:[]}
				tree.folder.push(error)
				errors.push(e.pos)
			})
		}
		else{
			var runtimeErrors = []
			this.resource.processes.forEach(p=>p.runtimeErrors.forEach(e=>runtimeErrors.push(e)))
			var resPath = this.resource.path
			runtimeErrors.forEach((e,i)=>{
				var oldf = old.folder && old.folder[i]
				// push a marker
				if(!e.path || e.path === resPath){

					if(this.resource.trace){ // we need to use the traceMap
						var pos = this.resource.traceLines[e.line-1]
						errors.push(pos - 1)
					}
					else{ // else we need to use .. what exactly

					}
				}

				var error = {name:e.message + (e.count>1?':x'+e.count:''), path:e.path, error:e, open:oldf&&oldf.open, icon:'exclamation-triangle', folder:[]}
				tree.folder.push(error)
				e.stack.forEach(m=>{
					if(m.path === resPath){
						if(this.resource.trace){ // we need to use the traceMap
							var pos = this.resource.traceLines[m.line-1]
							errors.push(pos - 1)
						}
					}
					error.folder.push({
						path:m.path,
						name:m.method+'()'+' - '+m.path+':'+m.line
					})
				})
			})
		}

		this.parent.find('Code').setErrors(errors)

		this.data = tree
	}
}

class Probes extends require('base/view'){
	prototype(){
		this.props = {
			resource:null
		}
		this.cursor ='pointer'
		this.name = 'Probes'
		this.padding = [0,0,0,0]
		this.tools = {
			Text:require('tools/text').extend({
				font:require('fonts/ubuntu_monospace_256.font'),
				margin:[5,0,0,5],
				fontSize:14,
				wrapping:'line',
				color:'#f'
			}),
			Background:require('tools/quad').extend({
				color:'#6',
				wrap:1,
			}),
			Button:require('tools/button').extend({
				cursor:'default',
				Bg:{
					padding:[6,10,6,10]
				}
			}),
			Item:require('tools/button').extend({
				h:'100%',
				Bg:{
					padding:4,
					wrap:true
				},
				Text:{
					fontSize:7,
					wrapping:'char'
				}
			}),
			Slider:require('tools/slider')
		}
		this.styles = {
			playButton:{
				icon:'play',
				onClick:function(){
					this.view.onPlay()
				}
			},
			stopButton:{ 
				icon:'stop',
				onClick:function(){ 
					this.view.onStop()
				}
			}
		}
	}

	onPlay(){
		// ask which code file has focus
		this.app.addProcessTab(this.parent.resource)
	}
	
	onResource(e){
		if(!this.resource) return
	}

	onStop(){

	}

	onDraw(){
		if(!this.resource) return
		//alright so how are we going to select things
		this.beginBackground(this.viewGeom)

		this.drawButton(this.styles.playButton)
		//else {
		//	// lets add a slider widget
		//	var probes = this.probes
		//	if(probes) for(let i = 0; i < probes.length; i++){
		//		var probe = probes[i]
		//		this.drawItem({
		//			text:probe.name
		//		})
		//	}
		//}
		this.endBackground()
	}
}

module.exports = class Source extends require('base/view'){ 
	
	constructor(...args){
		super(...args)

		this.probes = []

	}

	prototype() { 
		this.name = 'Source' 
		
		this.props = { 
			resource:null,
		} 

		this.tools = { 
			Code:Code,
			Probes:Probes,
			Errors:Errors
		}
	} 
	
	onResource(e){
	}
	
	onCompose() {
		return [ 
			new this.Code({
				resource:this.resource,
				name: 'Code', 
				y: '28', 
				w: '100%', 
				h: '100%-28', 
			}), 
			new this.Probes({ 
				resource:this.resource,
				name: 'Probes',
				x: '0', 
				w: '100%', 
				///y:'100%-this.h',
				h: '28' 
			}),
			new this.Errors({
				name: 'Errors',
				resource:this.resource,
				x:'30',
				w:'100%-30',
				h:NaN
			})
		] 
	} 
}

function $P(id, arg){
	if(!$P.onMessage){
		function onMessage(){
			$P.onMessage = false
			return [{
				fn:'onProbe',
				msg:block
			},[block]]
		}
		module.worker.batchMessage({
			$:'worker1',
			msg:{onMessage:onMessage}
		})
		$P.onMessage = true
	}
	// lets serialize arg into our typed array

	console.log(arg)
	return arg
}