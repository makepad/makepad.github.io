var eventBlock = new WeakMap()
module.exports = class Props extends require('base/class'){
	// special names for property with name: key
	// this.key  <- getter setter for the key
	// this._key  <- the storage for a key
	// this.onkey  <- the listener chain for a key value change if(this.onkey) this.onkey({...})
	// this._onkey <- the listener flagset for flagged value change monitoring

	// inwards
	onFlag1(e){
		if(eventBlock.get(this)) return
		var config = this._props[e.key]
		var obj = this.find(config.inward)
		if(!obj) return
		eventBlock.set(obj, true)
		obj[config.prop] = e.value
		eventBlock.set(obj, false)
	}

	// outwards
	onFlag2(e){
		if(eventBlock.get(this)) return
		var out = this.$outwards[e.key]
		var obj = out.obj
		eventBlock.set(obj, true)
		obj[out.key] = e.value
		eventBlock.set(obj, false)
	}

	set props(props){
		for(let key in props){
			defineProp.call(this, key, props[key])
		}
	}

	get props(){
		return this._props
	}
}

// define props
function defineProp(key, value){
	// default
	if(typeof value !== 'object' || value === null || value.constructor !== Object){
		value = {value:value}
	}
	var initvalue = value.value

	if(!this.hasOwnProperty('_props')){
		this._props = this._props?Object.create(this._props):{}
	}

	var config = this._props[key] = this._props[key]?Object.create(this._props[key]):{}
	for(let cpy in value) config[cpy] = value[cpy]
	if(config.mask === undefined) config.mask = ~16

	// lets define a property
	var _key = '_' + key
	var onkey = 'on' + key.charAt(0).toUpperCase() + key.slice(1)
	var _onkey = '_on' + key.charAt(0).toUpperCase() + key.slice(1)

	if(config.inward){
		if(!this.hasOwnProperty('$inwards')) this.$inwards = this.$inwards?Object.create(this.$inwards):{}
		this.$inwards[key] = config
		this[_onkey] |= 1
	}

	this[_key] = initvalue
	var onthis = config.this

	function callListeners(value){
				
	}

	Object.defineProperty(this, key, {
		configurable:true,
		get:function(){
			if(this.onFlag) this[_onkey] |= this.onFlag
			return this[_key]
		},
		set:function set(value, event){
			var old = this[_key]
			this[_key] = value
			var meta = value && value.__proxymeta__
			//if(noconseq) return
			if(!event && meta){
				// set a listener on an object
				// but make sure we add only one
				var observers = meta.observers
				var i = observers.length - 1
				if(i>=0) for(; i >=0 ; i--){
					let observer = observers[i]
					if(observer.key === key && observer.pthis === this){
						break
					}
				}
				if(i<0){
					var observe = (e)=>{
						var value 
						if(e.level === -1) value = e.changes[0].value // only change value when the self of the observe changes
						else value = this[_key]
						set.call(this, value, e)
					}
					observe.key = key
					observe.pthis = this
					observers.push(observe)
					if(!this.$observers) this.$observers = []
					this.$observers.push({list:observers, item:observe})
				}
				//console.log(value.__listeners__.length)
			}
			if(!config.change || old !== value){
				var fn = this[onkey]
				var flags = (this[_onkey] || this.onFlag0)&(config.mask||~0)
				if(flags || fn){
					if(!event) event = {}
					event.key = key
					event.old = old
					event.value = value
					var id = 1
					var ret 
					if(fn){
						ret = fn.call(onthis?this[onthis]:this, event)
					}
					if(!ret) while(flags){
						if(flags&1){
							this['onFlag'+id](event)
						}
						id = id<<1, flags = flags>>1
					}
				}
			}
		}
	})
}
