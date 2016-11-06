var Tools = require('base/tools')

module.exports = class Style extends require('base/class'){

	constructor(cls, object, toolPath, toolName){
		super()
		this.class = cls
		this.object = object
		this.toolPath = toolPath
		this.toolName = toolName
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

	module(match){
		// lets check if we have the module path in our protochain
		var cls = this.class
		while(cls){
			//if(cls.__module__)console.log(cls.__module__.path)
			if(cls.__module__ && cls.__module__.path.match(match)) return true
			var proto = Object.getPrototypeOf(cls.prototype)
			cls = proto && proto.constructor
		}
		return false
	}

	tool(match){
		return this.toolName.match(match) || this.toolPath.match(match)
	}
	
	root(){
		return false
	}

	extend(name, v){

	}

	set to(v){
		this.changed = true
		deepCopy(this.object, v)
	}

	get to(){
		return this.object
	}

	static compute(cls){
		var Style = this
		// lets initialize inheritables
		// lets walk all the inheritables with arg === 'true'
		function walk(cls, toolPath, toolName){
			var out = {}
			var proto = cls.prototype
			proto.__initproto__()
			var inheritable = proto.__inheritable__
			for(let i = 0; i < inheritable.length;i++){
				var inh = inheritable[i]
				var name = inh.name
				//console.log(name)
				if(inh.type !== true) continue

				var sub = walk(proto[name], toolPath?toolPath + '.' + name:name, name)
				if(Object.keys(sub).length){
					out[name] = sub
				}
			}
			// lets fire on our node
			//console.log(toolPath)
			var s = new Style(cls, out, toolPath, toolName)
			if(s.match) s.match()
			if(!s.changed && cls.prototype.defaultStyle){
				cls.prototype.defaultStyle(s)
			}
			// lets process object for $ inheritable props
			return Tools.protoProcess('', out, null, null, null, new WeakMap())
		}
		var obj = walk(cls, '', '')
		if(Style.prototype.dump){
			console.log(obj)
		}
		// lets just apply the object

		return obj//cls.extend(obj)
	}
}

function deepCopy(out, inp){
	// we have to overlay object
	for(var key in inp){
		var value = inp[key]
		if(typeof value === 'object' && value.constructor === Object){
			if(!out[key]) out[key] = {}
			deepCopy(out[key], value)
		}
		else{
			out[key] = value
		}
	}
}