var painter = require('services/painter')
var types = require('base/types')
var parser = require('parsers/js')
var ShaderInfer = require('base/infer')

for(let i = 0; i < 16; i++) painter.nameId('ATTR_'+i)

const compName = ['x','y','z','w']

module.exports = class Compiler extends require('base/class'){

	prototype(){
		this.$mapExceptions = true
		this.$literalToUniform = true
		this.$uniformHeader = ""
		this.$pixelHeader = ""
		this.$vertexHeader = ""
		this.$interruptCache = {}

		this.inheritable('props', function(){
			var props = this.props
			for(let key in props){
				this.$defineProp(key, props[key])
			}
		})

		this.inheritable('defines', function(){
			var defines = this.defines
			if(!this.hasOwnProperty('_defines')){
				this._defines = this._defines? Object.create(this._defines): {}
			}
			for(let key in defines){
				this._defines[key] = defines[key]
			}
		})

		this.inheritable('requires', function(){
			var requires = this.requires
			if(!this.hasOwnProperty('_requires')){
				this._requires = this._requires? Object.create(this._requires): {}
			}
			for(let key in requires){
				this._requires[key] = requires[key]
			}
		})

		this.inheritable('structs', function(){
			var structs = this.structs
			if(!this.hasOwnProperty('_structs')){
				this._structs = this._structs?Object.create(this._structs):{}
			}
			for(let key in structs){
				var struct = structs[key]
				// auto name the struct based on the key
				if(!struct.name){
					var newstruct = Object.create(struct)
					newstruct.constructor = struct.constructor
					newstruct.name = key
					struct = newstruct
				}
				this._structs[key] = struct
			}
		})

		this.inheritable('verbs', function(){
			var verbs = this.verbs
			if(!this.hasOwnProperty('_verbs')) this._verbs = this._verbs?Object.create(this._verbs):{}
			for(let key in verbs) this._verbs[key] = verbs[key]
		})

		this.inheritable('states', function(){
			var states = this.states
			if(!this.hasOwnProperty('_states')) this._states = this._states?Object.create(this._states):{}
			for(let key in states) this._states[key] = states[key]
		})
	}

	$defineProp(key, value){
		if(!this.hasOwnProperty('_props')){
			this._props = this._props?Object.create(this._props):{}
		}

		var config = value
		if(typeof config !== 'object' || config.constructor !== Object){
			config = {value:config}
		}

		var old = this._props[key]
		if(old){
			for(let key in old) if(!(key in config)){
				config[key] = old[key]
			}
		}

		this._props[key] = config
		if(config.value !== undefined) this[key] = config.value
		if(config.mask === undefined) config.mask = 1
		if(!config.type) config.type = types.typeFromValue(config.value)
		if(!config.kind) config.kind = 'instance'
	}

	onCompileVerbs(){
		this.__initproto__()
		if(!this.$compileInfo){
			this.$compileShader()
		}
		else{
			// figure out if we need to compile
			var recompile = false
			if(this.hasOwnProperty('$methodDeps')){
				return // shaders are class things
			}
			var deps = this.$compileInfo.methodDeps

			if(this._states !== deps.states){
				this.$compileShader()
				return
			}

			for(let key in deps){
				if(this[key] !== deps[key]){
					this.$compileShader()
					return
				}
			}
		}
	}

	$compileShader(){
		this.$methodDeps = {
			states:this._states,
			pixelMain:this.pixelMain,
			vertexMain:this.vertexMain
		}

		// compile shaders
		var litFloats
		var litInts
		if(this.$literalToUniform){
			litFloats = []
			litInts = []
		}
		var vtx = ShaderInfer.generateGLSL(this, this.vertexMain, null, this.$mapExceptions, litFloats, litInts)
		var pix = ShaderInfer.generateGLSL(this, this.pixelMain, vtx.varyOut, this.$mapExceptions, litFloats, litInts)

		if(vtx.exception || pix.exception) return

		var inputs = {}, geometryProps = {}, instanceProps = {}, styleProps = {}, uniforms = {}

		// merge outputs from generateGLSL into tables
		for(let key in vtx.geometryProps) inputs[key] = geometryProps[key] = vtx.geometryProps[key]
		for(let key in pix.geometryProps) inputs[key] = geometryProps[key] = pix.geometryProps[key]
		for(let key in vtx.instanceProps) inputs[key] = styleProps[key] = instanceProps[key] = vtx.instanceProps[key]
		for(let key in pix.instanceProps) inputs[key] = styleProps[key] = instanceProps[key] = pix.instanceProps[key]
		for(let key in vtx.uniforms) uniforms[key] = vtx.uniforms[key]
		for(let key in pix.uniforms){
			var uni = pix.uniforms[key]
			if(uniforms[key]) uniforms[key].refcount += uni.refcount
			else uniforms[key] = uni
		}

		// compute property handling (if we need tween props)
		computePropStates(this._states, instanceProps)

		var totalSlots = computePropSizes(instanceProps)
		var lastSlot = Math.floor(totalSlots/4)

		// the shader chunks
		var vhead = this.$vertexHeader
		var vpre = ''
		var vpost = ''
		var phead = this.$pixelHeader
		var ppre = ''
		var ppost = ''

		// Unpack and tween props
		vhead += '// prop attributes\n'

		// per state property tweening/animation values
		var states = this._states
		var firstStateCode = {}
		var nextStateCode = {}
		var initvars = ''
		var fromProps = {}
		for(let key in instanceProps){
			var prop = instanceProps[key]
			var slots = prop.slots

			var propOff = 0
			if(prop.hasFrom){
				initvars += '\t'+prop.type.name + ' from_' +key+' = ' + unpackProp(prop, propOff, lastSlot, totalSlots) + ';\n'
				propOff += slots
			}
			if(prop.hasTo){
				initvars += '\t'+key+' = ' + unpackProp(prop, propOff, lastSlot, totalSlots) + ';\n'
			}

			let propStates = prop.states
			for(var stateName in propStates){
				var propState = propStates[stateName]
				var state = states[stateName]
				var frames = propState.frames
				var firstCode = ''
				var nextCode = ''
				var last = undefined
				var duration = state.duration || 0.
				var name = prop.name
			
				for(let i = frames.length - 1; i>=0; i--){
					var next = frames[i]
					var isFirst = i == 0
					var value = next.value
					if(duration === 0){
						firstCode = nextCode = decodeKeyFrame(name, value, false)
						break
					}
					if(last){
						firstCode = 'mix('+decodeKeyFrame(name, value, isFirst)+','+firstCode+','
						nextCode = 'mix('+decodeKeyFrame(name, value, false)+','+nextCode+','
						// call function on this with named arguments.
						// alright lets get the time object
						var T = '(T-'+forceDot(next.at)+')/'+forceDot(last.at-next.at)
						var time = last.time
						if(!time || time.fn === 'linear') firstCode += 'clamp('+T+',0.,1.))', nextCode += 'clamp('+T+',0.,1.))'
						else{
							var callee = this[time.fn]
							if(!callee) throw new Error("Cannot use "+time.fn+" as tweening function, it doesnt exist")
							var name = 'thisDOT'+time.fn
							var call = vtx.parseNamedCall(name, callee, time, {t:{type:types.float,value:'T'}})
							last.call = call.slice(call.indexOf('('))
							firstCode += call + ')'
							nextCode += call + ')'
						}
					}
					else{
						firstCode = decodeKeyFrame(name, value, isFirst)
						nextCode =  decodeKeyFrame(name, value, false)
					}
					last = next
				}
				firstStateCode[stateName] = (firstStateCode[stateName] || '') + '\t\t' + key + ' = ' + firstCode + ';\n'
				nextStateCode[stateName] = (nextStateCode[stateName] || '') + '\t\t' + key + ' = ' + nextCode + ';\n'
			}
		}

		// extracted state information
		var stateDuration = {}
		var stateDelay = {}
		var stateIds = {}
		var stateId = 1

		initvars += '\tfloat at = thisDOTtime - thisDOTanimStart;\n'
		
		// first animation state
		for(let key in states){
			let state = states[key]
			let id = stateId++
			stateIds[key] = id
			stateDuration[id] = (state.duration || 0.) * (state.repeat || 1.)
			stateDelay[id] = state.delay || 0.
			initvars += '\t'
			if(stateId>2) initvars += 'else '
			initvars += 'if(thisDOTanimState == '+id+'.){\n'
			var div = forceDot(state.duration || 0.)
			initvars += '\t\tfloat T = at'
			if(div !== '1.0') initvars += '/'+div
			initvars += ';\n'
			initvars += '\t\tat -= '+div +';\n'
			// now we loop and/or bounce
			if(state.repeat){
				if(state.bounce){
					if(state.repeat === Infinity) initvars += '\t\tfloat T = mod(st,2.);if(T>1.)T=2.-T;\n'
					else initvars += '\t\tif(T<'+forceDot(state.repeat)+') T = mod(T,2.), thisDOTanimNext = 0.;else T = '+(state.repeat%2?'1.':'0.')+';if(T>1.)T=2.-T;\n'
				}
				else{
					if(state.repeat === Infinity) initvars += '\t\tT = mod(T,1.);\n'
					else initvars += '\t\tif(T<'+forceDot(state.repeat)+') T = mod(T,1.), thisDOTanimNext=0.;else T = 1.;\n'
				}
			}
			else initvars += '\t\tif(T<=1.)thisDOTanimNext = 0.;\n'
			//if(state.duration)
			initvars += '' // do loop/bounce/duration on T
			initvars += firstStateCode[key]
			initvars += '\t}\n'
		}
		
		// next animation state
		stateId = 1
		initvars += '\tif(thisDOTanimNext != 0.){\n'
		
		for(let key in states){
			let state = states[key]
			let id = stateId++
			initvars += ' '
			if(stateId>2) initvars += 'else '
			initvars += '\t\tif(thisDOTanimNext == '+id+'.){\n'
			var div = forceDot(state.duration || 0.)
			initvars += '\t\t\tfloat T = at'
			if(div !== '1.0') initvars += '/'+div
			initvars += ';\n'
			// now we loop and/or bounce
			if(state.repeat){
				if(state.bounce){
					if(state.repeat === Infinity) initvars += '\t\t\tfloat T = mod(st,2.);if(T>1.)T=2.-T;\n'
					else initvars += '\t\t\tif(T<'+forceDot(state.repeat)+') T = mod(T,2.);else T = '+(state.repeat%2?'1.':'0.')+';if(T>1.)T=2.-T;\n'
				}
				else{
					if(state.repeat === Infinity) initvars += '\t\tT = mod(T,1.);\n'
					else initvars += '\t\t\tif(T<'+forceDot(state.repeat)+') T = mod(T,1.);else T = 1.;\n'
				}
			}
			//else initvars += '\t\t\tif(T <= 1.) thisDOTanimNext = 0.;\n'
			initvars += '' // do loop/bounce/duration on T
			initvars += nextStateCode[key]
			initvars += '\t\t}\n'
		}
	
		initvars += '\t}\n'
		
		var attrid = 0
		for(let i = totalSlots, pid = 0; i > 0; i -= 4){
			if(i >= 4) vhead += 'attribute vec4 ATTR_'+(attrid)+';\n'
			if(i == 3) vhead += 'attribute vec3 ATTR_'+(attrid)+';\n'
			if(i == 2) vhead += 'attribute vec2 ATTR_'+(attrid)+';\n'
			if(i == 1) vhead += 'attribute float ATTR_'+(attrid)+';\n'
			attrid++
		}

		// unpack geometry Props
		for(let key in geometryProps){
			var geom = geometryProps[key]
			var slots = geom.type.slots

			if(slots > 4){
				var v1 = geom.type.name + '('
				if(v1 === 'float(') v1 = '('
				vpre += '\t' + key + ' = ' + v1
				for(let i = 0; i < slots; i++){
					if(i) vpre += ', '
					vpre += '\tATTR_' + (attrpid + Math.floor(i/4)) + '.' + compName[i%4]
				}
				vpre += ');\n'

				for(let i = slots, pid = 0; i > 0; i -= 4){
					if(i >= 4) vhead = 'attribute vec4 ATTR_'+(attrid)+';\n' + vhead
					if(i == 3) vhead = 'attribute vec3 ATTR_'+(attrid)+';\n' + vhead
					if(i == 2) vhead = 'attribute vec2 ATTR_'+(attrid)+';\n' + vhead
					if(i == 1) vhead = 'attribute float ATTR_'+(attrid)+';\n' + vhead
					attrid ++
				}
			}
			else{
				vpre += '\t' + key + ' = ATTR_' + attrid + ';\n'
				vhead = 'attribute '+geom.type.name+' ATTR_' + attrid + ';\n' + vhead
				attrid++
			}
		}
		vhead = '// mesh attributes\n' + vhead

		vhead += defineStructs(vtx.structs)
		phead += defineStructs(pix.structs)

		// define the input variables
		vhead += '\n// inputs\n'
		for(let key in inputs){
			var input = inputs[key]
			vhead += input.type.name + ' ' + key + ';\n'
		}

		// define the varying targets
		for(let key in vtx.varyOut){
			var vary = vtx.varyOut[key]
			vhead += vary.type.name + ' ' + key + ';\n'
		}

		// lets pack/unpack varying and props and attributes used in pixelshader
		var allvary = {}
		for(let key in pix.geometryProps) allvary[key] = pix.geometryProps[key]
		for(let key in pix.varyOut) allvary[key] = pix.varyOut[key]
		for(let key in pix.instanceProps) allvary[key] = pix.instanceProps[key]

		// make varying packing and unpacking
		var vid = 0, curslot = 0, varystr = ''
		var varyslots = 0
		for(let key in allvary){
			var prop = allvary[key]
			var type = prop.type
			var slots = type.slots

			// define the variables in pixelshader
			if(curslot === 0) phead += '// inputs\n'
			phead += type.name + ' ' + key + ';\n'
			varyslots += slots

			// pack the varying
			for(let i = 0; i < slots; i++, curslot++){
				// lets allocate a slot
				if(curslot%4 === 0){
					if(curslot === 0){
						vhead += '\n//varyings\n'
						phead += '\n//varyings\n'
					}
					vhead += 'varying vec4 VARY_'+vid+';\n'
					phead += 'varying vec4 VARY_'+vid+';\n'
					if(curslot>=4) vpost += ');\n'
					vpost += '\tVARY_'+vid+' = vec4('
					vid++
				}
				else vpost += ','
				if(slots === 1){
					vpost += key
				}
				else{
					vpost += key + '[' + i + ']'
				}
			}

			// unpack the varying into variable in pixelshader
			var start = curslot - slots
			var v1 = prop.type.name + '('
			if(v1 === 'float(') v1 = '('
			ppre += '\t' + key + ' = ' + v1
			for(let i = 0; i < slots; i++){
				if(i) ppre += ', '
				ppre += 'VARY_'+Math.floor((i+start)/4) + '.' + compName[(i+start)%4]
			}
			ppre += ');\n'
		}
		for(let i =(4 - curslot%4)%4 - 1; i >= 0; i--){
			vpost += ',0.'
		}
		if(curslot) vpost += ');\n'

		var uboDefs = {}

		vhead += this.$uniformHeader
		vhead += '\n// uniforms\n'
		phead += this.$uniformHeader
		phead += '\n// uniforms\n'
		// lets make the literal uniform block
		var numLitFloats = ceil(litFloats.length/4)
		var numLitInts = ceil(litInts.length/4)
		var litUbo = uboDefs['literals'] = {}
		for(var i = 0; i < numLitFloats; i++){
			var name = '_litFloat' + i
			litUbo[name] = {
				type: types.vec4,
				name: name,
				value:[
					litFloats[i*4],
					litFloats[i*4+1],
					litFloats[i*4+2],
					litFloats[i*4+3]
				]
			}
		}
		for(var i = 0; i < numLitInts; i++){
			litUbo['_litInt' + i] = {
				type: types.ivec4,
				name: '_litInt'+i,
				value:[
					litInts[i*4],
					litInts[i*4+1],
					litInts[i*4+2],
					litInts[i*4+3]
				]
			}
		}

		// create uniformBlocks
		var props = this._props
		for(let key in props){
			var prop = props[key]
			if(prop.kind === 'uniform'){
				let blockName = prop.block
				var uniName = 'thisDOT'+ key
				if(!blockName || blockName === 'draw'){
					// if the draw uniform is not used skip it
					if(!(uniName in uniforms)) continue
					blockName = 'draw'
				}
				var block = uboDefs[blockName] || (uboDefs[blockName] = {})
				block[uniName] = uniforms[uniName] || {type:prop.type, config:prop, name:key, unused:true}
			}
		}

		for(let blockName in uboDefs){
			var block = uboDefs[blockName]
			vhead += '// Uniform block '+blockName+';\n'
			phead += '// Uniform block '+blockName+';\n'
			for(let key in block){
				var uniform = block[key]
				vhead += 'uniform ' + uniform.type.name + ' ' + key + ';\n'
				phead += 'uniform ' + uniform.type.name + ' ' + key + ';\n'
			}
		}
		// the sampler uniforms
		var hassamplers = 0
		var samplers = {}
		for(let key in vtx.samplers){
			var sampler = samplers[key] = vtx.samplers[key].sampler
			if(!hassamplers++)vhead += '\n// samplers\n'
			vhead += 'uniform ' + sampler.type.name + ' ' + key + ';\n'
		}

		var hassamplers = 0
		for(let key in pix.samplers){
			var sampler = samplers[key] = pix.samplers[key].sampler
			if(!hassamplers++)phead += '\n// samplers\n'
			phead += 'uniform ' + sampler.type.name + ' ' + key + ';\n'
		}

		// define output variables in pixel shader
		phead += '\n// outputs\n'
		for(let key in pix.outputs){
			var output = pix.outputs[key]
			phead += output.name + ' ' + key + ';\n'
		}

		// how do we order these dependencies so they happen top down
		var vfunc = ''
		for(let i = 0; i < vtx.genFunctions.length; i++){//key in vtx.genFunctions){
			var fn =  vtx.genFunctions[i].value
			vfunc = '\n'+fn.code + '\n' + vfunc
		}

		var vertex = vhead 
		vertex += vfunc
		vertex += '\nvoid main(){\n'
		vertex += vpre
		vertex += vtx.main.replace("\t$INITIALIZEVARIABLES", initvars)
		vertex += vpost
		vertex += '}\n'

		var pfunc = ''
		for(let i = 0; i < pix.genFunctions.length; i++){//key in pix.genFunctions){
			var fn = pix.genFunctions[i].value
			pfunc = '\n'+fn.code + '\n' + pfunc
		}
		var pixel = phead
		pixel += pfunc
		pixel += '\nvoid main(){\n'
		pixel += ppre
		pixel += pix.main
		//!TODO: do MRT stuff
		pixel += ppost + '}\n'

		// add all the props we didnt compile but we do need for styling to styleProps
		for(let key in this._props){
			var config = this._props[key]
			var propname = 'thisDOT' + key
			if(!styleProps[propname]){
				styleProps[propname] = {
					name:key,
					config:config
				}
			}
		}

		if(vtx.exception || pix.exception){
			return
		}

		var deps = this.$methodDeps
		
		var info = this.$compileInfo = {
			methodDeps: deps,
			cacheKey: pixel+vertex,
			stateDuration:stateDuration,
			stateDelay:stateDelay,
			stateIds:stateIds,
			name:this.name || this.constructor.name,
			trace:this.drawTrace,
			instanceProps:instanceProps,
			geometryProps:geometryProps,
			styleProps:styleProps,
			uniforms:uniforms,
			uboDefs:uboDefs,
			samplers:samplers,
			vertex:vertex,
			pixel:pixel,
			propSlots:totalSlots
		}
		info.interrupt = this.$generateAnimInterrupt(instanceProps)
		
		if(this.dump) console.log(vertex,pixel)

		// push our compilation up the protochain as far as we can
		var proto = Object.getPrototypeOf(this)
		
		while(proto){
			for(let key in deps){
				if(deps[key] !== proto[key]) return
			}
			// write it
			proto.$compileInfo = info
			proto = Object.getPrototypeOf(proto)
		}
	}

	$generateAnimInterrupt(instanceProps){
		var cacheKey = this.$compileInfo.cacheKey
		var cache = this.$interruptCache[cacheKey]
		if(cache) return cache

		// per state property tweening/animation values
		var states = this._states

		var stateCode = {}
		var code = '' // args $a, $o, $t

		// compute T from the array
		code += '\tvar at = $t-$a[$o+'+instanceProps.thisDOTanimStart.offset+']\n'
		code += '\tvar animState = $a[$o+'+instanceProps.thisDOTanimState.offset+']\n'
		code += '\tvar animNext = $a[$o+'+instanceProps.thisDOTanimNext.offset+']\n'
		
		code += '\tfor(let i = 0; i < 2;i++){\n'
		code += '\tvar state = i?animNext:animState\n'

		for(let key in instanceProps){
			var prop = instanceProps[key]
			var slots = prop.slots
			var propOff = 0
			var offset = prop.offset

			if(!prop.hasFrom) continue // if we dont have a from, dont need to compute interrupt

			for(let i = 0; i < slots; i++){
				code += '\tvar from_'+key+'_'+i+' = $a[$o+' + (offset + i)+']\n'
			}

			if(prop.hasTo){
				for(let i = 0; i < slots; i++){
					code += ' \tvar to_'+key+'_'+i+' = $a[$o+' + (offset + slots + i)+']\n'
				}
			}

			// animation timeline
			let propStates = prop.states
			var fromKeys = []
			for(var stateName in propStates){
				var propState = propStates[stateName]
				var state = states[stateName]
				var frames = propState.frames
				var frag = ''
				var last = undefined
				var duration = state.duration || 0.
				for(let f = frames.length - 1; f>=0; f--){
					var next = frames[f]
					if(last){
						if(f == 0) frag += '\t\telse{\n'
						else frag += '\t\telse if(T>=' + next.at + '){\n'
						// insert tweening code
						if(last.time && last.call){
							frag += 'T = $proto.'+ last.time.fn+last.call+'\n'
						}
						frag += '\t\t\tlet D = (T - '+next.at+')/'+(last.at-next.at)+', ND = 1 - D\n'
						let nvec = next.value
						let nv = nvec
						if(typeof nv === 'string') types.colorFromString(nv, 1.0, nvec=[], 0)
						let lvec = last.value
						let lv = lvec
						if(typeof lv === 'string') types.colorFromString(lv, 1.0, lvec=[], 0)
						for(let i = 0; i < slots; i++){
							frag += '\t\t\t$a[$o+'+(offset+i)+'] = '
							if(nv === null) frag += 'from_'+key+'_'+i
							else frag += slots>1?nvec[i]:nvec
							frag += '*ND + D*'
							if(lv === null) frag += 'to_'+key+'_'+i	
							else frag += slots>1?lvec[i]:lvec
							frag += '\n'
						}
						frag += '\t\t}\n'
					}
					else{
						frag += '\t\tif(T>=1.){\n'
						let nvec = next.value
						let nv = nvec
						if(typeof nv === 'string') types.colorFromString(nv, 1.0, nvec=[], 0)
						for(let i = 0; i < slots; i++){
							frag += '\t\t\t$a[$o+'+(offset+i)+'] = '
							if(nv === null) frag += 'to_'+key+'_'+i	
							else frag += slots>1?nvec[i]:nvec
							frag += '\n'
						}
						frag += '\t\t}\n'
					}
					last = next
				}
				stateCode[stateName] = (stateCode[stateName] || '') + frag
			}
		}
		
		var stateId = 1
		for(let key in states){
			let state = states[key]
			let id = stateId++
			code += '\t'
			if(id>2) code += 'else '
			code += 'if(state == '+id+'.){\n'

			var div = forceDot(state.duration || 0.)
			code += '\t\tvar T = at'
			if(div !== '1.0') code += '/'+div
			code += ';\n'
			code += '\t\tat -= '+div +';\n'

			// now we loop and/or bounce
			if(state.repeat){
				if(state.bounce){
					if(state.repeat === Infinity) code += '\t\tT = mod(T,2.);if(T>1.)T=2.-T;\n'
					else code += '\t\tif(T<'+forceDot(state.repeat)+') T = mod(T,2.), animNext = 0;else T = '+(state.repeat%2?'1.':'0.')+';if(T>1.)T=2.-T;\n'
				}
				else{
					if(state.repeat === Infinity) code += '\t\tT = mod(T,1.);\n'
					else code += '\t\tif(T<'+forceDot(state.repeat)+') T = mod(T,1.), animNext = 0;else T = 1.;\n'
				}
			}
			else code += '\t\tif(T<=1.) animNext = 0.\n'
			// run easing functions over T
			code += stateCode[key]
			//if(this.dump) code += this.DUMPPROPS(instanceProps)//'console.log($a$a[$o+'+instanceProps.thisDOTcolor.offset+'])\n'
			
			code += '\t}\n'
		}
		code += '\tif(!animNext)break;\n\t}\n'
		return this.$interruptCache[cacheKey] = new Function("$a","$o","$t","$proto",code)
	}

	// $STYLEPROPS(overload, mask)
	STYLEPROPS(args, indent, className, scope){//, classname, indent, target){
		if(!this.$compileInfo) return ''

		var styleProps = this.$compileInfo.styleProps
		var instanceProps = this.$compileInfo.instanceProps
		if(!args) throw new Error('$STYLEPROPS doesnt have overload argument')

		// lets make the vars
		var code = ''

		scope.$turtle = 'this.turtle'
		scope.$proto = 'this.'+className+'.prototype\n'
		code += indent+'if(!overload) overload = {}\n'
		var mask = args[1] || 1
		// overload or class
		for(let key in styleProps){
			var prop = styleProps[key]
			if(!(prop.config.mask&mask)) continue
			var name = prop.name
			var inst = instanceProps[key]

			if(inst && inst.hasFrom){
				code += indent +'$turtle._from_'+name+' = '+args[0]+'.from_'+name+';\n'
			}
			if(name === 'order'){
				code += indent+'if(($turtle._'+name+' = ' + args[0]+'.'+name+') === undefined) $turtle._order = this._order || $proto._order || 0\n'
			}
			else if(name === 'state'){
				code += indent+'if(($turtle._'+name+' = ' + args[0]+'.'+name+') === undefined) $turtle._state = this.state\n'
			}
			else{
				code += indent+'if(($turtle._'+name+' = ' + args[0]+'.'+name+') === undefined) $turtle._' + name + ' = $proto.' + name + '\n'
			}
		}
		return code
	}

	ALLOCDRAW(args, indent, className, scope){//indent, target, classname, macroargs){
		if(!this.$compileInfo) return ''
		// lets generate the draw code.
		// what do we do with uniforms?.. object ref them from this?
		// lets start a propsbuffer 
		var info = this.$compileInfo
		var code = ''
	
		var overload = args[0]		
		var allocNeeded = args[1] || 1

		// define scope vars
		scope.$view = 'this.view'
		scope.$todo = '$view.todo'
		scope.$turtle = 'this.turtle'
		scope.$shaderOrder = 'this.$shaders.'+className 
		scope.$proto = 'this.' + className +'.prototype'
		scope.$a = scope.$props = 1
		//scope.$shader = '$shaderOrder && $shaderOrder[$turtle._order || $proto.order] || this.$allocShader("'+className+'", $turtle._order|| $proto.order)' 
		//scope.$props = '$shader.$props'
		//scope.$a = '$props.array'
		code += indent+'var $shaderOrder = this.$shaders.'+className +'\n'
		code += indent+'var $shader = $shaderOrder && $shaderOrder[$turtle._order || $proto.order] || this.$allocShader("'+className+'", $turtle._order|| $proto.order)\n'
		code += indent+'var $props = $shader.$props\n'
		code += indent+'var $a = $props.array\n'

		code += indent+'if($props.$frameId !== $view._frameId){\n' 
		code += indent+'	$props.$frameId = $view._frameId\n'
		code += indent+'	$props.oldLength = $props.length\n'
		code += indent+'	$props.updateMesh()\n'
		code += indent+'	$props.length = 0\n'
		code += indent+'	$props.dirty = true\n'
		code += indent+'	var $drawUbo = $shader.$drawUbo\n'
		code += indent+'	$todo.beginOrder($turtle._order|| $proto.order)\n'
		code += indent+'	$todo.useShader($shader)\n'
		// lets set the blendmode
		//code += indent+'	$todo.blending($proto.blending, $proto.constantColor)\n'
		// set the vao
		code += indent+'	$todo.vao($shader.$vao)\n'
		// set uniforms
		var uniforms = info.uniforms
		var drawUboDef = info.uboDefs.draw
		code += indent+'	$todo.ubo('+painter.nameId('painter')+', $view.app.painterUbo)\n'
		code += indent+'	$todo.ubo('+painter.nameId('todo')+', $todo.todoUbo)\n'
		code += indent+'	$todo.ubo('+painter.nameId('draw')+', $drawUbo)\n'
		code += indent+'	$todo.ubo('+painter.nameId('literals')+', $shader.$literalsUbo)\n'

		for(let key in uniforms){
			var uniform = uniforms[key]
			
			if(key === 'thisDOTtime' && uniform.refcount > 1){
				code += indent +'	$todo.timeMax = Infinity\n'
			}

			if(!drawUboDef || !(key in drawUboDef)) continue

			var thisname = key.slice(7)
			var source = (args[0]!=='null'?args[0]+' && '+args[0]+'.'+thisname+' || ':'')+'$view.'+ thisname +'|| $proto.'+thisname
			var typename = uniform.type.name
			//code += indent+'	console.log("'+key+'",'+source+')\n'
			code += indent+'	$drawUbo.'+typename+'('+painter.nameId(key)+','+source+')\n'
		}

		// do the samplers
		var samplers = info.samplers
		for(let key in samplers){
			var sampler = samplers[key]

			var thisname = key.slice(7)
			var source = (args[0]!=='null'?args[0]+' && '+args[0]+'.'+thisname+' || ':'')+'$proto.'+thisname

			code += indent +'	$todo.sampler('+painter.nameId(key)+','+source+',$proto.$compileInfo.samplers.'+key+')\n'
		}
		// lets draw it
		code += indent + '	$todo.drawArrays('+painter.TRIANGLES+')\n'
		code += indent+'	$todo.endOrder()\n'
		code += indent + '}\n'

		code += indent + 'var $propsLength = $props.length\n\n'
		code += indent + 'var $need = min($propsLength + '+allocNeeded+',$proto.propAllocLimit)\n'
		code += indent + 'if($need > $props.allocated && $need) $props.alloc($need), $a = $props.array\n'

		if(!this.$noWriteList){
			code += indent + '$view.$writeList.push($props, $propsLength, $need)\n'
		}

		code += indent + '$props.dirty = true\n'
		code += indent + '$turtle.$propOffset = $propsLength\n'
		code += indent + '$props.length = $need\n'

		return code
	}
	
	DUMPPROPS(args, indent, className, scope){
		var code = ''
		var instanceProps = this.$compileInfo.instanceProps
		for(let key in instanceProps){
			var prop = instanceProps[key]
			var slots = prop.slots
			var o = prop.offset

			if(prop.hasFrom){
				for(let i = 0; i < slots; i++){
					code += 'console.log("'+(prop.name+(slots>1?i:''))+' from: "+$a[$o+'+(o+i)+'])\n'
				}
				o += slots
			}
			if(prop.hasTo){
				for(let i = 0; i < slots; i++){
					code += 'console.log("'+(prop.name+(slots>1?i:''))+' to: "+$a[$o+'+(o+i)+'])\n'
				}
			}
		}
		return code
	}
	/*
	$PREVPROPS(target, classname, macroargs, mainargs, indent){
		if(!this.$compileInfo) return ''
		var code = ''
		var info = this.$compileInfo
		code += indent +'var $props =  this.$shaders.'+classname+'.$props\n'
		code += indent +'var $a = $props.array\n'
		code += indent +'var $o = (this.turtle.$propoffset - 1) * ' + info.propSlots +'\n'
		var instanceProps = info.instanceProps
		var argobj = macroargs[0]
		for(let key in argobj){
			var prop = instanceProps['thisDOT'+key]
			// lets write prop
			if(prop.config.pack) throw new Error('Please implement PREVPROP packing support '+key)
			if(prop.config.type.slots>1) throw new Error('Please implement PREVPROP vector support '+key)

			code += indent + '$a[$o+'+prop.offset+'] = ' +argobj[key] +'\n'
		}
		return code
	}*/

	LENCORRECT(args, indent, className, scope){
		return '$props.length = $turtle.$propOffset'
	}


	PROPLEN(args, indent, className, scope){
		scope.$proto = 'this.' + className +'.prototype'
		if(!scope.$props) scope.$props = 'this.$shaders.'+className+' && this.$shaders.'+className+'[$proto.order].$props'
		return '$props.length'
	}

	PROP(args, indent, className, scope){
		if(!this.$compileInfo) return ''
		var code = ''
		var info = this.$compileInfo
		
		scope.$proto = 'this.' + className +'.prototype'
		if(!scope.$props) scope.$props = 'this.$shaders.'+className+'[$proto.order].$props'
		if(!scope.$a) scope.$a = '$props.array'
		
		var prop = info.instanceProps['thisDOT'+args[1].slice(1,-1)]
		if(!prop) console.error("Cannot find property "+args[1])
		return '$a[(' + args[0] + ')*'+ info.propSlots +'+'+prop.offset+']'
	}

	PREV(args, indent, className, scope){
		if(!this.$compileInfo) return ''
		var code = ''
		var info = this.$compileInfo
		if(!scope.$props) scope.$props = 'this.$shaders.'+className+'.$props'
		if(!scope.$a) scope.$a = '$props.array'
		var prop = info.instanceProps['thisDOT'+args[1].slice(1,-1)]
		return '$a[(' + args[0] + ')*'+ info.propSlots +'+'+(prop.offset+prop.type.slots)+']'
	}

	WRITEPROPS(args, indent, className, scope, target, source){
		if(!this.$compileInfo) return ''

		// load the turtle
		var info = this.$compileInfo
		var instanceProps = info.instanceProps

		scope.$view = 'this.view'
		scope.$todo = '$view.todo'
		scope.$proto = 'this.' + className +'.prototype'
		scope.$info = '$proto.$compileInfo'
		
		// start the writing process
		var code = ''
		if(source.indexOf('this.endTurtle') !== -1){ // fetch from turtle
			code += indent + 'var $turtle = this.turtle\n'
			code += indent + 'var $shader = this.$shaders.'+className+'[$turtle._order || $proto.order]\n'
			code += indent + 'var $props = $shader.$props\n'
			code += indent + 'var $a = $props.array\n'
		}
		else{ // we should have alloc props get them for us
			scope.$turtle = 'this.turtle'
			//if(!scope.$shader) scope.$shader = 'this.$shaders.'+className+'[$turtle._order]\n'
			//scope.$props = '$shader.$props'
			//scope.$a = '$props.array'
		}
		
		code += indent + 'var $stateId = $info.stateIds[$turtle._state] || 1\n'
		code += indent + '$props.dirty = true\n'
		code += indent +'var $o = $turtle.$propOffset++ * ' + info.propSlots +'\n'
		// lets execute
		code += indent + 'var $last = $a[$o+' + instanceProps.thisDOTanimState.offset+']\n'
		code += indent + 'if($last) $info.interrupt($a, $o, $view._time, $proto)\n'
		code += indent + 'var $max = $view._time + $info.stateDuration[$stateId]\n'
		code += indent + 'if($max>$todo.timeMax) $todo.timeMax = $max\n'

		// write properties.
		var last = 'if(!$last){\n'
		let args0 = args[0]
		for(let key in instanceProps){
			let prop = instanceProps[key]
			if(!prop.slots) continue
			let name = prop.name
			var source = '$turtle._' + name
			
			if(typeof args0 === 'object' && name in args0){ // passed as arg
				source = args0[name]
				if(!source) throw new Error('Unknown key with mask 0 ' + key)
			}
			else if(!prop.config.mask){ // system value
				if(key === 'thisDOTanimStart'){ // now?
					source = '$view._time + ($info.stateDelay[$stateId] || 0)'
				}
				else if(key === 'thisDOTanimState'){ // decode state prop
					source = '$stateId'
				}
				else if(key === 'thisDOTpickId'){ 
					source = '$turtle._pickId'
				}
				else if(key === 'thisDOTorder'){ 
					source = '$turtle._order'
				}
				else if(key === 'thisDOTanimNext'){
					continue
				}
			}
			// if(key === 'thisDOTx'){
			// 	source += '- $turtle.$xAbs'
			// }
			// else if(key === 'thisDOTy'){
			// 	source += '- $turtle.$yAbs'
			// }

			if(prop.hasFrom){ // initialize from from the write value if first write
				last += packProp(indent, prop, 0, source)
			}
			if(prop.hasFrom){ // we need to check for from_ passed in
				code += indent + 'if($turtle._from_'+name+' !== undefined){\n'
				code += packProp(indent, prop, 0, '$turtle._from_'+name)
				code += '}'
			}
			if(prop.hasTo){
				code += packProp(indent, prop, prop.hasFrom?prop.slots:0, source)
			}
		}
		last += '}'
		code += last
		code += 'if($turtle._debug){\n'
		code += this.DUMPPROPS(args, indent, className, scope, target, source)
		code += '}'
		return code
	}
}


