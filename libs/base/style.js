var Tools = require('base/tools')

module.exports = class Style extends require('base/class'){

	constructor(){
		super()
		module.worker.style = this
		module.worker.onRequire = m=>{
			this.processModule(m)
		}
		var chain = this.protoChain = []
		var proto = this
		while(proto){
			chain.unshift(proto)
			proto = Object.getPrototypeOf(proto)
		}
	}

	prototype(){
		this.inheritable('anims')
		this.inheritable('fonts')
		this.inheritable('colors')
	}

	inheritable(name){
		super.inheritable(name, function(){
			var props = this[name]
			var proto = Object.getPrototypeOf(this)
			var parent = proto[name]
			var out = {}
			if(parent) deepCopy(out, parent)
			deepCopy(out, props)
			this[name] = out
		})
	}

	processModule(m){
		if(m.path.indexOf('/libs/services') === 0 && m.initialized){
			return
		}
		// we have to call the factory
		// we can customize the 'style' class to this module
		// in the query
		let localStyle = Object.create(this)
		localStyle.customize(m.path)

		// call the factory
		m.style = localStyle
		let ret = m.factory.call(m.exports, m.require, m.exports, m)
		if(ret !== undefined) m.exports = ret
		m.initialized = true

		// and what do we do with the subclassing?
		var cls = m.exports
		if(typeof cls !== 'function' || typeof cls.extend !== 'function') return
		var proto = cls.prototype
		var path = m.path
		var object = this.object = {}
		this.changed = false

		// ok now lets walk our chain and apply module based queries
		var chain = this.protoChain
		for(let i =0; i < chain.length; i++){
			var item = chain[i]
			if(item.inherit) item.inherit.call(this, path)
			// add our style as a dependency to the module
			//var sub = item.constructor.__module__

			//if(sub){
			//	m.deps[sub.path] = sub
			//	console.log("Depending ", m.path, sub.path )
			//}
		}

		if(this.changed){ // inherit class
			var final = Tools.protoProcess('', object, null, null, null, new WeakMap())
			m.exports = cls.extend(final)
		}
	}

	customize(path){
	}

	inherit(){
	}

	set to(v){
		this.changed = true
		deepCopy(this.object, v)
	}

	get to(){
		return this.object
	}
}

function deepCopy(out, inp){
	// we have to overlay object
	for(var key in inp){
		var value = inp[key]
		if(value && typeof value === 'object' && value.constructor === Object){
			if(!out[key]) out[key] = {}
			deepCopy(out[key], value)
		}
		else{
			out[key] = value
		}
	}
}