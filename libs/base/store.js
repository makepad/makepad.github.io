
var ProxyFallback = true
var proxyFallbackInit 

var MakeProxy = function(value) {
	if(value && value.constructor === Map){
		return new ProxyMap(value)
	}
	return new Proxy(value, proxyHandler)
}

class ProxyMap{
	constructor(map){
		this['__unwrap__'] = map
	}

	get(key){
		var map = this['__unwrap__']
		return proxyHandlerGet(map, key, map.get(key))
	}

	set(key, value){
		var map = this['__unwrap__']
		var old = map.get(key)
		proxyHandlerSet(map, key, value, old)
		map.set(key, value)
	}

	// TODO wrap these
	keys(){
		var map = this['__unwrap__']
		return map.keys()
	}

	// TODO wrap these
	values(){
		throw new Error("values() not implemented")
	}

	delete(key){
		var map = this['__unwrap__']
		var old = map.get(index)
		proxyHandlerSet(map, index, undefined, old)
		map.delete(key)
	}

	clear(){
		var map = this['__unwrap__']
		for(let key of map.keys()){
			proxyHandlerSet(map, key, undefined, map.get(old))
		}
		map.clear()
	}

	get __proxymeta__(){
		return proxyMeta.get(this['__unwrap__'])
	}
}

function defineObjectProperty(proto, key){
	Object.defineProperty(proto, key, {
		configurable:true,
		get:function(){
			var object =  this['__unwrap__']
			return proxyHandlerGet(object, key, object[key])
		},
		set:function(value){
			var object =  this['__unwrap__']
			var old = object[key]
			proxyHandlerSet(object, key, value, old)
			object[key] = value
		}
	})
}

function defineArrayProperty(proto, i){
	Object.defineProperty(proto, i, {
		get:function(){
			var array = this['__unwrap__']
			return proxyHandlerGet(array, i, array[i])
		},
		set:function(value){
			var array = this['__unwrap__']
			var old = array[i]
			proxyHandlerSet(array, i, value, old)
			array[i] = value
		}
	})
}

if(ProxyFallback){
	// dont use proxies
	var protoKeyCount = 0


	class ProxyObject{
		constructor(object){
			// helper property to quickly access underlying object
			Object.defineProperty(this, '__unwrap__', {
				configurable:true,
				value:object
			})

			for(let key in object){
				var value = object[key]
				if(typeof value === 'function') continue
				var proto = ProxyObject.prototype

				if(!proto.__lookupSetter__(key)){
					if(protoKeyCount++ > 10000){
						console.log("Performance warning, observed data should use non-unique keynames, or turn of ProxyFallback")
					}
					defineObjectProperty(proto, key)
				}
				// make it enumerable, seems to not be slow
				var desc = Object.getOwnPropertyDescriptor(proto, key)
				desc.enumerable = true
				Object.defineProperty(this, key, desc)
			}
		}

		get __proxymeta__(){
			return proxyMeta.get(this['__unwrap__'])
		}
	}

	class ProxyArray{
		constructor(array){
			this._defineProxyProps(array.length)
			Object.defineProperty(this, '__unwrap__', {
				configurable:true,
				value:array
			})
		}

		push(...args){
			var array = this['__unwrap__']
			var total = array.length + args.length
			this._defineProxyProps(total)
			for(let i = array.length, j = 0; i < total; i++, j++){
				this[i] = args[j]
			}
		}

		pop(){
			var array = this['__unwrap__']
			var len = array.length
			if(!len) return
			var ret = this[len - 1]
			this[len - 1] = undefined
			array.length --
			return ret
		}

		forEach(cb){
			var array = this['__unwrap__']
			for(let i = 0, l = array.length; i < l; i++){
				cb(this[i], i, this)
			}
		}
		
		forEachUnwrap(...args){
			var array = this['__unwrap__']
			return array.forEach(...args)
		}

		map(...args){ 
			var array = this['__unwrap__']
			var out = []
			for(let i = 0, l = array.length; i < l; i++){
				out[i] = this[i]
			}
			return out.map(...args)
		}

		indexOf(thing){
			var array = this['__unwrap__']
			var proxy = thing && thing.__proxymeta__
			if(proxy) thing = proxy.object
			return array.indexOf(thing)
		}

		get length(){
			var array = this['__unwrap__']
			return proxyHandlerGet(array, 'length', array.length)
		}

		set length(value){
			var array = this['__unwrap__']
			var oldLen = array.length
			// if shorten
			for(var i = oldLen - 1; i >= value; i--){
				this[i] = undefined
			}
			// assure length
			this._defineProxyProps(value)
			var oldlen = array.length
			array.length = value
			proxyHandlerSet(array, 'length', value, oldlen)
		}

		_defineProxyProps(len){
			var proto = ProxyArray.prototype
			for(let i = len -1; i >=0 ; i--){
				if(proto.__lookupGetter__(i))break
				defineArrayProperty(proto, i)
			}
		}

		get __proxymeta__(){
			return proxyMeta.get(this['__unwrap__'])
		}
	}

	MakeProxy = function(object) {
		var ret

		if(Array.isArray(object)){
			ret = new ProxyArray(object)
		}
		else if(object.constructor === Map){
			ret = new ProxyMap(object)
		}
		else{
			ret = new ProxyObject(object)
			if(object instanceof Store){
				var keys = Object.getOwnPropertyNames(Object.getPrototypeOf(object))
				for(let i = 0; i < keys.length; i++){
					var key = keys[i]
					ret[key] = object[key]
				}
			}
			else Object.seal(ret)
		}
		return ret
	}

	proxyFallbackInit = function(object, input){
		var keys = Object.keys(input)
		for(var i = 0; i < keys.length; i++){
			let key = keys[i]
			if(!input.__lookupSetter__(key)){
				var value = input[key]
				if(typeof value === 'function') continue
				// store it on backing object
				object[key] = value
				Object.defineProperty(input, key, {
					get:function(){
						var object = this['__unwrap__']
						return proxyHandlerGet(object, key, object[key])
					},
					set:function(value){
						var object = this['__unwrap__']
						var old = object[key]
						proxyHandlerSet(object, key, value, old)
						object[key] = value
					}
				})
			}
		}
	}
}

