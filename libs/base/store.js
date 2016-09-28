// mapping relational data
var relationalMap = new WeakMap()

function defObservableProp(obj, key, value, init){
	
	function get(){
		// notify observers
		return this.__values__[key]
	}

	function set(v, init){
		var store = this.__store__
		if(store.__locked__){
			let path = store.path(this)
			throw new Error("Cannot modify "+path.join('.')+""+key+" unless executed in store.act")
		}

		if(Array.isArray(v)){
			let vn = relationalMap.get(v) || new store.constructor.ObservableArray(v, key, store)
			relationalMap.set(v, vn)
			v = vn
		}
		else if(typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype){
			let vn = relationalMap.get(v) || new store.constructor.ObservableObject(v, key, store)
			relationalMap.set(v, vn)
			v = vn
		}
				
		if(!init){
			var old = this.__values__[key]

			// copy observers over if there are any
			if(typeof old === 'object' && old.__observers__ && typeof v === 'object' && v.__observers__){
				v.__observers__.push.apply(v.__observers__, old.__observers__)
				// remove from old
				old.__observers__.length = 0
			}

			// track the changes
			store.__changes__.push({object:this, key:key, old:old, value:v})

			// deref old parents
			if(typeof old === 'object' && old.__parents__){
				for(var i = 0, parents = old.__parents__, l = parents.length; i < l; i++){
					var parent = parents[i]
					if(parent.object === this && parent.key === key) break
				} 
				if(i !== l) old.__parents__.splice(i, 1)
				else console.error("referential error in __parents__ "+key)
			}
		}
		if(typeof v === 'object' && v.__parents__){
			//TODO check for double entry
			v.__parents__.push({
				object:this,
				key:key
			})
		}

		// fire observers somehow
		this.__values__[key] = v
	}

	Object.defineProperty(obj, key, {
		configurable:true,
		get:get,
		set:set
	})

	if(obj.__values__) set.call(obj, value, init)
}


