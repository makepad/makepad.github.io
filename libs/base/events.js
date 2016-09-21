module.exports = class extends require('base/mixin'){

	static mixin(proto){
		this._mixin(proto)
	}

	on(key, fn, reverse){

		function _onchain(event){
			var ret = _onchain.fn.call(this, event)
			if(ret) return ret
			ret = _onchain.prev.call(this, event)
			if(ret) return ret
		}

		var onkey = 'on' + key.charAt(0).toUpperCase()+key.slice(1)
		var prev = this[onkey]
		if(prev){
			this[onkey] = _onchain
			if(reverse){				
				_onchain.fn = prev
				_onchain.prev = fn
			}
			else{
				_onchain.fn = fn
				_onchain.prev = prev
			}
		}
		else{
			this[onkey] = fn
		}
	}
	
	off(key, fn){
		var onkey = 'on' + key.charAt(0).toUpperCase()+key.slice(1)
		var cb = this[onkey], last
		while(cb.name === '_onchain'){
			if(cb.fn === fn){
				if(!last){
					this[onkey] = cb.prev
					return
				}
				else{
					last.prev = cb.prev
					return
				}
			}
			last = cb
			cb = cb.prev
		}
		if(cb === fn){
			this[onkey] = undefined
		}
	}
}