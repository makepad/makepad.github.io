module.exports = function(proto){

	var argRx = new RegExp(/([a-zA-Z\_\$][a-zA-Z0-9\_\$]*)\s*\:\s*([^\,\}])/g)
	var comment1Rx = new RegExp(/\/\*[\S\s]*?\*\//g)
	var comment2Rx = new RegExp(/\/\/[^\n]*/g)
	var mainArgRx = new RegExp(/function\s*[a-zA-Z\_\$]*\s*\(([^\)]*)/)
	var macroRx = new RegExp(/([\t]*)this\.([\$][A-Z][A-Z0-9\_]*)\s*\(([^\)]*)\)/g)
	var argSplitRx = new RegExp(/[^,\s]+/g)
	var nameRx = new RegExp(/NAME/g)
	var fnnameRx = new RegExp(/^function\s*\(/)

	proto.compileCanvasMacros = function(className, target){
		var mainThis = this
		var _canvasMacros = this._canvasMacros
		for(var macroName in _canvasMacros){
			var code = _canvasMacros[macroName].toString().replace(comment1Rx,'').replace(comment2Rx,'')
			// lets parse our args
			var marg = code.match(mainArgRx)
			var mainargs = marg[1].match(argSplitRx) || []
			code = code.replace(macroRx, function(m, indent, fnname, args){
				// if args are not a {
				var macroArgs
				if(typeof args === 'string' && args.indexOf('{') !== -1){
					// lets parse args
					var res, argobj = {}
					while((res = argRx.exec(args)) !== null) {
						argobj[res[1]] = res[2]
					}
					macroArgs = argobj
				}
				else macroArgs = args

				var fn = mainThis[fnname]
				if(!fn) throw new Error('CanvasMacro: '+fnname+ ' does not exist')
				return mainThis[fnname](className, macroArgs, mainargs, indent)
			})
			code = code.replace(nameRx,className)

			var methodName = macroName + className
			code = code.replace(fnnameRx, function(){
				return 'function '+methodName+'('
			})

			// create the function on target
			target[methodName] = new Function('return ' + code)()
		}
	}

	Object.defineProperty(proto, 'canvasMacros', {
		get:function(){
			return this._canvasMacros
		},
		set:function(canvas){
			if(!this.hasOwnProperty('_canvasMacros')) this._canvasMacros = this._canvasmacros?Object.create(this._canvasmacros):{}
			for(var key in canvas){
				this._canvasMacros[key] = canvas[key]
			}				
		}
	})
}