module.exports = class Store extends require('base/class'){
	prototype(){

		this.constructor.ObservableObject = class ObservableObject{
			constructor(obj, key, store){
				Object.defineProperty(this, '__parents__',{value:[]})
				Object.defineProperty(this, '__store__',{value:store})
				Object.defineProperty(this, '__observers__',{value:[]})
				Object.defineProperty(this, '__values__',{value:{}})
				// copy it
				if(obj.constructor !== Object) throw new Error("Can only observe plain objects")

				// setting an object as __modifyable__ exposes a set method to create new keys
				if(obj.__modifyable__){
					Object.defineProperty(this, 'set', {value:function(key, value){
						if(key in this) this[key] = value
						else defObservableProp(this, key, value, false)
					}})
				}

				for(var key in obj){
					if(key === '__modifyable__') continue
					defObservableProp(this, key, obj[key], true)
				}
				// normal objects are sealed
				if(!obj.__modifyable__) Object.seal(this)
			}
		}

		this.constructor.ObservableArray = class ObservableArray{
			constructor(array, key, store){
				this.length = 0
				Object.defineProperty(this, '__parents__',{value:[]})
				Object.defineProperty(this, '__store__',{value:store})
				Object.defineProperty(this, '__observers__',{value:[]})
				Object.defineProperty(this, '__values__',{value:{}})
				var length = array.length
				this.__assurelength__(length)
				for(let i = 0; i < length; i++){
					let set = this.__lookupSetter__(i)
					set.call(this, array[i], true)
				}
				this.__length__ = length
			}

			push(...args){
				var total = this.__length__ + args.length
				this.__assurelength__(total)
				for(let i = this.__length__, j = 0; i < total; i++, j++){
					this[i] = args[j]
				}
				this.__length__ = total
			}

			pop(){
				if(!this.__length__) return
				var ret = this[this.__length__ - 1]
				this[this.__length__ - 1] = undefined
				this.__length__ --
				return ret
			}

			indexOf(thing){
				var values = this.__values__
				for(let i = 0, l = this.__length__; i < l; i++){
					if(value[i] === thing) return i
				}
				return -1
			}

			shift(){
				console.error("IMPLEMENT SHIFT")
			}

			unshift(){
				console.error("IMPLEMENT UNSHIFT")
			}

			splice(){
				console.error("IMPLEMENT SPLICE")
			}

			get length(){
				return this.__length__
			}

			set length(v){
				var oldLen = this.__length__
				// if shorten
				for(var i = oldLen - 1; i >= v; i--){
					this[i] = undefined
				}
				// assure length
				this.__assurelength__(v)
			}

			__assurelength__(len){
				var proto = ObservableArray.prototype
				for(let i = len -1; i >=0 ; i--){
					if(proto.__lookupGetter__(i))break
					defObservableProp(proto, i, undefined, true)
				}
			}
		}
		// lets make sure nobody can overwrite methods
		var keys = Object.getOwnPropertyNames(this)
		for(let i = 0; i < keys.length; i++){
			var key = keys[i]
			if(key === 'constructor' || key === 'prototype') continue
			var value = this[key]
			Object.defineProperty(this, key, {value:value})
		}
	}

	constructor(){
		super()
		// initialize computed value getters
		Object.defineProperty(this, '__parents__',{value:[]})
		Object.defineProperty(this, '__store__',{value:this})
		Object.defineProperty(this, '__observers__',{value:[]})
		Object.defineProperty(this, '__values__',{value:{}})
		Object.defineProperty(this, '__locked__',{writable:true, value:true})
		Object.defineProperty(this, '__debug__',{writable:true, value:false})
		Object.defineProperty(this, '__changes__',{writable:true, value:undefined})
		Object.defineProperty(this, '__eventmap__',{writable:true, value:new Map()})
	}

	path(node){
		var path = []
		var loop = 1
		while(node){
			let parents = node.__parents__
			if(!parents || !parents.length)break
			if(parents.length>1){
				path.unshift('<multiple>')
				break
			}
			path.unshift(parents[0].key)
			node = parents[0].object
			if(loop++>100){
				break
				path = ['<cyclical>']
			}
		}
		return path
	}

	observe(object, cb){
		if(!object.__observers__) throw new Error("Cannot observe, object not observable")
		object.__observers__.push(cb)
	}
	
	destroy(object){
		// lets remove our object from all its parents
		var parents = object.__parents__
		for(let i = 0, l = parents.length; i < l; i++){
			parent = parents[i]
			// remove it
			parent.object[parent.key] = undefined
		}
		object.__parents__.length = 0
	}

	debug(set){
		this.__debug__ = set
	}

	// start a transaction
	act(name, actor){
		
		if(!this.__locked__){
			throw new Error("Recursive store access not allowed")
		}

		// check we didnt pollute the store
		var keys = Object.keys(this)
		for(let i = 0; i < keys.length; i++){
			let key = keys[i]
			if(this.__lookupSetter__(key)) continue
			throw new Error("Store polluted with "+key)
		}

		// unlock the store
		this.__locked__ = false
		var changes = this.__changes__ = []
		try{
			actor(this)
		}
		finally{

			this.__changes__ = undefined

			// process newly defined props
			var keys = Object.keys(this)
			for(let i = 0; i < keys.length; i++){
				let key = keys[i]
				if(this.__lookupSetter__(key)) continue
				var value = this[key]
				defObservableProp(this, key, value, true)
			}

			this.__locked__ = true

			var eventMap = this.__eventmap__
			eventMap.clear()
			// process all changes and fire listening properties
			for(let i = 0, l = changes.length; i < l; i++){
				let change = changes[i]
				// also fire on the observers of the value
				let observers = typeof change.value === 'object' && change.value.__observers__
				if(observers){
					pathBreak.set(change.value, change)
					for(let j = observers.length - 1; j>=0; j--){
						var observer = observers[j]
						var event = eventMap.get(observer)
						if(event) event.changes.push(change)
						else eventMap.set(observer, {name:name, level:-1, changes:[change]})
					}
				}

				scanParents(name, change.object, change, 0, eventMap)
			}
			//console.log(changes, eventMap)
			eventMap.forEach((event, observer)=>{
				observer(event)
			})
		}
	}

	// serialize the entire store to typed array
	serialize(){
		
	}

	// deserialize the entire store from typed array
	deserialize(){
		
	}
}

var pathBreak = new WeakMap()
function scanParents(name, node, change, level, eventMap){
	if(pathBreak.get(node) === change) return
	pathBreak.set(node, change)
	var observers = node.__observers__
	for(let j = observers.length - 1; j>=0; j--){
		var observer = observers[j]
		var event = eventMap.get(observer)
		if(event) event.changes.push(change)
		else eventMap.set(observer,{name:name, level:level, changes:[change]})
	}

	var parents = node.__parents__
	for(let i = parents.length - 1; i>=0; i--){
		var parent = parents[i].object
		scanParents(name, parent, change, level +1, eventMap)
	}
}
