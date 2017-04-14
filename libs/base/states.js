
var protoInherit = require('base/styles').protoInherit
var protoProcess = require('base/styles').protoProcess
module.exports = class States extends require('base/class'){
	prototype(){
		this.inheritable('states', function(){
			// process stamp states. into shader states
			var states = this.states
			this._statesProto = protoInherit(this._statesProto, states)
			states = this.states = protoProcess('', this._statesProto, null, null, null, new WeakMap())

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
	}
}