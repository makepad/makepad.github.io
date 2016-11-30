module.exports = class Stamp extends require('base/class'){
	//var types = require('types')
	prototype(){

		this.inheritable('states', function(){
			// process stamp states. into shader states
			var states = this.states

			for(let stateName in states){
				var state = states[stateName]
				var stateTime = state.time
				for(let frameName in state){
					var frame = state[frameName]
					if(frameName === 'time' || typeof frame !== 'object') continue // its a playback prop
					var frameTime = frame.time
					
					for(let subName in frame){
						var subFrame = frame[subName]
						// ok lets create/modify a subFrame with playback props.
						if(!this.hasOwnProperty(subName)) this[subName] = {}
						var subObj = this[subName]

						if(!subObj.hasOwnProperty('states')) subObj.states = {}
						var subStates = subObj.states

						// lets create the state
						if(!subStates[stateName]) subStates[stateName] = {
							duration:state.duration,
							repeat:state.repeat,
							bounce:state.bounce
						}
						var subState = subStates[stateName]
						if(stateTime) subState.time = stateTime
						
						// alright lets create the keyframe
						var outFrame = subState[frameName] = {}
						if(frameTime) outFrame.time = frameTime
						for(let prop in subFrame){
							outFrame[prop] = subFrame[prop]
						}
					}
				}
			}
		})

		this.mixin(
			require('base/props'),
			require('base/tools')
		)
		
		//this.onFlag0 = 1
		//this.onFlag1 = this.redraw

		this.props = {
			x:NaN,
			y:NaN,
			w:NaN,
			h:NaN,
			order:0,
			padding:[0,0,0,0],
			margin:[0,0,0,0],
			align:[0,0],
			down:0,
			cursor:undefined,
			id:''
		}

		this.inheritable('verbs', function(){
			var verbs = this.verbs
			if(!this.hasOwnProperty('_verbs')) this._verbs = this._verbs?Object.create(this._verbs):{}
			for(let key in verbs) this._verbs[key] = verbs[key]
		})


		this.verbs = {
			draw: function(overload, click) {
				var stamp = this.ALLOCSTAMP(overload)
				this.STYLESTAMP(stamp, overload)
				stamp.drawStamp()
				return stamp
			}
		}
	}

	setState(state, queue, props){
		this.state = state
		// alright now what. now we need to change state on our range.
		let view = this.view
		let todo = view.todo
		let time = view.app.getTime()
		let $writeList = view.$writeList
		for(let i = this.$writeStart; i < this.$writeEnd; i+=3){
			let mesh = $writeList[i]
			let start = $writeList[i+1]
			let end = $writeList[i+2]
			let proto = mesh.shaderProto
			let info = proto.$compileInfo
			let instanceProps = info.instanceProps
			let interrupt = info.interrupt
			let slots = mesh.slots

			let animStateOff = instanceProps.thisDOTanimState.offset
			let animNextOff = instanceProps.thisDOTanimNext.offset
			let animStartOff = instanceProps.thisDOTanimStart.offset

			let newState = info.stateIds[state] || 1
			let newDelay = (info.stateDelay[newState] || 0)
			let newDuration = (info.stateDuration[newState] || 0)
	
			let newTotal = time + newDelay + newDuration

			let array = mesh.array

			for(let j = start; j < end; j++){
				let o = j * slots
				if(props) for(let key in props){
					let prop = instanceProps['thisDOT'+key]
					if(!prop) continue
					if(prop.config.pack || prop.slots > 1) throw new Error("Implement propwrite for packed/props with more than 1 slot")
					let off = prop.offset
					if(prop.hasFrom) off += prop.slots
					array[o + off] = props[key]
				}

				if(queue){ // alright. we have to mask in the next state.
					let animStart = array[o + animStartOff]
					let animState = array[o + animStateOff]
					let animNext = array[o + animNextOff]
					let animDuration = info.stateDuration[animState] || 0
					if(animNext && time > animStart + animDuration){ // we have a next anim
						var animNextDuration = info.stateDuration[animNext] || 0

						interrupt(array, o, animStart+animDuration)
						// and now shift it
						array[o + animStateOff] = animNext
						array[o + animNextOff] = newState
						array[o + animStartOff] = animStart + animDuration
						// we have to com
						let shiftTotal = animStart + animDuration + animNextDuration + newDuration
						if(shiftTotal>todo.timeMax) todo.timeMax = shiftTotal
						continue
					}
					else if(time < animStart + animDuration){ // previous anim still playing
						array[o + animNextOff] = newState
						let nextTotal = animStart + animDuration + newDuration
						if(nextTotal>todo.timeMax) todo.timeMax = nextTotal
						continue
					}
				}
				// just interrupt and start a new anim
				interrupt(array, o, time, proto)
				array[o + animStateOff] = newState // set new state
				array[o + animStartOff] = time + newDelay // new start
				array[o + animNextOff] = 0 // wipe next
				if(newTotal>todo.timeMax) todo.timeMax = newTotal
			}
			// alright so how do we declare this thing dirty
			if(!mesh.dirty){
				mesh.updateMesh()
				mesh.dirty = true
			}
		}
		todo.updateTodoTime()
	}

	redraw(){
		var view = this.view
		if(view) view.redraw()
	}

	ALLOCSTAMP(args, indent, className, scope){
		return 'this.view.$allocStamp('+args[0]+', "'+className+'", this)\n'
	}

	STYLESTAMP(args, indent, className, scope){
		var code = ''
		var props = this._props
		code += indent + 'var $v;if(($v=' + args[1] + '.state) !== undefined) '+args[0]+'.state = $v;\n'
		for(let key in props){
			code += indent + 'var $v;if(($v=' + args[1] + '.' + key + ') !== undefined) '+args[0]+'._'+key+' = $v;\n'
		}
		return code
	}

	drawStamp(){
		var view = this.view
		var $writeList = view.$writeList
		this.$writeStart = $writeList.length
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
		this.turtle._pickId = this.$pickId
		this.turtle._order = this._order
		//var order = this.order
		//this.turtle._order = order !== 0? order: view.$order++
		this.onDraw()
		var ot = this.endTurtle()
		turtle.walk(ot)
		this.$x = turtle._x
		this.$y = turtle._y
		this.$w = turtle._w
		this.$h = turtle._h
		this.$writeEnd = $writeList.length
		// lets store things on the stamp
		$writeList.push(this, -1, -1)
	}

	onCompileVerbs(){
		this.__initproto__()
	}
}