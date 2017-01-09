
var storage = require('services/storage') 

module.exports = class Source extends require('base/view'){ 
	
	constructor(...args){
		super(...args)

		this.probes = []

		// listen on the resource

	}

	onResource(e){
		if(!this.app.store.anyChanges(e, 3, 'runtimeErrors', null) && 
			!this.app.store.anyChanges(e, 0, 'parseErrors', null)) return
	}

	prototype() { 
		this.name = 'Source' 
		
		this.props = { 
			resource:null,
		} 

		this.tools = {
			Button: require('stamps/button').extend({
			}),
			Bg:require('shaders/quad').extend({
				w:'100%',
				padding:[0,5,0,5],
				wrap:false,
				color:module.style.colors.bgNormal
			}),
			ErrorBg:require('shaders/quad').extend({
				w:'100%',
				pickAlpha:1,
				wrap:0,
				states:{
					default:{
						duration:.5,
						time:{fn:'ease',begin:30,end:0},
						from:{
							color:'#0000'
						},
						to:{
							color:'#000b'
						}
					},
				},
				padding:[7,0,6,7],
				order:5,
				color:'#000b'
			}),
			ErrorIcon:require('shaders/icon').extend({
				color:'red',
				margin:[0,5,0,0],
				states:{
					default:{
						duration:.5,
						time:{fn:'ease',begin:30,end:0},
						from:{
							color:'#f000'
						},
						to:{
							color:'red'
						}
					},
				},
				order:6,
			}),
			ErrorText:require('shaders/text').extend({
				pickAlpha:1,
				states:{
					default:{
						duration:.5,
						time:{fn:'ease',begin:30,end:0},
						from:{
							color:'#fff0'
						},
						to:{
							color:'white'
						}
					},
				},
				order:7,
			}),
			Code:class Code extends require('views/code'){ 
				
				prototype() { 
					this.order = 3
					this.drawPadding = [0, 0, 0, 4] 
					this.w = '100%'
					this.h = '100#'
					this.wrap = true 
					this.padding = [0, 0, 0, 0] 
					this.props = { 
						resource:null,
					} 
				}

				onKeyS(e) {
					this.inputDirty = false
					if(!e.meta && !e.ctrl) return true 
					var text = this._text

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
					this.logs = {}
				}

				getNodeName(node){
					if(!node) return ''
					if(node.type === 'Identifier') node = lhs.name
					if(node.type === 'MemberExpression') node = lhs.property.name
				}

				onLog(node, lhs){
					// current line
					var line = this.$fastTextLines.length
					var logs = this.logs[line] ||  (this.logs[line] = [])
					var id = logs.push(node)
					return line*10+id
				}

				onProbe(node, lhs){
					// ok we have a probe, but what is it
					var name='prop'
				
					//if(lhs.type === )
					this.redraw()
					return this.probes.push({
						node:node,
						name:name
					}) - 1
				}

				onEndFormatAST(){
					// output probeset to my resource state
					this.trace += '\n'+$P.toString()
				}
			},
		}
	} 

	onPlay(){
		this.app.addProcessTab(this.resource)
	}

	onClose(){
		this.app.closeTab(this)
	}

	onDraw(){
		this.beginBg({
		})
		
		this.drawButton({
			id:'play',
			icon:'play',
			onClick:this.onPlay
		})

		this.drawButton({
			id:'close',
			align:[1,0],
			icon:'close',
			onClick:this.onClose
		})
		this.endBg()
		this.lineBreak()

		// lets draw some errors!
		this.beginErrorBg({
			//debug:1,
			//x:this.turtle.wx,
			y:'0',
			//h:this.turtle.wy - this.turtle.$yAbs
			//y:this.turtle.wy
		})

		var parseErrors = this.resource.parseErrors

		var errors = []

		if(parseErrors.length){
			parseErrors.forEach(e=>{
				errors.push(e)
				//var error = {name:e.message,error:e,icon:'exclamation-circle',folder:[]}
				//this.drawErrorIcon({
				//	text:this.lookupErrorIcon['exclamation-triangle']
				//})
				//this.drawErrorText({
				//	text:e.message
				//})
				//this.lineBreak()
				//console.log(error)
				//tree.folder.push(error)
				//errors.push(e.pos)
			})
		}
		else{
			var runtimeErrors = []
			this.resource.processes.forEach(p=>p.runtimeErrors.forEach(e=>runtimeErrors.push(e)))

			var resPath = this.resource.path
			runtimeErrors.forEach((e, i)=>{
				errors.push(e)
				/*
				var oldf = old.folder && old.folder[i]
				// push a marker
				if(!e.path || e.path === resPath){
				if(this.resource.trace){ // we need to use the traceMap
						var pos = this.resource.traceLines[e.line-1]
						errors.push(pos - 1)
					}
					else{ // else we need to use .. what exactly

					}
				}*/
				/*
				this.drawErrorIcon({
					text:this.lookupErrorIcon['exclamation-circle']
				})

				this.drawErrorText({
					text:e.message
				})

				this.lineBreak()*/

				//var error = {name:e.message + (e.count>1?':x'+e.count:''), path:e.path, error:e, open:oldf&&oldf.open, icon:'exclamation-triangle', folder:[]}

				//console.log(error)
				/*
				tree.folder.push(error)
				if(e.stack) e.stack.forEach(m=>{
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
				*/
			})
		}
		this.endErrorBg()
		this.drawCode({
			order:2,
			resource:this.resource,
			errors:errors
		})
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