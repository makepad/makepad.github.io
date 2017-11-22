
var storage = require('services/storage') 

module.exports = class Source extends require('base/view'){ 
	
	constructor(...args){
		super(...args)

		this.probes = []

		// listen on the resource
		var store = this.app.store
		store.observe(this.resource, e=>{
			this.redraw()
		})
		//console.log(this.resource)
	}

	prototype() { 
		this.props = { 
			resource:null,
		} 

		this.nest = {
			Button: require('views/button').extend({
				heavy:true
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


				constructor(...args){
					super(...args)
					this.text = this.resource.data
					//console.log(this.text)
				}


				onKeyS(e) {
					this.inputDirty = false
					if(!e.meta && !e.ctrl) return true 
					var text = this.text

					storage.save(this.resource.path, text) 
					this.app.store.act('setDirty',store=>{
						this.resource.dirty = false
					})
				} 
				/*
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
				}*/

				onParsed() {
					this.app.store.act('parseCode',store=>{
						var res = this.resource
						res.dirty = this.inputDirty
						res.data = this.text 
					})
				}
				
				
				/*
				onParseError(e){
					this.store.act('setParseError',store=>{
						var res = this.resource
						res.dirty = true
						res.parseErrors.length = 0
						res.parseErrors.push(e)
					})
				}*/

				onBeginFormatAST(){
					//this.trace = ''
					this.probes = []
					this.logs = {}
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
					//this.trace += '\n'+$P.toString()
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

	onPackage(){
		this.app.packageApp(this.resource)
	}
	
	onTrace(){
		this.app.addProcessTab(this.resource, true)
	}
	
	onDraw(){
		this.beginBg({
		})
		
		this.drawButton({
			id:'play',
			icon:'play',
			onClick:this.onPlay.bind(this)
		})

		this.drawButton({
			id:'package',
			icon:'archive',
			onClick:this.onPackage.bind(this)
		})

		this.drawButton({
			id:'trace',
			icon:'filter',
			onClick:this.onTrace.bind(this)
		})
		this.drawButton({
			id:'close',
			align:[1,0],
			icon:'close',
			onClick:this.onClose.bind(this)
		})
		this.endBg()
		this.lineBreak()

		var runtimeErrors = []
		this.resource.processes.forEach(p=>p.runtimeErrors.forEach(e=>runtimeErrors.push(e)))

		// if we get a runtime error in a traced source, we have to 
		// find a way to map it without whitespace padding

		//var resPath = this.resource.path
		//runtimeErrors.forEach((e, i)=>{
		//	errors.push(e)
		//})
		this.drawCode({
			order:2,
			resource:this.resource,
			runtimeErrors:runtimeErrors,
			stackMarkers:this.resource.stackMarkers
		})
	}
}