// process and generate state handling code
function decodePropSlot(idx, lastSlot, totalSlots){
	var slot = Math.floor(idx/4)
	var ret = 'ATTR_' +  slot
	if(lastSlot !== slot || totalSlots%4 !== 1) ret += '.' + compName[idx%4]
	return ret
}

function unpackProp(prop, off, lastSlot, totalSlots){
	var pack = prop.config.pack
	if(pack){
		if(prop.type.name === 'vec2'){
			let res = 'vec2('
			let start = prop.offset + off
			let p1 = decodePropSlot(start, lastSlot, totalSlots)
			res += 'floor('+p1+'/4096.0)'
			res += ',mod('+p1+',4096.0)'
			if(pack === 'float12') res += ')/4095.0'
			else if(pack === 'int12') res += ')-2048.0'
			else res += ')'
			return res
		}
		else{
			let res = 'vec4('
			let start = prop.offset + off
			let p1 = decodePropSlot(start, lastSlot, totalSlots)
			let p2 = decodePropSlot(start+1, lastSlot, totalSlots)
			res += 'floor('+p1+'/4096.0)'
			res += ',mod('+p1+',4096.0)'
			res += ',floor('+p2+'/4096.0)' 
			res += ',mod('+p2+',4096.0)' 
			if(pack === 'float12') res += ')/4095.0'
			else if(pack === 'int12') res += ')-2048.0'
			else res += ')'
			return res
		}
	}
	let res = prop.type.name + '('
	let slots = prop.slots
	if(res === 'float(') res = '('
	for(let i = 0, start = prop.offset + off; i < slots; i++){
		if(i) res += ', '
		res += decodePropSlot(start + i, lastSlot, totalSlots)
	}
	res += ')'
	return res
}

