module.exports = function(proto){

	proto.on = function(key, fn, reverse){
		var onkey = 'on' + key
		var prev = this[onkey]
		if(prev){
			if(reverse){
				this[onkey] = function _onchain(event){
					ret = _onchain.prev.call(this, event)
					if(ret) return ret
					var ret = _onchain.fn.call(this, event)
					if(ret) return ret
				}
				_onchain.fn = fn
				_onchain.prev = prev
			}
			else{
				this[onkey] = function _onchain(event){
					var ret = _onchain.fn.call(this, event)
					if(ret) return ret
					ret = _onchain.prev.call(this, event)
					if(ret) return ret
				}
				_onchain.fn = fn
				_onchain.prev = prev
			}
		}
		else{
			this[onkey] = fn
		}
	}
	
	proto.off = function(key, fn){
		var onkey = 'on' + key
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