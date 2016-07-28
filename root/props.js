module.exports = function(proto){
	// special names for property with name: key
	// this.key  <- getter setter for the key
	// this._key  <- the storage for a key
	// this.onkey  <- the listener chain for a key value change if(this.onkey) this.onkey({...})
	// this._onkey <- the listener flagset for flagged value change monitoring
	
	// define props
	function defineProp(key, value){
		// default
		if(typeof value !== 'object' || value.constructor !== Object){
			value = {value:value}
		}
		var initvalue = value.value

		if(!this.hasOwnProperty('_props')){
			this._props = this._props?Object.create(this._props):{}
		}

		var config = this._props[key] = this._props[key]?Object.create(this._props[key]):{}
		for(var cpy in value) config[cpy] = value[cpy]

		// lets define a property
		var _key = '_' + key
		var onkey = 'on' + key.charAt(0).toUpperCase() + key.slice(1)
		var _onkey = '_on' + key.charAt(0).toUpperCase() + key.slice(1)

		this[_key] = initvalue

		Object.defineProperty(this, key, {
			configurable:true,
			get:function(){
				if(this.onFlag) this[_onkey] |= this.onFlag
				return this[_key]
			},
			set:function(value){
				var old = this[_key]
				this[_key] = value
				var flags = this[_onkey] || this.onFlag
				if(flags){
					var id = 1
					while(flags){
						if(flags&1){
							this['onFlag'+id]({key:key, old:old, value:value})
						}
						id = id<<1, flags = flags>>1
					}
				}
				if(this[onkey]) this[onkey]({setter:true, old:old, value:value})
			}
		})
	}

	Object.defineProperty(proto, 'props', {
		set:function(props){
			for(var key in props){
				defineProp.call(this, key, props[key])
			}
		},
		get:function(){
			return this._props
		}
	})
}
