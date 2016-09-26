
var storage = require('services/storage') 

module.exports = class Source extends require('base/view'){ 
	
	prototype() { 
		this.name = 'Source' 
		this.props = { 
			text: {inward: 'Code', prop: 'text', value: ''} 
		} 
		this.tools = { 
			Code: class extends require('views/code'){ 
				prototype() { 
					this.drawPadding = [0, 0, 0, 4] 
					this.wrap = true 
					this.padding = [0, 0, 0, 0] 
				} 
				onKeyS(e) { 
					if(!e.meta && !e.ctrl) return true 
					this.parent.onSave(this.serializeWithFormatting()) 
				} 
				onParsed() { 
					this.parent.onParsed(this.text, this.trace) 
				} 
			}, 
			Probes: require('./probes').extend({ 
			}) 
		} 
	} 

	onRuntimeError(e){
		if(!this.code.traceLines) return
		var node = this.code.traceLines[e.line-1]
		if(node) e.pos = node.start
		if(!this.code.error){
			this.code.error = e
			this.code.errorAnim = [ 
				this._time + .7, 
				.5, 
				1., 
				0. 
			]
		}
		// we have to find pos
		this.code.redraw()
	}

	onSave(text) { 
		storage.save(this.resource.path, text) 
		this.dirty = false 
		this.app.processTabTitles() 
	} 
	
	onParsed(text, trace) { 
		var resource = this.resource 
		if(!resource) return 
		// update our resource
		if(this.typeChanged) { 
			this.dirty = true 
			this.app.processTabTitles() 
		} 
		this.typeChanged = true 
		this.store.act('parseCode',store=>{
			resource.data = text 
			resource.trace = trace 
		})
		this.app.codeChange(resource) 
	} 
	
	onCompose() {
		return [ 
			new this.Code({
				name: 'Code', 
				y: '28', 
				w: '100%', 
				h: '100%-28', 
			}), 
			new this.Probes({ 
				name: 'Probes', 
				x: '0', 
				w: '100%', 
				///y:'100%-this.h',
				h: '28' 
			}) 
		] 
	} 
	
	onAfterCompose() { 
		// wire together probes and code
		this.probes = this.find('Probes') 
		this.code = this.find('Code') 
		// crosswire it
		this.code.probes = this.probes 
		this.probes.code = this.code 
	} 
}