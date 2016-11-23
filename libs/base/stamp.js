module.exports = class Stamp extends require('base/class'){
	//var types = require('types')
	prototype(){
		this.mixin(
			require('base/props'),
			require('base/tools')
		)
		
		this.onFlag0 = 1
		this.onFlag1 = this.redraw

		this.props = {
			x:NaN,
			y:NaN,
			w:NaN,
			h:NaN,
			padding:[0,0,0,0],
			margin:[0,0,0,0],
			align:[0,0],
			down:0,
			cursor:undefined,
			id:'',
			group:''
		}

		this.inheritable('verbs', function(){
			var verbs = this.verbs
			if(!this.hasOwnProperty('_verbs')) this._verbs = this._verbs?Object.create(this._verbs):{}
			for(let key in verbs) this._verbs[key] = verbs[key]
		})

		this.verbs = {
			draw:function(overload){
				this.$STYLESTAMP(overload)
				$stamp.$redrawStamp()
			}
		}
	}
	
	get state(){
		return this._state
	}	

	set state(state){
		this._state = state
		this.redraw()	
	}

	initStates(arg){
		var styles = this.styles
		this.states = styles[this.id] || styles.base
	}

	initState(arg){
		this.initStates(arg)
		if(!this.states) return
		if(arg && arg.state && this._state){ // maintain _over state
			var stateName = arg.state
			// maintain our over state 
			if(this._state.name.indexOf('Over') !== -1){
				this._state = this.states[arg.state+'Over'] || this.states[arg.state]
			}
			else this._state = this.states[arg.state]
		}
		else if(!this._state) this._state = this.states.default
	}

	redraw(){
		var view = this.view
		if(view) view.redraw()
			
		/*
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
		else if(view) */
	}
	
	$STYLESTAMP(target, classname, macroargs, mainargs, indent){
		// so how do we rexecute a stamp

		var code = ''
		code += indent + 'var $stamp = this.view.$allocStamp('+mainargs[0]+', "'+classname+'")\n'

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

	$redrawStamp(){
		var turtle = this.turtle
		turtle._margin = this._margin
		turtle._padding = this._padding
		turtle._align = this._align
		turtle._down = this._down
		turtle._wrap = this._wrap
		turtle._x = this._x
		turtle._y = this._y
		turtle._w = this._w
		turtle._h = this._h
		this.beginTurtle()
		this.onDraw()
		var ot = this.endTurtle()
		turtle.walk(ot)
		turtle._pickId = 0
	}


	onCompileVerbs(){
		this.__initproto__()
	}
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