var proxyMeta = new WeakMap()
var storeData = new WeakMap()

//
//
//  Datastore
//
//

function storeProxyMeta(value, store){
	var meta = {
		object:value, 
		proxy:MakeProxy(value, proxyHandler),
		store:store,
		parents:[],
		observers:[]
		//parenting:[]
	}
	proxyMeta.set(value, meta)
	return meta
}

var proxyHandler = {
	get:(target,key)=>{
		if(key === '__proxymeta__'){
			return proxyMeta.get(target)
		}
		return proxyHandlerGet(target, key, target[key])
	},
	set:(target,key,value)=>{
		var old = target[key]
		target[key] = value
		return proxyHandlerSet(target, key, value, old)
	}
}

function parentIndex(key, array){
	for(let i = array.length -2; i>=0; i-=2){
		if(array[i] === key) return i
	}
	return -1
}

function proxyHandlerSet(target, key, newValue, oldValue){
	var baseMeta = proxyMeta.get(target)
	var data = storeData.get(baseMeta.store)
	if(data.locked) throw new Error("Cannot set value on a locked store")

	//var oldValue = target[key]
	var oldReal = oldValue
	if(!data.allowNewKeys && !Array.isArray(target) && !(key in target) && !baseMeta.isRoot){
		throw new Error('Adding new keys to an object is turned off, please specify it fully when adding it to the store')
	}

	// make map on read and write
	var oldObservers
	if(typeof oldValue === 'object' && oldValue){
		var oldMeta = proxyMeta.get(oldValue)
		if(oldMeta){
			oldObservers = oldMeta.observers
			// remove old parent connection
			var parents = oldMeta.parents
			var idx = parents.indexOf(key)
			if(idx === -1) throw new Error('inconsistency, parent array '+key)
			var p = parents[idx+1]
			var idx = p.indexOf(baseMeta)
			if(idx === -1) throw new Error('inconsistency, no key '+key)
			if(p.length === 1) parents.splice(idx, 2)
			else p.splice(idx, 1)
			//for(let i = 0, l = oldMeta.parenting.length; i < l; i++){
			//	oldMeta.parenting[i]({type:'remove',$meta:oldMeta})
			//}
			oldValue = oldMeta.proxy
		}
	}

	//var newValue = value
	var newReal = newValue
	if(typeof newValue === 'object' && newValue){
		var newMeta = newValue.__proxymeta__ // the value added was a proxy
		// otherwise 
		if(!newMeta && (Array.isArray(newValue)||newValue.constructor === Object||newValue.constructor === Map)){
			// wire up parents
			newMeta = proxyMeta.get(newValue) || storeProxyMeta(newValue, baseMeta.store)
		}
		if(newMeta){
			// wire up parent relationship
			var parents = newMeta.parents
			var idx = parents.indexOf(key)
			if(idx===-1) parents.push(key,[baseMeta])
			else {
				var p = parents[idx+1]
				if(p.indexOf(baseMeta) === -1) p.push(baseMeta)
			}
			// copy oldObservers
			if(oldObservers && oldObservers.length){
				newMeta.observers.push.apply(newMeta.observers, oldObservers)
			}
			//for(let i = 0, l = newMeta.parenting.length; i < l; i++){
			//	oldMeta.parenting[i]({type:'add',$meta:oldMeta})
			//}

			// replace return value with proxy
			newValue = newMeta.proxy
			newReal = newMeta.object
		}
	}

	data.changes.push({
		object:baseMeta.proxy,value:newValue, key:key, $value:newReal, $object:target, $meta:baseMeta, old:oldValue, $old:oldReal
	})

	return true
}

