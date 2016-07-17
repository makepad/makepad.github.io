module.exports = function(proto){

	var argRx = new RegExp(/([a-zA-Z\_\$][a-zA-Z0-9\_\$]*)\s*\:\s*([^\,\}])/g)
	var comment1Rx = new RegExp(/\/\*[\S\s]*?\*\//g)
	var comment2Rx = new RegExp(/\/\/[^\n]*/g)
	var mainargRx = new RegExp(/function\s*[a-zA-Z\_\$]*\s*\(([^\)]*)/)
	var macroRx = new RegExp(/([\t]*)this\.([\$][A-Z][A-Z0-9\_]*)\s*\(([^\)]*)\)/g)
	var argSplitRx = new RegExp(/[^,\s]+/g)
	var nameRx = new RegExp(/NAME/g)
	var fnnameRx = new RegExp(/^function\s*\(/)

	proto.compileCanvasMacros = function(classname, target){
		var mainthis = this
		var _canvasmacros = this._canvasmacros
		for(var macroname in _canvasmacros){
			var code = _canvasmacros[macroname].toString().replace(comment1Rx,'').replace(comment2Rx,'')
			// lets parse our args
			var marg = code.match(mainargRx)
			var mainargs = marg[1].match(argSplitRx) || []
			code = code.replace(macroRx, function(m, indent, fnname, args){
				// if args are not a {
				var macroargs
				if(typeof args === 'string' && args.indexOf('{') !== -1){
					// lets parse args
					var res, argobj = {}
					while((res = argRx.exec(args)) !== null) {
						argobj[res[1]] = res[2]
					}
					macroargs = argobj
				}
				else macroargs = args

				var fn = mainthis[fnname]
				if(!fn) throw new Error('CanvasMacro: '+fnname+ ' does not exist')
				return mainthis[fnname](classname, macroargs, mainargs, indent)
			})
			code = code.replace(nameRx,classname)

			var methodname = macroname + classname
			code = code.replace(fnnameRx, function(){
				return 'function '+methodname+'('
			})

			// create the function on target
			target[methodname] = new Function('return ' + code)()
		}
	}

	Object.defineProperty(proto, 'canvasmacros', {
		get:function(){
			return this._canvasmacros
		},
		set:function(canvas){
			if(!this.hasOwnProperty('_canvasmacros')) this._canvasmacros = this._canvasmacros?Object.create(this._canvasmacros):{}
			for(var key in canvas){
				this._canvasmacros[key] = canvas[key]
			}				
		}
	})
}