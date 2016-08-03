// lets create a constructor
var frozen = Object.freeze({})
function extend(body){

	var proto = Object.create(this.prototype)

	function Class(){
		var cthis = this
		if(!(cthis instanceof Class)){
			cthis = Object.create(Class.prototype)
		}
		if(cthis._onConstruct){
			cthis._onConstruct.apply(cthis, arguments)
		}
		if(cthis.onConstruct){
			cthis.onConstruct.apply(cthis, arguments)
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

	// apply all args
	for(var i = 0; i < arguments.length; i++){
		var iter = arguments[i]
		if(typeof iter === 'function'){
			var check = {}
			body.call(check, proto, this.prototype)
			var keys = Object.keys(check)
			if(keys.length){
				throw new Error('Dont assign things to this in class body, use proto as first arg: this.'+keys.join(', '))
			}
		}
		else if(typeof iter === 'object'){
			for(var key in iter){
				proto[key] = iter[key]
			}
		}
	}

	if(proto.constructor !== Constructor){
		Constructor = proto.constructor
		Constructor.extend = extend
	}

	if(this.prototype.onextendclass) this.prototype.onextendclass.call(proto)
	Constructor.body = body
	return Constructor
}

module.exports = extend.call(Object)
Object.defineProperty(module.exports.prototype,'mixin',{
	set:function(v){
		if(Array.isArray(v)){
			for(var i = 0; i < v.length; i++){
				var fn = v[i]
				fn(this)
			}
		}
		else v(this)
	}, 
	get:function(){
		throw new Error('mixin is a setter only')
	}
})