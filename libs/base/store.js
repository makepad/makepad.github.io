
var ProxyFallback = false

var MakeProxy = function(value, handler) {
	return new Proxy(value, handler)
}

if(ProxyFallback){
	// dont use proxies
	class ProxyObject{
		constructor(object, handler){
			Object.defineProperty(this, '__proxymeta__', {
				get:function(){
					return proxyMeta.get(object)
				}
			})
			Object.defineProperty(this, '__proxyfallback__', {
				value:function(){
					var keys = Object.keys(this)
					for(var i = 0; i < keys.length; i++){
						let key = keys[i]
						if(!this.__lookupSetter__(key)){
							var value = this[key]
							if(typeof value === 'function') continue
							// store it on backing object
							object[key] = value
							Object.defineProperty(this, key, {
								get:function(){
									return handler.get(object, key)
								},
								set:function(value){
									return handler.set(object, key, value)
								}
							})
							// initialize
							this[key] = object[key]
						}
					}
					return proxyMeta.get(object)
				}
			})
			for(let key in object){
				var value = object[key]
				if(typeof value === 'function') continue
				Object.defineProperty(this, key, {
					get:function(){
						return handler.get(object, key)
					},
					set:function(value){
						return handler.set(object, key, value)
					}
				})
			}
		}
	}

	class ProxyArray{
		constructor(array, handler){
			this._array = array
			this._handler = handler
			this._defineProxyProps(array.length)
			Object.defineProperty(this, '__proxymeta__', {
				get:function(){
					return proxyMeta.get(array)
				}
			})
		}

		push(...args){
			var total = this._array.length + args.length
			this._defineProxyProps(total)
			for(let i = this._array.length, j = 0; i < total; i++, j++){
				this[i] = args[j]
			}
		}

		pop(){
			var len = this._array.length
			if(!len) return
			var ret = this[len - 1]
			this[len - 1] = undefined
			this._array.length --
			return ret
		}

		indexOf(thing){
			return this._array.indexOf(thing)
		}

		get length(){
			return this._array.length
		}

		set length(value){
			var oldLen = this._array.length
			// if shorten
			for(var i = oldLen - 1; i >= v; i--){
				this[i] = undefined
			}
			// assure length
			this._defineProxyProps(v)
			this._array.length = value
		}

		_defineProxyProps(len){
			var proto = ProxyArray.prototype
			for(let i = len -1; i >=0 ; i--){
				if(proto.__lookupGetter__(i))break
				Object.defineProperty(proto, i, {
					get:function(){
						return this._handler.get(this._array, i)
					},
					set:function(value){
						return this._handler.set(this._array, i, value)
					}
				})
			}
		}
	}

	MakeProxy = function(object, handler) {
		var ret
		if(Array.isArray(object)){
			ret = new ProxyArray(object, handler)
		}
		else{
			ret = new ProxyObject(object, handler)
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
		parents:{},
		observers:[]
	}
	proxyMeta.set(value, meta)
	return meta
}

var proxyHandler = {
	set(target, key, value){

		var baseMeta = proxyMeta.get(target)
		var data = storeData.get(baseMeta.store)
		if(data.locked) throw new Error("Cannot set value on a locked store")

		var oldValue = target[key]
		var oldReal = oldValue
		if(!data.allowNewKeys && !(key in target) && !baseMeta.isRoot){
			throw new Error('Adding new keys to an object is turned off, please specify it fully when adding it to the store')
		}

		// make map on read and write
		var oldObservers
		if(typeof oldValue === 'object' && oldValue){
			var oldMeta = proxyMeta.get(oldValue)
			if(oldMeta){
				oldObservers = oldMeta.observers
				// remove old parent connection
				var p = oldMeta.parents[key]
				if(!p) throw new Error('inconsistency, parent array'+key)
				var idx = p.indexOf(baseMeta)
				if(idx === -1) throw new Error('inconsistency, no key'+key)
				if(p.length === 1) delete oldMeta.parents[key]
				else p.splice(idx, 1)
				oldValue = oldMeta.proxy
			}
		}

		var newValue = value
		var newReal = value
		if(typeof newValue === 'object' && newValue){
			var newMeta = newValue.__proxymeta__ // the value added was a proxy
			//var newMeta = proxyMeta.get(newTarget)
			// otherwise 
			if(!newMeta && (Array.isArray(newValue)||newValue.constructor === Object)){
				// wire up parents
				newMeta = proxyMeta.get(newValue) || storeProxyMeta(newValue, baseMeta.store)
			}
			if(newMeta){
				// wire up parent relationship
				var p = newMeta.parents[key]
				if(!p) newMeta.parents[key] = [baseMeta]
				else if(p.indexOf(baseMeta) ===-1) p.push(baseMeta)
				// copy oldObservers
				if(oldObservers && oldObservers.length){
					newMeta.observers.push.apply(newMeta.observers, oldObservers)
				}
				// replace return value with proxy
				newValue = newMeta.proxy
				newReal = newMeta.object
			}
		}

		data.changes.push({
			object:baseMeta.proxy, $meta:baseMeta, key:key, old:oldValue, $old:oldReal, value:newValue, $value:newReal, $object:target
		})

		target[key] = value
		return true
	},
	get(target, key){
		// ugly because ms edge doesnt support weakmaps on proxies
		// we have to pollute the keyspace with this key
		var baseMeta = proxyMeta.get(target)
		if(key === '__proxymeta__'){
			return baseMeta
		}
		var value = target[key]
		if(typeof value === 'object' && (Array.isArray(value)||value.constructor === Object)){
			var valueMeta = proxyMeta.get(value) || storeProxyMeta(value, baseMeta.store)
			var p = valueMeta.parents[key]
			if(!p) valueMeta.parents[key] = [baseMeta]
			else if(p.indexOf(baseMeta) ===-1) p.push(baseMeta)
			return valueMeta.proxy
		}
		return value
	}
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
	
	observe(proxy, cb){
		var meta = proxy.__proxymeta__
		if(!meta) throw new Error("Cannot observe non proxy object")
		meta.observers.push(cb)
	}

	act(name, actor){
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
		finally{
			// process changes to this if we are running proxyFallback
			if(this.__proxyfallback__) this.__proxyfallback__()
			store.locked = true
			processChanges(name, changes, store)
		}
	}
}

// process all changes

function processChanges(name, changes, store){
	var eventMap = store.eventMap
	eventMap.clear()
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
			}
		}
		scanParents(name, change.$object, change, 0, eventMap)
	}
	eventMap.forEach((event, observer)=>{
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
	for(let key in parents){
		var list = parents[key]
		for(let i = list.length-1; i>=0; i--){
			scanParents(name, list[i].object, change, level +1, eventMap)
		}
	}
}

module.exports = Store