module.exports = class{
	static mixin(proto){
		this._mixin(proto)
	}

	static _mixin(proto){
		var cpy = this.prototype
		var props = Object.getOwnPropertyNames(cpy)
		for(var i = 0; i < props.length; i++){
			var key = props[i]
			var desc = Object.getOwnPropertyDescriptor(cpy, key)
			if(key !== 'constructor' && desc.configurable){
				Object.defineProperty(proto, key, desc)
			}
		}
	}
}