module.exports = class Styles extends require('base/class'){
	prototype(){
		this.inheritable('styles', function(){
			var styles = this.styles
			this._stylesProto = protoInherit(this._stylesProto, styles)
			this.styles = protoProcess('', this._stylesProto, null, null, null, new WeakMap())
		})
	}
}

// creates a prototypical inheritance overload from an object
function protoInherit(oldobj, newobj){
	// copy oldobj
	var outobj = oldobj?Object.create(oldobj):{}
	// copy old object subobjects
	for(let key in oldobj){
		var item = oldobj[key]
		if(item && item.constructor === Object){
			outobj[key] = protoInherit(item, newobj && newobj[key])
		}
	}
	// overwrite new object
	for(let key in newobj){
		var item = newobj[key]
		if(item && item.constructor === Object){
			outobj[key] = protoInherit(oldobj && oldobj[key], newobj && newobj[key])
		}
		else{
			//if(typeof item === 'string' && item.charAt(0) === '#'){
			//	item = module.exports.prototype.parseColor(item,1)
			//}
			outobj[key] = item
		}
	}
	return outobj
}
module.exports.protoInherit = protoInherit


// we have to return a new objectect
function protoProcess(name, base, ovl, parent, incpy, parents){
	var cpy = incpy
	var out = {}
	Object.defineProperty(out, 'name', {value:name})
	parents.set(out, parent)
	// make sure our copy props are read first
	for(let key in base){
		var value = base[key]
		var $index = key.indexOf('$')
		if($index === 0){
			cpy = cpy?cpy === incpy?Object.create(cpy):cpy:{}
			cpy[key.slice(1)] = value
		}
	}
	for(let key in ovl){
		var value = ovl[key]
		var $index = key.indexOf('$')
		if($index === 0){
			cpy = cpy?cpy === incpy?Object.create(cpy):cpy:{}
			cpy[key.slice(1)] = value
		}
	}
	for(let key in base){
		var value = base[key]
		var $index = key.indexOf('$')
		if($index === 0){}
		else if($index >0){
			var keys = key.split('$')
			var o = out, bc = keys[1]
			while(o && !o[bc]) o = parents.get(o)
			var key0 = keys[0]
			out[key0] = protoProcess(key0, o && o[bc], value, out, cpy, parents)
		}
		else if(value && value.constructor === Object){
			out[key] = protoProcess(key, value, null, out, cpy, parents)
		}
		else{
			out[key] = value
		}
	}
	for(let key in ovl){
		var value = ovl[key]
		var $index = key.indexOf('$')
		if($index === 0){ }
		else if($index>0){
			var keys = key.split('$')
			var o = out, bc = keys[1]
			while(o && !o[bc]) o = parents.get(o)
			var key0 = keys[0]
			out[key0] = protoProcess(key0, out[key0], protoProcess(key0, o && o[bc], value, out, cpy, parents), out, cpy, parents)
		}
		else if(value && value.constructor === Object){
			out[key] = protoProcess(key, out[key], value, out, cpy, parents)
		}
		else{
			out[key] = value
		}
	}
	for(let key in cpy){
		out[key] = cpy[key]
	}
	return out
}

module.exports.protoProcess = protoProcess
