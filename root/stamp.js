module.exports = require('class').extend(function Stamp(proto){
	//var types = require('types')
	require('tools')(proto)
	
	Object.defineProperty(proto, 'props', {
		get:function(){
			throw new Error('props is a configurator, please only assign objects: this.props = {...}')
		},
		set:function(props){
			if(!this.hasOwnProperty('_props')){
				this._props = this._props?Object.create(this._props):{}
			}
			for(var key in props){
				var config = props[key]
				if(typeof config !== 'object' || Object.getPrototypeOf(config) !== Object.prototype){
					config = {value:config}
				}
				this._props[key] = config
				if(config.value !== undefined) this[key] = config.value
				//if(!config.type) config.type = types.typeFromValue(config.value)
			}
		}
	})

	proto.redraw = function(){
		this.view.redraw()
	}

	proto.props = {
		x:NaN,
		y:NaN,
		w:NaN,
		h:NaN,
		margin:undefined
	}

	function styleStampCode(indent, inobj, props, noif){
		var code = ''
		for(var key in props){
			if(noif){
				code += indent + '_'+key+' = ' + inobj +'.' + key + '\n'
			}
			else{
				code += indent + 'if(_'+key+' === undefined) _'+key+' = ' + inobj +'.' + key + '\n'
			}
		}
		return code
	}

	proto.$STYLESTAMP = function(target, classname, macroargs, mainargs, indent){
		// create / lookup stamp

		var code = ''
		code += indent + 'var $view = this.view\n\n'
		code += indent + 'var $stampId = $view.$stampId++\n'
		code += indent + 'var $stamp =  $view.$stamps[$stampId]\n\n'

		code += indent + 'if(!$stamp){\n'
		code += indent + '	$stamp = $view.$stamps[$stampId] = Object.create(this._'+classname+'.prototype)\n'
		code += indent + '	$stamp.view = $view\n'
		code += indent + '	$stamp.turtle = this.turtle\n'
		code += indent + '	$stamp.$shaders = this.$shaders.'+classname+'\n'
		code += indent + '	if(!$stamp.$shaders) $stamp.$shaders = (this.$shaders.'+classname+' = {})\n'
		code += indent + '	if($stamp.onConstruct)$stamp.onConstruct()\n'
		code += indent + '	if($stamp._states)$stamp._state = $stamp._states.default\n'
		code += indent + '}\n'
		code += indent + '$stamp.turtle._pickIdLo = $stampId\n'
		code += indent + '$stamp.$stampArgs = '+macroargs[0]+'\n'
		code += indent + '$stamp.$outerState = this._state && this._state.'+classname+'\n'

		var stack = [
			macroargs[0],
			'this._state && this._state.'+classname, // outer state
			'$stamp._state'
		]
		
		var props = this._props

		code += indent + 'var '
		var nprops = 0
		for(var key in props){
			if(nprops++) code +=', '
			code += '_'+key
		}
		code += '\n'

		code += indent +'if('+macroargs[0]+'){\n'
		code += styleStampCode(indent+'	', macroargs[0], props, true)
		code += indent +'}\n'

		code += indent +'var $p0=this._state && this._state.'+classname+'\n'
		code += indent +'if($p0){\n'
		code += styleStampCode(indent+'	', '$p0', props)
		code += indent +'}\n'

		code += indent +'var $p1=$stamp._state\n'
		code +=	indent +'if($p1){\n'
		code += styleStampCode(indent+'	', '$p1', props)
		code += indent +'}\n'

		for(var key in props){
			code += indent + 'if(_'+key+' !== undefined) $stamp.'+key+' = _'+key+'\n'
		}

		return code
	}

	proto.$DRAWSTAMP = function(target, classname, macroargs, mainargs, indent){
		var code = ''
		code += indent + '$stamp.onDraw()\n'
		code += indent + 'var $turtle = $stamp.turtle\n'
		code += indent + '$stamp.$x = $turtle._x\n'
		code += indent + '$stamp.$y = $turtle._y\n'
		code += indent + '$stamp.$w = $turtle._w\n'
		code += indent + '$stamp.$h = $turtle._h\n'
		return code
	}

	Object.defineProperty(proto, 'toolMacros', { 
		get:function(){
			return this._toolMacros
		},
		set:function(macros){
			if(!this.hasOwnProperty('_toolMacros')) this._toolMacros = this._toolMacros?Object.create(this._toolMacros):{}
			for(var key in macros) this._toolMacros[key] = macros[key]
		}
	})

	function deepOverlay(tgtobj, tgtkey, copyobj){
		var newobj = tgtobj[tgtkey] = tgtobj[tgtkey]?Object.create(tgtobj[tgtkey]):{}
		for(var key in copyobj){
			var value = copyobj[key]
			if(typeof value === 'object' && !Array.isArray(value)){
				deepOverlay(newobj, key, value)
			}
			else newobj[key] = value
		}
	}

	Object.defineProperty(proto, 'states', { 
		get:function(){
			return this._states
		},
		set:function(states){
			if(!this.hasOwnProperty('_states')) this._states = this._states?Object.create(this._states):{}
			for(var key in states){
				deepOverlay(this._states, key, states[key])
			}
		}
	})

	Object.defineProperty(proto, 'state', { 
		get:function(){
			return this._state
		},
		set:function(state){
			this._state = state
			this.view.redraw()	
		}
	})
})