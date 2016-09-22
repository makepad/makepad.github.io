module.exports = require('base/class').extend(function Stamp(proto){
	//var types = require('types')

	proto.mixin(
		require('base/props'),
		require('base/tools')
	)
	
	proto.onFlag0 = 1
	proto.onFlag1 =
	proto.redraw = function(){
		var view = this.view
		if(view && this.inPlace){
			// figure out all the shader props lengths 
			var keys = Object.keys(this)
			var lengths = {}
			for(let i = 0; i < keys.length; i++){
				var key = keys[i]
				if(key.indexOf('$propsLen') === 0){
					var shader = key.slice(9)
					// lets reset the $props.length
					var props = this.$shaders[shader].$props
					lengths[shader] = props.length
					props.length = this[key]
				}
			}
			
			// re-run draw
			view.app.$updateTime()
			view._frameId = view.app._frameId
			view._time = view.app._time
			view.$writeList.length = 0

			// flag in place so the drawcalls dont modify the todo
			view.$inPlace = true
			view.todo.timeStart = view._time 
			view.$turtleStack.len = 0
			this.turtle = view.$turtleStack[0]
			this.turtle._pickId = this.$stampId

			// re-run draw
			this.onDraw()

			// putback the lengths
			for(let key in lengths){
				var props = this.$shaders[key].$props
				props.length = lengths[key]
				props.updateMesh()
			}
			view.todo.updateTodoTime()

			// remove inplace flag
			view.$inPlace = false

			// put back lengths
			//console.log('here')
			// let props update
		}
		else if(view) view.redraw()
	}
	proto.$isStamp = true
	proto.inPlace = false

	proto.stateExt = ''

	proto.props = {
		x:NaN,
		y:NaN,
		w:NaN,
		h:NaN,
		margin:undefined,
		cursor:undefined
	}

	function styleStampCode(indent, inobj, props, noif){
		var code = ''
		for(let key in props){
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
		// so how do we rexecute a stamp

		var code = ''
		code += indent + 'var $view = this.view\n\n'
		code += indent + 'var $turtle = this.turtle\n'
		code += indent + 'var $stampId = ++$view.$pickId\n'
		code += indent + 'var $stamp =  $view.$stamps[$stampId]\n\n'

		code += indent + 'if(!$stamp || $stamp.constructor !== this.'+classname+' || $stamp.$layer !== '+macroargs[0]+'.$layer){\n'
		code += indent + '	$stamp = $view.$stamps[$stampId] = new this.'+classname+'()\n'
		code += indent + '	$stamp.$stampId = $stampId\n'
		code += indent + '	$stamp.view = $view\n'
		code += indent + '	var $layer = '+macroargs[0]+'.$layer\n'
		code += indent + '	if($layer){\n'
		code += indent + '      var $l = $layer + "'+classname+'"\n'
		code += indent + '		$stamp.$layer = $layer\n'
		code += indent + '		$stamp.$shaders = this.$shaders[$l]\n'
		code += indent + '		if(!$stamp.$shaders) $stamp.$shaders = (this.$shaders[$l] = {})\n'
		code += indent + '	} else {\n'
		code += indent + '		$stamp.$shaders = this.$shaders.'+classname+'\n'
		code += indent + '		if(!$stamp.$shaders) $stamp.$shaders = (this.$shaders.'+classname+' = {})\n'
		code += indent + '	}'
		code += indent + '	if($stamp._styles) $stamp._state = $stamp._styles.default\n'
		code += indent + '}\n'
		code += indent + 'if('+mainargs[0]+'){\n'
		code += indent + '	var $styles = '+mainargs[0]+'.styles\n'
		code += indent + '	if($styles) $stamp._styles = $styles\n'
		code += indent + '	var $state = '+mainargs[0]+'.state\n'
		code += indent + '	if($state) $stamp._state = $stamp._styles[$stamp.stateExt?($state.indexOf("_")!==-1?$state.slice(0,$state.indexOf("_")):$state)+$stamp.stateExt:$state]\n'
		code += indent + '}\n'
		code += indent + '$turtle._pickId = $stampId\n'
		code += indent + '$stamp.turtle = $turtle\n'
		if(macroargs[0]) code += indent + '$stamp.$stampArgs = '+macroargs[0]+'\n'
		code += indent + '$stamp.$outerState = this._state && this._state.'+classname+'\n'

		var stack = [
			macroargs[0],
			'this._state && this._state.'+classname, // outer state
			'$stamp._state'
		]
		
		var props = this._props

		code += indent + 'var '
		var nprops = 0
		for(let key in props){
			if(nprops++) code +=', '
			code += '_'+key
		}
		code += '\n'

		if(macroargs[0]){
			code += indent +'if('+macroargs[0]+'){\n'
			code += styleStampCode(indent+'	', macroargs[0], props, true)
			code += indent +'}\n'
		}

		code += indent +'var $p0=this._state && this._state.'+classname+'\n'
		code += indent +'if($p0){\n'
		code += styleStampCode(indent+'	', '$p0', props)
		code += indent +'}\n'

		code += indent +'var $p1=$stamp._state\n'
		code +=	indent +'if($p1){\n'
		code += styleStampCode(indent+'	', '$p1', props)
		code += indent +'}\n'

		for(let key in props){
			code += indent + 'if(_'+key+' !== undefined) $stamp._'+key+' = _'+key+'\n'
		}

		return code
	}

	proto.$DRAWSTAMP = function(target, classname, macroargs, mainargs, indent){
		var code = ''
		code += indent + '$stamp.$x = $turtle.wx\n'
		code += indent + '$stamp.$y = $turtle.wy\n'
		code += indent + '$stamp.$w = $turtle._w\n'
		code += indent + '$stamp.$h = $turtle._h\n'
		code += indent + '$stamp.onDraw()\n'
		code += indent + 'var $turtle = $stamp.turtle\n'
		code += indent + '$stamp.$x = $turtle._x\n'
		code += indent + '$stamp.$y = $turtle._y\n'
		code += indent + '$stamp.$w = $turtle._w\n'
		code += indent + '$stamp.$h = $turtle._h\n'
		code += indent + '$turtle._pickId = 0'
		return code
	}

	Object.defineProperty(proto, 'toolMacros', { 
		get:function(){
			return this._toolMacros
		},
		set:function(macros){
			if(!this.hasOwnProperty('_toolMacros')) this._toolMacros = this._toolMacros?Object.create(this._toolMacros):{}
			for(let key in macros) this._toolMacros[key] = macros[key]
		}
	})

	function deepOverlay(tgtobj, tgtkey, copyobj){
		var newobj = tgtobj[tgtkey] = tgtobj[tgtkey]?Object.create(tgtobj[tgtkey]):{}
		for(let key in copyobj){
			var value = copyobj[key]
			if(typeof value === 'object' && !Array.isArray(value)){
				deepOverlay(newobj, key, value)
			}
			else newobj[key] = value
		}
	}

/*	Object.defineProperty(proto, 'states', { 
		get:function(){
			return this._states
		},
		set:function(states){
			if(!this.hasOwnProperty('_states')) this._states = this._states?Object.create(this._states):{}
			for(let key in states){
				deepOverlay(this._states, key, states[key])
			}
		}
	})*/

	Object.defineProperty(proto, 'state', { 
		get:function(){
			return this._state
		},
		set:function(state){
			this._state = state
			this.redraw()	
		}
	})

	proto.toolMacros = {
		draw:function(overload){
			this.$STYLESTAMP(overload)
			this.$DRAWSTAMP()
			return $stamp
		}
	}
})