
function defObservableProp(obj, key, value){
	
	function get(){
		// notify observers
		return this.__values__[key]
	}
	function set(v, init){

		var store = this.__store__
		if(store.__readonly__){
			var base = ''
			var node = this
			var loop = 1
			while(node){
				base = node.__key__+'.' + base
				node = node.__parent__
				if(loop++>100){
					break
					base = 'cyclical'
				}
			}
			throw new Error("Cannot modify "+base+""+key+" unless executed in store.act")
		}

		if(Array.isArray(v)){
			v = new store.constructor.ObservableArray(v, key, this)
		}
		else if(typeof v === 'object' && v.constructor === Object){
			v = new store.constructor.ObservableObject(v, key, this)
		}

		if(!this.hasOwnProperty('__values__')) {
			Object.defineProperty(this, '__values__', {
				writable:true,
				value:this.__values__?Object.create(this.__values__):{}
			})
		}
		if(!init){
			var old = this.__values__[key]
			// copy listeners over if there are any
			if(typeof old === 'object' && old.__listeners__ && typeof v === 'object' && v.__listeners__){
				v.__listeners__.push.apply(v.__listeners__, old.__listeners__)
			}
			store.changes.push({obj:this, key:key, old:old, value:v})
		}
		// fire listeners somehow
		this.__values__[key] = v
	}

	Object.defineProperty(obj, key, {
		configurable:true,
		get:get,
		set:set
	})
	set.call(obj, value, true)
}

module.exports = class Store extends require('base/class'){
	prototype(){

		this.constructor.ObservableObject = class ObservableObject{
			constructor(obj, key, parent){
				Object.defineProperty(this, '__key__',{value:key})
				Object.defineProperty(this, '__parent__',{value:parent})
				Object.defineProperty(this, '__store__',{value:parent.__store__})
				Object.defineProperty(this, '__listeners__',{value:[]})
				// copy it
				if(obj.constructor !== Object) throw new Error("Can only observe plain objects")
				for(var key in obj){
					defObservableProp(this, key, obj[key])
				}
				// make sure its read only
				Object.seal(this)
			}

			__listen__(target, key){
				this.__listeners__.push({
					tgt:target,
					key:key
				})
			}
		}

		this.constructor.ObservableArray = class ObservableArray{
			constructor(array, key, parent){
				this.length = 0
				Object.defineProperty(this, '__key__',{value:key})
				Object.defineProperty(this, '__parent__',{value:parent})
				Object.defineProperty(this, '__store__',{value:parent.__store__})
				Object.defineProperty(this, '__listeners__',{value:[]})
				var length = array.length
				this.__assurelength__(length)
				for(let i = 0; i < length; i++){
					let set = this.__lookupSetter__(i)
					set.call(this, array[i], true)
				}
				this.length = length
			}

			push(...args){
				var total = this.length + args.length
				this.__assurelength__(total)
				for(let i = this.length, j = 0; i < total; i++, j++){
					this[i] = args[j]
				}
				this.length += args.length
			}

			pop(){
				if(!this.length) return
				var ret = this[this.length - 1]
				this[this.length -1] = undefined
				this.length --
			}

			splice(){
				console.error("IMPLEMENT SPLICE")
			}

			__listen__(target, key){
				this.__listeners__.push({
					tgt:target,
					key:key
				})
			}

			__assurelength__(len){
				var proto = ObservableArray.prototype
				for(let i = len -1; i >=0 ; i--){
					if(proto.__lookupGetter__(i))break
					defObservableProp(this, i, undefined)
				}
			}
		}
	}

	constructor(){
		super()
		// initialize computed value getters
		this.__store__ = this
		this.__key__ = this.constructor.name || 'Store'
		this.readonly = true
		this.changes = []
		this.listeners = []
	}

	// start a transaction
	act(name, actor){
		
		// we pass the actor a prototype copy of ourselves
		var copy = Object.create(this)
		Object.defineProperty(copy,'__values__',{value:this.__values__})
		this.__readonly__ = false
		var changes = this.changes = []
		var ignore = actor(copy)
		var keys = Object.keys(copy)
		for(let i = 0; i < keys.length; i++){
			let key = keys[i]
			defObservableProp(this, key, copy[key])
		}
		if(this.debug){
			console.error("store.act "+name, changes)
		}

		// process all changes and fire listening properties
		for(let i = 0; i < changes.length; i++){
			let change = changes[i]
			// fire all the listeners on the parent
			let listeners = change.obj.__listeners__
			if(listeners){
				for(let j = 0; j < listeners.length; j++){
					let listen = listeners[j]
					let tgt = listen.tgt
					var set = tgt.__lookupSetter__(listen.key)
					set.call(tgt, change.value, true)
				}
			}
			// also fire on the listeners of the value
			listeners = typeof change.value === 'object' && change.value.__listeners__
			if(listeners){
				for(let j = 0; j < listeners.length; j++){
					let listen = listeners[j]
					let tgt = listen.tgt
					var set = tgt.__lookupSetter__(listen.key)
					set.call(tgt, change.value, true)
				}
			}
		}
		this.__readonly__ = true
	}
}