function packProp(indent, prop, off, source){
	let o = prop.offset + off
	let code = ''
	let pack = prop.config.pack
	let name = prop.name
	if(prop.type.name === 'vec4'){
		if(pack){
			code += indent + 'var _' + name + ' = '+ source +'\n'
			if(pack === 'float12'){
				code += indent + 'if(typeof _'+name+' === "object"){\n'
				code += indent + '	if(_'+name+'.length === 4)$a[$o+'+(o)+']=((Math.min(_'+name+'[0],1.)*4095)<<12) + ((Math.min(_'+name+'[1],1.)*4095)|0),$a[$o+'+(o+1)+']=((Math.min(_'+name+'[2],1.) * 4095)<<12) + ((Math.min(_'+name+'[3],1.)*4095)|0)\n'
				code += indent + '	else if(_'+name+'.length === 2)this.$parseColorPacked(_'+name+'[0], _'+name+'[1],$a,$o+'+o+')\n'
				code += indent + '	else if(_'+name+'.length === 1)$a[$o+'+o+']=$a[$o+'+(o+1)+']=((_'+name+'[0]*4095)<<12) + ((_'+name+'[0]*4095)|0)\n'
				code += indent + '}\n'
				code += indent + 'if(typeof _'+name+' === "string")this.$parseColorPacked(_'+name+',1.0,$a,$o+'+o+')\n'
				code += indent + 'else if(typeof _'+name+' === "number")$a[$o+'+o+']=$a[$o+'+(o+1)+']=((_'+name+'*4095)<<12) + ((_'+name+'*4095)|0)\n'
				return code
			}
			// int packing
			code += indent + 'if(typeof _'+name+' === "object"){\n'
			code += indent + '	if(_'+name+'.length === 4)$a[$o+'+(o)+']=(_'+name+'[0]+2048<<12) + (_'+name+'[1]+2048|0),$a[$o+'+(o+1)+']=(_'+name+'[2]+2048<<12) + (_'+name+'[3]+2048|0)\n'
			code += indent + '	else if(_'+name+'.length === 1)$a[$o+'+o+']=$a[$o+'+(o+1)+']=((_'+name+'[0]+2048)<<12) + ((_'+name+'[0]+2048)|0)\n'
			code += indent + '}\n'
			code += indent + 'else if(typeof _'+name+' === "number")$a[$o+'+o+']=$a[$o+'+(o+1)+']=((_'+name+'+2048)<<12) + ((_'+name+'+2048)|0)\n'
			return code
		}
		// no packing
		code += indent + 'var _' + name + ' = '+ source +'\n'
		code += indent + 'if(typeof _'+name+' === "object"){\n'
		code += indent + '	if(_'+name+'.length === 4)$a[$o+'+(o)+']=_'+name+'[0],$a[$o+'+(o+1)+']=_'+name+'[1],$a[$o+'+(o+2)+']=_'+name+'[2],$a[$o+'+(o+3)+']=_'+name+'[3]\n'
		code += indent + '	else if(_'+name+'.length === 1)$a[$o+'+o+']=$a[$o+'+(o+1)+']=$a[$o+'+(o+2)+']=$a[$o+'+(o+3)+']=_'+name+'[0]\n'
		code += indent + '	else if(_'+name+'.length === 2)this.$parseColor(_'+name+'[0], _'+name+'[1],$a,$o+'+o+')\n'
		code += indent + '}\n'
		code += indent + 'else if(typeof _'+name+' === "string")this.$parseColor(_'+name+',1.0,$a,$o+'+o+')\n'
		code += indent + 'else if(typeof _'+name+' === "number")$a[$o+'+o+'] = $a[$o+'+(o+1)+'] = $a[$o+'+(o+2)+']=$a[$o+'+(o+3)+']=_'+name+'\n'
		return code
	}
	if(prop.type.name === 'vec2'){
		if(pack){
			code += indent + 'var _' + name + ' = '+ source +'\n'
			if(pack === 'float12'){
				code += indent + 'if(typeof _'+name+' === "object"){\n'
				code += indent + '	$a[$o+'+(o)+']=((_'+name+'[0]*4095)<<12) + ((_'+name+'[1]*4095)|0)\n'
				code += indent + '}\n'
				code += indent + 'else $a[$o+'+o+']=((_'+name+'*4095)<<12) + ((_'+name+'*4095)|0)\n'
				return code
			}
			// int packing
			code += indent + 'if(typeof _'+name+' === "object"){\n'
			code += indent + '	$a[$o+'+(o)+']=(_'+name+'[0]+2048<<12) + (_'+name+'[1]+2048|0)\n'
			code += indent + '}\n'
			code += indent + 'else if(typeof _'+name+' === "number")$a[$o+'+o+']=((_'+name+')+2048<<12) + ((_'+name+')+2048|0)\n'
			return code
		}
		code += indent + 'var _' + name + ' = '+ source +'\n'
		code += indent + 'if(typeof _'+name+' === "object"){\n'
		code += indent + '	$a[$o+'+(o)+']=_'+name+'[0],$a[$o+'+(o+1)+']=_'+name+'[1]\n'
		code += indent + '}\n'
		code += indent + 'else $a[$o+'+(o)+']=$a[$o+'+(o+1)+']=_'+name+'\n'
		return code
	}
	let slots = prop.slots
	if(slots === 1){
		code += indent + '$a[$o+'+o+'] = '+source+'\n'
		return code
	}
	code += indent + 'var _' + name + ' = '+source+'\n'
	for(let i = 0; i < slots; i++){
		if(i) code += ','
		code += '$a[$o+'+(o+i)+']=_'+name+'['+i+']'
	}
	code += '\n'
	return code
}