function proxyHandlerGet(target, key, value){
	var baseMeta = proxyMeta.get(target)
	//var value = target[key]
	if(typeof value === 'object' && value && (Array.isArray(value)||value.constructor === Object||value.constructor === Map)){
		var valueMeta = proxyMeta.get(value) || storeProxyMeta(value, baseMeta.store)
		
		var parents = valueMeta.parents
		var idx = parents.indexOf(key)
		if(idx===-1) parents.push(key,[baseMeta])
		else {
			var p = parents[idx+1]
			if(p.indexOf(baseMeta) === -1) p.push(baseMeta)
		}

		return valueMeta.proxy
	}
	return value
}

class Store extends require('base/class'){
	constructor(){
		throw new Error("Cant new Store, use .create")
	}

	static create(allowNewKeys){
		var store = Object.create(Store.prototype)
		var proxy = MakeProxy(store, proxyHandler)

		var info = storeProxyMeta(store, store)
		info.isRoot = true

		storeData.set(store, {
			changes:[],
			eventMap:new Map(),
			locked:true,
			allowNewKeys:allowNewKeys
		})

		return proxy
	}
	/*
	indexMap(array, maxLevel, cb){
		this.observe(array, e=>{
			if(e.level == -1){ // reinitialize
				array = e.changes[0].value
				var index = array.index || (array.index = new Map())
				for(let i = 0, l = array.length; i < l; i++){
					cb(index, array[i], i)
				}
			}
			var index = array.index || (array.index = new Map())
			if(e.level>maxLevel) return // bail
			if(e.level === 0 && maxLevel === 0){ // only process changes
				var changes = e.changes
				for(let i = 0, l = changes.length; i < l; i++){
					var change = changes[i]
					cb(index, change.$value, change.key)
				}
			}
			else{ // always reinitialize map
				index.clear()
				for(let i = 0, l = array.length; i < l; i++){
					cb(index, array[i], i)
				}
			}
		})
	}*/

	/*
	wrap(object){
		var base = this.__proxymeta__
		var meta = object.__proxymeta__
		if(meta) return meta.proxy//throw new Error("Object is already wrapped") 
		meta = storeProxyMeta(object, base.store)
		return meta.proxy
	}*/

	unwrap(object){
		if(!object) return
		var meta = object.__proxymeta__
		if(!meta) return object//throw new Error("Object is not wrapped")
		return meta.object
	}

	anyChanges(obs, level, ...query){
		if(level !== obs.level) return
		let ret = []
		let changes = obs.changes
		let q = query[query.length - 1]
		for(let i = changes.length-1; i >=0 ; --i){
			var change = changes[i]
			let p = change.key
			if(!(q === null || typeof q === 'object' && (Array.isArray(q) && q.indexOf(p) !== -1 || q.constructor === RegExp && p.match(q)) || q === p)){
				continue
			}
			if(query.length === 1){
				return change
				continue
			}
			// lets walk up the parent chain whilst matching query
			var parents = change.$meta.parents
			for(var j = query.length - 2; j>=0 ;--j){
				q = query[j]
				let nextParents = null
				for(let k = parents.length -1; k>=0; k-=2){
					let p = parents[k-1]
					if(q === null || typeof q === 'object' && (Array.isArray(q) && q.indexOf(p) !== -1 || q.constructor === RegExp && p.match(q)) || q === p){
						nextParents = parents[k].parents
						break
					}
				}
				if(!nextParents) break
				parents = nextParents
			}
			if(j>=0){//matched
				return change
			}
		}
	}

