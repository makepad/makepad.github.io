// lets create a constructor

function extend(body){

	var proto = Object.create(this.prototype)

	function Class(){
		var cthis = this
		if(!(cthis instanceof Class)){
			cthis = Object.create(Class.prototype)
			cthis.constructor = Class
		}
		if(cthis._onconstruct){
			cthis._onconstruct.apply(cthis, arguments)
		}
		if(cthis.onconstruct){
			cthis.onconstruct.apply(cthis, arguments)
		}
		var outer = Class.outer
		if(outer !== undefined){
			cthis.outer = outer
		}
		return cthis
	}
	// get name
	var Constructor = Class

	if(true){
		var path = Error().stack.split('\n')[3]
		var clsname
		if(body && body.name){
			clsname = body.name
		}
		else if(path.indexOf('/') !== -1){
			var name = path.slice(path.lastIndexOf('/')+1,path.lastIndexOf('.'))
			var line = path.slice(path.lastIndexOf('.js')+4, path.lastIndexOf(':')) - 2
			if(name === 'class') name = 'Class', line = 0
			clsname = name + (line>1?'_'+line:'')
		}
		if(clsname && clsname.indexOf('-') === -1) Constructor = new Function('return '+Class.toString().replace(/Class/g,clsname))()
	}
	else{ //?
		
	}

	// connect 
	Constructor.prototype = proto 
	Object.defineProperty(proto, 'constructor', {configurable:true,value:Constructor})
	Constructor.extend = extend

	if(body){
		if(typeof body === 'function'){
			body.call(proto, this.prototype, proto)
		}
		else if(typeof body === 'object'){
			for(var key in body){
				proto[key] = body[key]
			}
		}
	}

	if(proto.constructor !== Constructor){
		Constructor = proto.constructor
		Constructor.extend = extend
	}

	if(this.prototype.onextendclass) this.prototype.onextendclass.call(proto)

	return Constructor
}

module.exports = extend.call(Object)

function defineNestedGetterSetter(key){
	Object.defineProperty(this, key, {
		configurable:true,
		get:function(){
			var cls = this['_' + key]
			cls.outer = this
			return cls
		},
		set:function(prop){
			var base = this['_' + key]
			var cls = this['_' + key] = base.extend(prop)
			if(this.onnestedassign) this.onnestedassign(key, cls)
		}
	})
}

Object.defineProperty(module.exports.prototype, 'nested', {
	get:function(){
		return this._nested
	},
	set:function(nested){
		if(!this.hasOwnProperty('_nested')) this._nested = this._nested?Object.create(this._nested):{}

		for(var key in nested){
			var cls =  nested[key]
			this._nested[key] = true
			this['_' + key] = cls
			defineNestedGetterSetter.call(key)
			if(this.onnestedassign) this.onnestedassign(key, cls)
		}	
	}
})