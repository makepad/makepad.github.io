var painter = require('services/painter')
//var fingers = require('fingers')

function defineToolInheritable(proto, key){
	proto.inheritable(key, function(){
		var inherit = this[key]
		var base = Object.getPrototypeOf(this)[key]
		if(!base) return
		var cls
		//console.log(key, inherit)
		if(inherit && inherit.constructor === Object){ 
			// write it back
			cls = this[key] = base.extend(inherit)
		}
		else{ // just put the class on it. problem is it has no name now.
			cls = this[key] = inherit
		}
		cls.toolName = key
		this.$compileVerbs(key, cls)
	}, true)
}

module.exports = class Tools extends require('base/class'){

	prototype(){
		
		this.inheritable('verbs', function(){
			var verbs = this.verbs
			if(!this.hasOwnProperty('_verbs')) this._verbs = this._verbs?Object.create(this._verbs):{}
			for(let key in verbs) this._verbs[key] = verbs[key]
		})

		this.inheritable('tools', function(nesting){
			//if(!this.hasOwnProperty('_tools')) this._tools = this._tools?Object.create(this._tools):{}
			var tools = this.tools
			for(let key in tools){
				var inherit = tools[key]
				var base = this[key]
				if(inherit && inherit.constructor === Object){ // subclass it
					var cls = this[key] = base.extend(inherit)
					cls.toolName = key
					// lets call the callback
					this.$compileVerbs(key, cls)
				}
				// reversed (prop object below class)
				else if(base && base.constructor === Object && typeof inherit === 'function'){ // already has an object defined
					var cls = this[key] = inherit.extend(base)
					cls.toolName = key
					this.$compileVerbs(key, cls)
				}
				else{
					// else replace it
					this[key] = inherit
					inherit.toolName = key
					this.$compileVerbs(key, inherit)
				}
				if(!this.inheritable(key)){
					// make it inheritable
					defineToolInheritable(this, key)
				}
			}	
		})
	}

	$compileVerbs(className, sourceClass){
		var sourceProto = sourceClass.prototype

		if(sourceProto.onCompileVerbs){
			sourceProto.onCompileVerbs(this)
		}

		var verbs = sourceProto._verbs
		var target = this

		for(let verbName in verbs){
			var methodName = verbName + className
			var thing = verbs[verbName]
			
			var info = sourceProto.$compileInfo
			if(info){
				var cache = fnCache[info.cacheKey+methodName]
				if(cache){
					//console.log(cacheKey)
					target[methodName] = cache
					continue
				}
			}

			if(typeof thing !== 'function'){
				if(thing) target[methodName] = thing
				continue
			}
			var code = thing.toString().replace(comment1Rx,'').replace(comment2Rx,'')
			// lets parse our args
			var marg = code.match(mainArgRx)
			var mainargs = marg[1].match(argSplitRx) || []
			var scope = {}
			code = code.replace(macroRx, function(m, indent, fnname, args){
				if(fnname === 'NAME') return m
				// if args are not a {
				var macroArgs
				if(typeof args === 'string'){ 
					if(args.indexOf('{') !== -1){
						// lets parse args
						var res, argobj = {}
						while((res = argRx.exec(args)) !== null) {
							argobj[res[1]] = res[2]
						}
						macroArgs = [argobj]
					}
					else macroArgs = args.split(/\s*,\s*/)
				}
				var fn = sourceProto[fnname]
				if(!fn) throw new Error('CanvasMacro: '+fnname+ ' does not exist')
				return sourceProto[fnname](macroArgs, indent, className, scope, target, code)
			})
			code = code.replace(nameRx,className)

			var outcode = code.replace(dumpRx,'')
			if(outcode !== code){
				console.log(code)
				code = outcode
			}
	
			code = code.replace(fnnameRx, function(m, args){
				var out = 'function '+methodName+'('+args+'){\n'
				for(var key in scope){
					out += '\tvar '+key+' = '+scope[key]+'\n'
				}
				return out
			})

			//console.log(code)


			// create the function on target
			target[methodName] = fnCache[code] || (fnCache[code] = new Function('return ' + code)())

			if(info){ // store it
				fnCache[info.cacheKey+methodName] = target[methodName]
			}
		}
	}
}

var argRx = new RegExp(/([a-zA-Z\_\$][a-zA-Z0-9\_\$]*)\s*\:\s*([^\,\}]+)/g)
var comment1Rx = new RegExp(/\/\*[\S\s]*?\*\//g)
var comment2Rx = new RegExp(/\/\/[^\n]*/g)
var mainArgRx = new RegExp(/function\s*[a-zA-Z\_\$]*\s*\(([^\)]*?)/)
var macroRx = new RegExp(/([\t]*)this\.([A-Z][A-Z0-9\_]+)(?:\s*[\(\[]([^\)\]]*)[\)\]])?/g)
var argSplitRx = new RegExp(/[^,\s]+/g)
var nameRx = new RegExp(/NAME/g)
var fnnameRx = new RegExp(/^function\s*\(([^\)]*?)\)[^\}]*?\{/)
var dumpRx = new RegExp(/DUMP/g)
var fnCache = {}