	allChanges(obs, level, ...query){
		if(level !== obs.level) return
		let ret = []
		let changes = obs.changes
		let q = query[query.length - 1]
		for(let i = 0; i < changes.length; ++i){
			let change = changes[i]
			let p = change.key
			if(!(q === null || typeof q === 'object' && (Array.isArray(q) && q.indexOf(p) !== -1 || q.constructor === RegExp && p.match(q)) || q === p)){
				continue
			}
			if(query.length === 1){
				ret.push(change)
				continue
			}
			// lets walk up the parent chain whilst matching query
			let parents = change.$meta.parents
			for(j = query.length - 2; j>=0 ;j--){
				q = query[j]
				let nextParents = null
				for(let k = parents.length -1; k>=0; k-=2){
					let p = parents[k-1]
					if(q === null || typeof q === 'object' && (Array.isArray(q) && q.indexOf(p) !== -1 || q.constructor === RegExp && p.match(q)) || q === p){
						nextParents = parents[k].parents
						break
					}
				}
				if(!nextParents) break
				parents = nextParents
			}
			if(j>=0){//matched
				ret.push(change)
			}
		}
		return ret
	}

	observe(object, observer/*, parenting*/){
		var meta = object.__proxymeta__
		if(!meta) throw new Error("Object is not observable. use store.wrap() or add it to the store and reference it from the store")
		meta.observers.push(observer)
		return meta.proxy
	}

	act(name, actor, debug){
		var meta = this.__proxymeta__
		var store = storeData.get(meta.object)
		if(!store.locked){
			throw new Error("Recursive store access not allowed")
		}

		store.locked = false
		var changes = store.changes = []
		try{
			actor(this)
		}
		catch(e){
		//	console.log("WHATTHEFUCK")
		}
		finally{
			// process changes to this if we are running proxyFallback
			if(proxyFallbackInit){
				proxyFallbackInit(meta.object, this)
			}
			store.locked = true
			return processChanges(name, changes, store, debug)
		}
	}
}
// process all changes

function processChanges(name, changes, store, debug){
	var eventMap = new Map()
	// process all changes and fire listening properties
	for(let i = 0, l = changes.length; i < l; i++){
		let change = changes[i]
		
		let meta = proxyMeta.get(change.$value)
		var observers = meta && meta.observers
		if(observers && observers.length){
			pathBreak.set(change.$value, change)
			for(let j = observers.length - 1; j>=0; j--){
				var observer = observers[j]
				var event = eventMap.get(observer)
				if(event) event.changes.push(change)
				else eventMap.set(observer, {name:name, level:-1, changes:[change]})
				//if(event && event.name !== name) console.log("WHATTHEHELL")
			}
		}
		scanParents(name, change.$object, change, 0, eventMap)
	}
	eventMap.forEach((event, observer)=>{
		if(debug) console.log(event, observer.pthis?[observer.pthis,observer.key]:observer)//dbg.push({event:event, observer:observer.toString()})
		observer(event)
	})
}

var pathBreak = new WeakMap()
function scanParents(name, node, change, level, eventMap){
	if(pathBreak.get(node) === change) return
	pathBreak.set(node, change)
	var meta = proxyMeta.get(node)
	var observers = meta.observers
	for(let j = observers.length - 1; j>=0; j--){
		var observer = observers[j]
		var event = eventMap.get(observer)
		if(event) event.changes.push(change)
		else eventMap.set(observer,{name:name, level:level, changes:[change]})
	}
	
	var parents = meta.parents
	for(let j = parents.length - 1; j>=0; j-=2){
		var list = parents[j]
		for(let i = list.length-1; i>=0; i--){
			scanParents(name, list[i].object, change, level +1, eventMap)
		}
	}
}

module.exports = Store