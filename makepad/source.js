
var storage = require('services/storage') 

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
			Code:class Code extends require('views/code'){ 
				
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
	
	onResource(e){
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