function decodeKeyFrame(name, value, first){
	if(value === null) return first? 'from_thisDOT' + name: 'thisDOT' + name
	if(typeof value === 'string'){
		var v4 = []
		if(!types.colorFromString(value, 1.0, v4, 0)){
			throw this.SyntaxErr(node,'Cant parse color '+node.value)
		}
		return 'vec4('+v4[0]+','+v4[1]+','+v4[2]+','+v4[3]+')'
	}
	if(Array.isArray(value)){
		return 'vec'+value.length+'('+value.join(', ')+')'
	}
	if(typeof value === 'number') return forceDot(value)
	return String(value)
}


function sortFrames(a,b){
	if(a.at > b.at) return 1
	if(a.at < b.at) return -1
	return 0
}

function computePropSizes(instanceProps){
	var totalSlots = 0
	for(let key in instanceProps){
		var prop = instanceProps[key]
		var slots = prop.type.slots
		if(prop.config.pack){
			if(prop.type.name === 'vec4'){
				slots = 2
			}
			else if(prop.type.name === 'vec2'){
				slots = 1
			}
			else throw new Error('Cant use packing on non vec2 or vec4 type for '+key)
		}

		// figure out if we have a from or a to
		var hasFrom = false
		var hasTo = false

		var states = prop.states
		if(states){ // no states, we'll just keep 1 slot
			for(var stateName in states){
				var state = states[stateName]
				var frames = state.frames

				frames.sort(sortFrames)
				
				if(frames[0].at != 0){
					frames.unshift({
						at:0,
						value:null
					})
				}
				var first = frames[0]
				var last = frames[frames.length-1]
				if(first.at !== 0 || first.value === null) hasFrom = true
				if(last.at !== 0 && last.value === null) hasTo = true
			}				
		}
		else{
			hasTo = true
		}

		prop.hasFrom = hasFrom
		prop.hasTo = hasTo
		prop.offset = totalSlots
		if(hasFrom) totalSlots += slots
		if(hasTo) totalSlots += slots
		if(!hasFrom && !hasTo) prop.slots = 0
		else prop.slots = slots
	}
	return totalSlots		
}


function computePropStates(states, instanceProps){
	// takes the 'states' property and computes states+frames per property
	// including per keyframe easing
	var names = []
	var statedProps = {}
	
	for(var stateName in states){
		names.push(stateName)
		var frames = states[stateName]
		// last and next values
		var stateTime = frames.time
		for(var ts in frames){
			var frame = frames[ts]
			if(ts === 'time'){
				continue
			}
			if(ts === 'from') ts = 0.
			else if(ts === 'to') ts = 1.
			else if(parseFloat(ts) == ts) ts = ts * 0.01
			else continue
			var frameTime = frame.time
			for(var prop in frame){
				var ip = instanceProps['thisDOT'+prop]

				if(prop === 'time'){
					continue
				}
				if(!ip) throw new Error("Property "+prop+" keyframed but not found in shader")
				// store our timing info
				statedProps[prop] = 1
				if(!ip.states) ip.states = {}
				var state = ip.states[stateName]
				if(!state) ip.states[stateName] = state = {}
				if(!state.frames) state.frames = []
				var value = frame[prop]
				var time = frameTime || stateTime
				if(value && value.constructor === Object){
					if(value.time) time = value.time
					value = value.value
				}
				state.frames.push({
					at:ts,
					time:time,
					value:value
				})
			}
		}
	}
}

function defineStructs(structs){
	// define structs
	var out = ''
	for(let key in structs){
		var struct = structs[key]
		// lets output the struct
		out += '\nstruct ' + key + '{\n'
		var fields = struct.fields
		for(let fieldname in fields){
			var field = fields[fieldname]
			out += '	'+field.name +' '+fieldname+';\n'
		}
		out += '};\n'
	}
	return out
}

function forceDot(num){
	var str = String(num)
	if(str.indexOf('.') === -1) return str+'.0'
	return str
}