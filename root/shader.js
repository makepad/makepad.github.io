module.exports = require('class').extend(function Shader(proto){

	var painter = require('painter')
	var types = require('types')
	var parser = require('jsparser/jsparser')
	var ShaderInfer = require('./shaderinfer')

	var compName = ['x','y','z','w']

	// allocate the nameids for attribute ranges
	for(var i = 0; i < 16; i++) painter.nameId('ATTR_'+i)

	proto.propAllocLimit = 150000

	proto.blending = [painter.SRC_ALPHA, painter.FUNC_ADD, painter.ONE_MINUS_SRC_ALPHA, painter.ONE, painter.FUNC_ADD, painter.ONE]
	proto.constantColor = undefined
	
	proto.vertexMain = function(){$
		var T = 1.
		this.animTime = this.time
		if(this.tween > 0.01){
			this.normalTween = clamp((this.animTime - this.tweenStart) / this.duration, 0.0, 1.0)
			T = this.easedTween = this.tweenTime(
				this.tween,
				this.normalTween, 
				this.ease.x,
				this.ease.y,
				this.ease.z,
				this.ease.w
			)
		}
		$CALCULATETWEEN
		var position = this.vertex()
		if(this.vertexPostMatrix[0][0] != 1. || this.vertexPostMatrix[1][1] != 1.){
			gl_Position = position * this.vertexPostMatrix
		}
		else{
			gl_Position = position
		}
	}

	proto.pixelMain = function(){$
		var color = this.pixel()
		if(this.workerId < 0.){
			if(color.a < this.pickAlpha) discard
			gl_FragColor = vec4(this.todoId/255.,floor(this.pickId/256.0)/255.,mod(this.pickId,256.0)/255.,abs(this.workerId)/255.)
		}
		else{
			gl_FragColor = color
		}
	}

	// fingerdown
	proto.checkFingerDown = function(f, pos){
		if(f[2] > 0. && this.todoId == mod(f[2],256.) &&  abs(this.workerId) == floor(f[2]/256.) && (this.pickId < 0. || this.pickId == f[3]) ){
			pos = (vec4(f.xy,0.,1.) * this.viewInverse).xy + vec2(this.lockScroll * this.viewScroll.x, this.lockScroll * this.viewScroll.y)
			return true
		}
		false
	}

	proto.isFingerDown = function(pos){$
		pos = vec2(0.)
		if(this.checkFingerDown(this.fingerInfo[0], pos)) return 1
		if(this.checkFingerDown(this.fingerInfo[1], pos)) return 2
		if(this.checkFingerDown(this.fingerInfo[2], pos)) return 3
		if(this.checkFingerDown(this.fingerInfo[3], pos)) return 4
		return 0
	}

	proto.checkFingerOver = function(f, pos){
		var f2 = abs(f[2])
		if(abs(this.workerId) == floor(f2/256.) && this.todoId == mod(f2,256.) && (this.pickId < 0. || this.pickId == f[3]) ){
			pos = (vec4(f.xy,0.,1.) * this.viewInverse).xy + vec2(this.lockScroll * this.viewScroll.x, this.lockScroll * this.viewScroll.y)
			return true
		}
		return false
	}

	// finger over
	proto.isFingerOver = function(pos){$
		pos = vec2(0.)
		if(this.checkFingerOver(this.fingerInfo[0], pos)) return 1
		if(this.checkFingerOver(this.fingerInfo[1], pos)) return 2
		if(this.checkFingerOver(this.fingerInfo[2], pos)) return 3
		if(this.checkFingerOver(this.fingerInfo[3], pos)) return 4
		return 0
	}

	proto.animateUniform = function(uni){$
		return clamp((this.animTime - uni.x)/uni.y, 0., 1.) * (uni.w-uni.z) + uni.z
	}

	proto.onextendclass = function(){
		// call shader compiler
		//if(!this.$shaderClean){
		//	this.$shaderClean = true
			this.$compileShader()
		//}
	}

	// ok the alpha blend modes. how do we do it.
	proto.$mapExceptions = true

	proto.$uniformHeader = ""
	proto.$pixelHeader = ""
	proto.$vertexHeader = ""

	proto.$compileShader = function(){
		var vtx = ShaderInfer.generateGLSL(this, this.vertexMain, null, proto.$mapExceptions)
		var pix = ShaderInfer.generateGLSL(this, this.pixelMain, vtx.varyOut, proto.$mapExceptions)

		if(vtx.exception || pix.exception) return

		var inputs = {}, geometryProps = {}, instanceProps = {}, styleProps = {}, uniforms = {}
		for(var key in vtx.geometryProps) inputs[key] = geometryProps[key] = vtx.geometryProps[key]
		for(var key in pix.geometryProps) inputs[key] = geometryProps[key] = pix.geometryProps[key]
		for(var key in vtx.instanceProps) inputs[key] = styleProps[key] = instanceProps[key] = vtx.instanceProps[key]
		for(var key in pix.instanceProps) inputs[key] = styleProps[key] = instanceProps[key] = pix.instanceProps[key]
		for(var key in vtx.uniforms) uniforms[key] = vtx.uniforms[key]
		for(var key in pix.uniforms){
			var uni = pix.uniforms[key]
			if(uniforms[key]) uniforms[key].refcount += uni.refcount
			else uniforms[key] = uni
		}

		// the shaders
		var vhead = proto.$vertexHeader, vpre = '', vpost = ''
		var phead = proto.$pixelHeader, ppre = '', ppost = ''

		// Unpack and tween props
		vhead += '// prop attributes\n'

		var tweenrep = ''

		// calc prop size
		var totalslots = 0

		for(var key in instanceProps){
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
			prop.offset = totalslots
			prop.slots = slots
			totalslots += slots
			if(!prop.config.noTween) totalslots += slots
		}

		function propSlot(idx){
			var slot = Math.floor(idx/4)
			var ret = 'ATTR_' +  slot
			if(lastslot !== slot || totalslots%4 !== 1) ret += '.' + compName[idx%4]
			return ret
		}

		// Unpack attributes
		var lastslot = Math.floor(totalslots/4)
		var propSlots = 0
		for(var key in instanceProps){
			var prop = instanceProps[key]
			var slots = prop.slots
			// lets create the unpack / mix code here
			propSlots += slots
			var pack = prop.config.pack
			if(pack){
				if(prop.type.name === 'vec2'){
					if(prop.config.noTween){
						vpre += '\t' + key + ' = vec2('
						var start = propSlots - slots
						var p1 = propSlot(start)
						vpre += 'floor('+p1+'/4096.0)'
						vpre += ',mod('+p1+',4096.0)'
						if(pack === 'float12') vpre += ')/4095.0;\n'
						else vpre += ');\n'
					}
					else{
						propSlots += slots
						tweenrep += '\t' + key + ' = mix(vec2('
						var start1 = propSlots - slots
						var start2 = propSlots - slots*2
						var p1 = propSlot(start1)
						var p3 = propSlot(start2)
						tweenrep += 'floor('+p1+'/4096.0)' 
						tweenrep += ',mod('+p1+',4096.0)' 
						tweenrep += '),vec2('
						tweenrep += 'floor('+p3+'/4096.0)'
						tweenrep += ',mod('+p3+',4096.0)'
						if(pack === 'float12') tweenrep += '),T)/4095.0;\n'
						else tweenrep += '),T);\n'
					}
				}
				else{
					if(prop.config.noTween){
						vpre += '\t' + key + ' = vec4('
						var start = propSlots - slots
						var p1 = propSlot(start)
						var p2 = propSlot(start+1)
						vpre += 'floor('+p1+'/4096.0)'
						vpre += ',mod('+p1+',4096.0)'
						vpre += ',floor('+p2+'/4096.0)' 
						vpre += ',mod('+p2+',4096.0)' 
						if(pack === 'float12') vpre += ')/4095.0;\n'
						else vpre += ');\n'
					}
					else{
						propSlots += slots
						tweenrep += '\t' + key + ' = mix(vec4('
						var start1 = propSlots - slots
						var start2 = propSlots - slots*2
						var p1 = propSlot(start1)
						var p2 = propSlot(start1+1)
						var p3 = propSlot(start2)
						var p4 = propSlot(start2+1)
						tweenrep += 'floor('+p1+'/4096.0)' 
						tweenrep += ',mod('+p1+',4096.0)' 
						tweenrep += ',floor('+p2+'/4096.0)'
						tweenrep += ',mod('+p2+',4096.0)'
						tweenrep += '),vec4('
						tweenrep += 'floor('+p3+'/4096.0)'
						tweenrep += ',mod('+p3+',4096.0)'
						tweenrep += ',floor('+p4+'/4096.0)'
						tweenrep += ',mod('+p4+',4096.0)'
						if(pack === 'float12') tweenrep += '),T)/4095.0;\n'
						else tweenrep += '),T);\n'
					}
				}
			}
			else{
				if(prop.config.noTween){
					var vdef = prop.type.name + '('
					if(vdef === 'float(') vdef = '('
					for(var i = 0, start = propSlots - slots; i < slots; i++){
						if(i) vdef += ', '
						vdef += propSlot(start + i)
					}
					vdef += ')'
					vpre += '\t' + key + ' = ' + vdef + ';\n'
				}
				else{
					propSlots += slots
					var vnew = prop.type.name + '('
					if(vnew === 'float(') vnew = '('
					var vold = vnew
					for(var i = 0, start1 = propSlots - slots, start2 = propSlots - slots*2; i < slots; i++){
						if(i) vnew += ', ', vold += ', '
						vnew += propSlot(start1 + i)
						vold += propSlot(start2 + i)
					}
					vnew += ')'
					vold += ')'
					tweenrep += '\t' + key + ' = mix(' + vnew + ',' + vold + ',T);\n'
				}
			}
		}

		var attrid = 0
		for(var i = totalslots, pid = 0; i > 0; i -= 4){
			if(i >= 4) vhead += 'attribute vec4 ATTR_'+(attrid)+';\n'
			if(i == 3) vhead += 'attribute vec3 ATTR_'+(attrid)+';\n'
			if(i == 2) vhead += 'attribute vec2 ATTR_'+(attrid)+';\n'
			if(i == 1) vhead += 'attribute float ATTR_'+(attrid)+';\n'
			attrid++
		}

		for(var key in geometryProps){
			var geom = geometryProps[key]
			var slots = geom.type.slots

			if(slots > 4){
				var v1 = geom.type.name + '('
				if(v1 === 'float(') v1 = '('
				vpre += '\t' + key + ' = ' + v1
				for(var i = 0; i < slots; i++){
					if(i) vpre += ', '
					vpre += '\tATTR_' + (attrpid + Math.floor(i/4)) + '.' + compName[i%4]
				}
				vpre += ');\n'

				for(var i = slots, pid = 0; i > 0; i -= 4){
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

		// define structs
		for(var key in vtx.structs){
			var struct = vtx.structs[key]
			// lets output the struct
			vhead += '\nstruct ' + key + '{\n'
			var fields = struct.fields
			for(var fieldname in fields){
				var field = fields[fieldname]
				vhead += '	'+field.name +' '+fieldname+';\n'
			}
			vhead += '};\n'
		}

		for(var key in pix.structs){
			var struct = pix.structs[key]
			// lets output the struct
			phead += '\nstruct ' + key + '{\n'
			var fields = struct.fields
			for(var fieldname in fields){
				var field = fields[fieldname]
				phead += '	'+field.name +' '+fieldname+';\n'
			}
			phead += '};\n'
		}

		// define the input variables
		vhead += '\n// inputs\n'
		for(var key in inputs){
			var input = inputs[key]
			vhead += input.type.name + ' ' + key + ';\n'
		}

		// define the varying targets
		for(var key in vtx.varyOut){
			var vary = vtx.varyOut[key]
			vhead += vary.type.name + ' ' + key + ';\n'
		}

		// lets pack/unpack varying and props and attributes used in pixelshader
		var allvary = {}
		for(var key in pix.geometryProps) allvary[key] = pix.geometryProps[key]
		for(var key in pix.varyOut) allvary[key] = pix.varyOut[key]
		for(var key in pix.instanceProps) allvary[key] = pix.instanceProps[key]

		// make varying packing and unpacking
		var vid = 0, curslot = 0, varystr = ''
		var varyslots = 0
		for(var key in allvary){
			var prop = allvary[key]
			var type = prop.type
			var slots = type.slots

			// define the variables in pixelshader
			if(curslot === 0) phead += '// inputs\n'
			phead += type.name + ' ' + key + ';\n'
			varyslots += slots

			// pack the varying
			for(var i = 0; i < slots; i++, curslot++){
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
			for(var i = 0; i < slots; i++){
				if(i) ppre += ', '
				ppre += 'VARY_'+Math.floor((i+start)/4) + '.' + compName[(i+start)%4]
			}
			ppre += ');\n'
		}
		for(var i =(4 - curslot%4)%4 - 1; i >= 0; i--){
			vpost += ',0.'
		}
		if(curslot) vpost += ');\n'

		vhead += this.$uniformHeader

		var hasuniforms = 0
		for(var key in vtx.uniforms){
			if(!hasuniforms++)vhead += '\n// uniforms\n'
			vhead += 'uniform ' + vtx.uniforms[key].type.name + ' ' + key + ';\n'
		}

		phead += this.$uniformHeader

		var hasuniforms = 0
		for(var key in pix.uniforms){
			if(!hasuniforms++)phead += '\n// uniforms\n'
			phead += 'uniform ' + pix.uniforms[key].type.name + ' ' + key + ';\n'
		}

		// the sampler uniforms
		var hassamplers = 0
		var samplers = {}
		for(var key in vtx.samplers){
			var sampler = samplers[key] = vtx.samplers[key].sampler
			if(!hassamplers++)vhead += '\n// samplers\n'
			vhead += 'uniform ' + sampler.type.name + ' ' + key + ';\n'
		}

		var hassamplers = 0
		for(var key in pix.samplers){
			var sampler = samplers[key] = pix.samplers[key].sampler
			if(!hassamplers++)phead += '\n// samplers\n'
			phead += 'uniform ' + sampler.type.name + ' ' + key + ';\n'
		}

		// define output variables in pixel shader
		phead += '\n// outputs\n'
		for(var key in pix.outputs){
			var output = pix.outputs[key]
			phead += output.name + ' ' + key + ';\n'
		}

		// how do we order these dependencies so they happen top down
		var vfunc = ''
		for(var i = 0; i < vtx.genFunctions.length; i++){//key in vtx.genFunctions){
			var fn =  vtx.genFunctions[i].value
			vfunc = '\n'+fn.code + '\n' + vfunc
		}

		/*
		if(vtx.genFunctions.this_DOT_vertex_T.return.type !== types.vec4){
			vtx.mapException({
				state:{
					curFunction:vtx.genFunctions.this_DOT_vertex_T
				},
				type:'generate',
				message:'vertex function not returning a vec4',
				node:vtx.genFunctions.this_DOT_vertex_T.ast
			})
		}*/

		var vertex = vhead 
		vertex += vfunc
		vertex += '\nvoid main(){\n'
		vertex += vpre
		vertex += vtx.main.replace("\t$CALCULATETWEEN",tweenrep)
		vertex += vpost
		vertex += '}\n'

		var pfunc = ''
		for(var i = 0; i < pix.genFunctions.length; i++){//key in pix.genFunctions){
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
		for(var key in this._props){
			var config = this._props[key]
			var propname = 'this_DOT_' + key
			if(config.styleLevel && !styleProps[propname]){
				styleProps[propname] = {
					name:key,
					config:config
				}
			}
		}

		if(vtx.exception || pix.exception){
			return
		}

		this.$compileInfo = {
			name:this.name || this.constructor.name,
			instanceProps:instanceProps,
			geometryProps:geometryProps,
			styleProps:styleProps,
			uniforms:uniforms,
			samplers:samplers,
			vertex:vertex,
			pixel:pixel,
			propSlots:propSlots
		}

		if(this.dump) console.log(vertex,pixel)
	}


	function stylePropCode(indent, inobj, styleProps, styleLevel, noif){
		var code = ''
		for(var key in styleProps){
			var prop = styleProps[key]
			var name = prop.name
			if(prop.config.noStyle) continue
			if(styleLevel && prop.config.styleLevel > styleLevel) continue
			if(!noif){
				code += indent+'if(_'+name+' === undefined) _'+name+ ' = '+inobj+'.' + name +'\n'
			}
			else{
				code += indent+'_'+name+ ' = '+inobj+'.' + name +'\n'
			}
		}
		return code
	}

	function styleStampRootCode(indent, inobj, props, styleProps, styleLevel){
		var code = ''
		for(var key in styleProps){
			var prop = styleProps[key]
			var name = prop.name
			if(prop.config.noStyle) continue
			if(styleLevel && prop.config.styleLevel > styleLevel) continue
			if(name in props){
				code += indent+'_'+name+ ' = '+inobj+'._' + name +'\n'
			}
		}
		return code
	}

	function styleTweenCode(indent, inobj){
		var code = ''
		code += indent+'if(_tween === undefined) _tween = '+inobj+'.tween\n'
		code += indent+'if(_duration === undefined) _duration = '+inobj+'.duration\n'
		code += indent+'if(_delay === undefined) _delay = '+inobj+'.delay\n'
		code += indent+'if(_ease === undefined) _ease = '+inobj+'.ease\n'
		return code
	}

	proto.$STYLEPROPS = function(target, classname, macroargs, mainargs, indent){
		if(!this.$compileInfo) return ''
		// first generate property overload stack
		// then write them on the turtles' propbag
		var styleProps = this.$compileInfo.styleProps
		if(!macroargs) throw new Error('$STYLEPROPS doesnt have overload argument')

		// lets make the vars
		var code = indent + 'var $turtle = this.turtle'
		var styleLevel = macroargs[1]
		for(var key in styleProps){
			var prop = styleProps[key]
			if(prop.config.noStyle) continue
			if(styleLevel && prop.config.styleLevel > styleLevel) continue
			code += ', _' + prop.name
		}
		code += '\n\n'
		code += 'if(' + macroargs[0] + ' === this){\n'
		code += styleStampRootCode('	', macroargs[0], target._props, styleProps, styleLevel)
		code += '}\n'
		code += 'else if(' + macroargs[0] + '){\n'
		code += stylePropCode('	', macroargs[0], styleProps, styleLevel, true)
		code += '}\n'

		code += 'var $p0 = this.$stampArgs && this.$stampArgs.'+classname+'\n'
		code += 'if($p0){\n'
		code += stylePropCode('	', '$p0', styleProps, styleLevel)
		code += '}\n'

		code += 'var $p1 = this.$outerState && this.$outerState.'+classname+'\n'
		code += 'if($p1){\n'
		code += stylePropCode('	', '$p1', styleProps, styleLevel)
		code += '}\n'

		code += 'var $p2 = this._state && this._state.'+classname+'\n'
		code += 'if($p2){\n'
		code += stylePropCode('	', '$p2', styleProps, styleLevel)
		code += '}\n'

		if(styleProps.this_DOT_tween){
			code += 'var $p3 = this.$stampArgs\n'
			code += 'if($p3){\n'
			code += styleTweenCode('	', '$p3')
			code += '}\n'

			code += 'var $p4 = this.$outerState\n'
			code += 'if($p4){\n'
			code += styleTweenCode('	', '$p4')
			code += '}\n'

			code += 'var $p5 = this._state\n'
			code += 'if($p5){\n'
			code += styleTweenCode('	', '$p5')
			code += '}\n'

			code += styleTweenCode('', 'this')
		}
		// last one is the class
		code += 'var $p9 = this._'+classname+'.prototype\n'
		code += stylePropCode('', '$p9', styleProps, styleLevel)

		//console.log(code)
		// store it on the turtle
		code += '\n'
		for(var key in styleProps){
			var prop = styleProps[key]
			var name = prop.name
			if(prop.config.noStyle) continue
			if(macroargs[1] && prop.config.styleLevel > macroargs[1]) continue
			// store on turtle
			code += indent + '$turtle._' + name +' = _' + name + '\n'
		}
		return code
	}

	proto.$ALLOCDRAW = function(target, classname, macroargs, mainargs, indent){
		if(!this.$compileInfo) return ''
		// lets generate the draw code.
		// what do we do with uniforms?.. object ref them from this?
		// lets start a propsbuffer 
		var info = this.$compileInfo
		var code = ''
		
		var need = macroargs[0] || 1
		var fastWrite = macroargs[1]

		code += indent+'var $view = this.view\n'
		code += indent+'var $shader = this.$shaders.'+classname+' || this.$allocShader("'+classname+'")\n'
		code += indent+'var $props = $shader.$props\n'
		code += indent+'var $proto = this._' + classname +'.prototype\n'
		code += indent+'if($props.$frameId !== $view._frameId && !$view.$inPlace){\n'
		code += indent+'	$props.$frameId = $view._frameId\n'
		code += indent+'	$props.oldLength = $props.length\n'
		code += indent+'	$props.length = 0\n'
		code += indent+'	$props.dirty = true\n'
		code += indent+'	\n'
		code += indent+'	var $todo = $view.todo\n'
		code += indent+'	$todo.useShader($shader)\n'
		// first do the normal attributes
		var geometryProps = info.geometryProps
		
		var attrbase = painter.nameId('ATTR_0')
		// do the props
		var attroffset = Math.ceil(info.propSlots / 4)
		code += indent+'	$todo.instances('+(attrbase)+','+attroffset+',$props)\n'
		var attrid = attroffset
		// set attributes
		for(var key in geometryProps){
			var geom = geometryProps[key]
			var attrange = Math.ceil(geom.type.slots / 4)
			var nodot = key.slice(9)
			//code += indent+'	$attrlen = $proto.'+nodot+'.length\n'
			code += indent+'	$todo.attributes('+(attrbase+attrid)+','+attrange+',$proto.'+nodot+')\n'
			attrid += attrange
		}
		// check if we have indice
		if(this.indices){
			code += indent+'	$todo.indices($proto.indices)\n'
		}
		
		// lets set the blendmode
		code += '	$todo.blending($proto.blending, $proto.constantColor)\n'

		// set uniforms
		var uniforms = info.uniforms
		for(var key in uniforms){
			var uniform = uniforms[key]
			if(uniform.config.asGlobal) continue
			if(key === 'this_DOT_time' && uniform.refcount > 1){
				code += indent +'	$todo.timeMax = Infinity\n'
			}
			var thisname = key.slice(9)
			var source = mainargs[0]+' && '+mainargs[0]+'.'+thisname+' || $view.'+ thisname +'|| $proto.'+thisname
			var typename = uniform.type.name
			if(uniform.config.animate){
				code += indent+'    var $animate = '+source+'\n'
				code += indent+'    if($animate[0]+$animate[1] > $todo.timeMax) $todo.timeMax = $animate[0]+$animate[1]\n'
				code += indent+'	$todo.'+typename+'Uniform('+painter.nameId(key)+',$animate)\n'

			}
			else code += indent+'	$todo.'+typename+'Uniform('+painter.nameId(key)+','+source+')\n'
		}

		// do the samplers
		var samplers = info.samplers
		for(var key in samplers){
			var sampler = samplers[key]

			var thisname = key.slice(9)
			var source = mainargs[0]+' && '+mainargs[0]+'.'+thisname+' || $proto.'+thisname

			code += indent +'	$todo.sampler('+painter.nameId(key)+','+source+',$proto.$compileInfo.samplers.'+key+')\n'
		}
		// lets draw it
		code += indent + '	$todo.drawArrays('+painter.TRIANGLES+')\n'
		code += indent + '}\n'
		code += indent + 'var $propslength = $props.length\n\n'
		code += indent + 'var $need = min($propslength + '+need+',$proto.propAllocLimit)\n'
		code += indent + 'if($need > $props.allocated && $need) $props.alloc($need)\n'
		if(!fastWrite){
			code += indent + 'var $writelevel = (typeof _x === "number" && !isNaN(_x) || typeof _x === "string" || typeof _y === "number" && !isNaN(_y) || typeof _y === "string")?$view.$turtleStack.len - 1:$view.$turtleStack.len\n'
			code += indent + '$view.$writeList.push($props, $propslength, $need, $writelevel)\n'
			
			if(target.$isStamp){
				code += indent + 'if(this.$propsId'+classname+' !== $view._frameId){\n'
				code += indent + '	this.$propsId'+classname+' = $view._frameId\n'
				code += indent + '	this.$propsLen'+classname+' = $propslength\n'
				code += indent + '}\n'
			}
		}
		else{
			code += indent + 'var $a = $props.array\n'
			code += indent + '$props.dirty = true\n'
		}
		code += indent + 'var $turtle = this.turtle\n'
		code += indent + '$turtle.$propoffset = $propslength\n'
		code += indent + '$props.length = $need\n'

		return code
	}

	proto.$DUMPPROPS = function(instanceProps, indent){
		var code = ''

		for(var key in instanceProps){
			var prop = instanceProps[key]
			var slots = prop.slots
			var o = prop.offset
			var notween = prop.config.noTween
			if(!notween){
				// new, old
				for(var i = 0; i < slots; i++){
					code += indent + 'console.log("'+(prop.name+(slots>1?i:''))+' "+$a[$o+'+(o+i+slots)+']+"->"+$a[$o+'+(o+i)+'])\n'
				}
			}
			else{
				for(var i = 0; i < slots; i++){
					code += indent + 'console.log("'+(prop.name+(slots>1?i:''))+' "+$a[$o+'+(o+i)+'])\n'
				}
			}
		}
		return code
	}

	proto.$PREVPROPS = function(target, classname, macroargs, mainargs, indent){
		if(!this.$compileInfo) return ''
		var code = ''
		var info = this.$compileInfo
		code += indent +'var $props =  this.$shaders.'+classname+'.$props\n'
		code += indent +'var $a = $props.array\n'
		code += indent +'var $o = (this.turtle.$propoffset - 1) * ' + info.propSlots +'\n'
		var instanceProps = info.instanceProps
		var argobj = macroargs[0]
		for(var key in argobj){
			var prop = instanceProps['this_DOT_'+key]
			// lets write prop
			if(prop.config.pack) throw new Error('Please implement PREVPROP packing support '+key)
			if(prop.config.type.slots>1) throw new Error('Please implement PREVPROP vector support '+key)

			code += indent + '$a[$o+'+prop.offset+'] = ' +argobj[key] +'\n'
		}
		return code
	}

	proto.$PROPLEN = function(target, classname, macroargs, mainargs, indent){
		return 'this.$shaders.'+classname+'.$props.length'
	}

	proto.$PROPVARDEF = function(target, classname, macroargs, mainargs, indent){
		if(!this.$compileInfo) return ''
		var code = ''
		var info = this.$compileInfo
	
		code += indent +'var $props = this.$shaders.'+classname+'.$props\n'
		code += indent +'var $a = $props.array\n'

		return code
	}

	proto.$PROP = function(target, classname, macroargs, mainargs, indent){
		if(!this.$compileInfo) return ''
		var code = ''
		var info = this.$compileInfo
		var prop = info.instanceProps['this_DOT_'+macroargs[1].slice(1,-1)]
		return '$a[(' + macroargs[0] + ')*'+ info.propSlots +'+'+prop.offset+']'
	}

	proto.$PREV = function(target, classname, macroargs, mainargs, indent){
		if(!this.$compileInfo) return ''
		var code = ''
		var info = this.$compileInfo
		if(info.noTween) throw new Error('Property ' + macroargs[1] + ' does not tween')
		var prop = info.instanceProps['this_DOT_'+macroargs[1].slice(1,-1)]
		return '$a[(' + macroargs[0] + ')*'+ info.propSlots +'+'+(prop.offset+prop.type.slots)+']'
	}

	proto.$WRITEPROPS = function(target, classname, macroargs, mainargs, indent){
		if(!this.$compileInfo) return ''
		// load the turtle

		var fastWrite = typeof macroargs[0] === 'object'?macroargs[0].$fastWrite:false

		var hasTweenDelta = macroargs[0].$tweenDelta
		var info = this.$compileInfo
		var instanceProps = info.instanceProps
		var code = ''
		code += indent + 'var $turtle = this.turtle\n'

		if(!fastWrite){
			code += indent + 'var $view = this.view\n'
			code += indent + 'var $inPlace = $view.$inPlace\n\n'
			code += indent +'var $proto = this._' + classname +'.prototype\n'
			code += indent +'var $shader = this.$shaders.'+classname+'\n'
			code += indent +'var $props = $shader.$props\n'
			code += indent +'var $a = $props.array\n'
			code += indent + '$props.dirty = true\n'

		}

		if(macroargs[0].$offset){
			code += indent +'var $o = ('+macroargs[0].$offset+') * ' + info.propSlots +'\n'
		}
		else{
			if(!fastWrite){
				code += indent +'var $o = $turtle.$propoffset++ * ' + info.propSlots +'\n'
			}
			else{
				code += indent +'var $o = $propslength++ * ' + info.propSlots +'\n'
			}
		}

		if(hasTweenDelta){
			code += indent +'var $tweenDelta = (' + macroargs[0].$tweenDelta + ') * '+info.propSlots+'\n'
			code += indent +'var $fwdTween =  $o - $tweenDelta\n'
		}
		//code += indent +'var $changed = false\n'
		var tweencode = '	var $f = $time, $1mf = 1.-$time, $upn, $upo\n'
		tweencode += '	var $cf = Math.min(1.,Math.max(0.,$time)), $1mcf = 1.-$cf\n'
		
		var isAnimate = macroargs[0].$animate

		var propcode = ''
		var deltafwd = ''
		var copyfwd = ''
		var copyprev = ''
		// lets generate the tween
		for(var key in instanceProps){
			var prop = instanceProps[key]
			var slots = prop.slots
			var o = prop.offset
			var notween =  prop.config.noTween
			var noInPlace = fastWrite?false:prop.config.noInPlace
			propcode += '\n'+indent+'// '+key + '\n'
			// generate the code to tween.
			if(!notween){
				// new, old
				if(noInPlace) tweencode += indent + 'if(!$inPlace){\n'

				tweencode += '\n'+indent+'	//' + key + '\n'

				var pack = prop.config.pack
				if(pack){
					// we have to unpack before interpolating
					for(var i = 0; i < slots; i++){
						tweencode += indent + '_upn = $a[$o+'+(o + i)+'], _upo = $a[$o+'+(o + i + slots)+']\n'
						tweencode += indent + '$a[$o+'+(o +i)+'] = ' +
							'(($1mcf * Math.floor(_upo/4096) +' +
							'$cf * Math.floor(_upn/4096)) << 12) + ' + 
							'(($1mcf * (_upo%4096) +' +
							'$cf * (_upn%4096))|0)\n'
						if(hasTweenDelta){
							deltafwd += indent + '$a[$o+'+(o + i + slots)+'] = $a[$o+'+(o +i)+'+$tweenDelta]\n'
							copyfwd += indent + '$a[$fwdTween+'+(o + i + slots)+'] = $a[$o+'+(o +i)+']\n'
						}
						copyprev += indent + '$a[$o+'+(o + i + slots)+'] = $a[$o+'+(o +i)+']\n'
					}
				}
				else{

					for(var i = 0; i < slots; i++){
						//if(key === 'this_DOT_open') tweencode += 'if($o===2*' + info.propSlots +')console.error($duration,$cf, $a[$o+'+(o +i)+'])\n'

						tweencode += indent + '	$a[$o+'+(o +i)+'] = ' +
							'$1mcf * $a[$o+'+(o + i + slots)+'] + ' +
							'$cf * $a[$o+'+(o +i)+']\n'

						if(hasTweenDelta){
							deltafwd += indent + '$a[$o+'+(o + i + slots)+'] = $a[$o+'+(o +i)+'+$tweenDelta]\n'
							copyfwd += indent + '$a[$fwdTween+'+(o + i + slots)+'] = $a[$o+'+(o +i)+']\n'
						}
						copyprev += indent + '$a[$o+'+(o + i + slots)+'] = $a[$o+'+(o +i)+']\n'
					}
				}
				if(noInPlace) tweencode += indent + '}\n'
			}

			// assign properties
			// check if we are a vec4 and typeof string

			var propsource = '$turtle._' + prop.name

			if(prop.name === 'tweenStart'){
				if(macroargs[0].delay) propsource = '($view._time +'+macroargs[0].delay+')'
				else propsource = '($view._time + $turtle._delay)'
			}
			if(typeof macroargs[0] === 'object'){
				var marg = macroargs[0][prop.name]
				if(marg) propsource = marg
				else if(prop.name !== 'tweenStart' && fastWrite) continue
			}

			if(isAnimate && !(prop.name in macroargs[0]) && prop.name !== 'tweenStart'){
				continue
			}

			if(noInPlace){
				propcode += indent + 'if(!$inPlace){\n'
			}

			if(prop.type.name === 'vec4'){
				// check packing
				var pack = prop.config.pack
				if(pack){
					propcode += indent + 'var _' + prop.name + ' = '+ propsource +'\n'
					if(pack === 'float12'){
						if(fastWrite || prop.config.noCast){
							propcode += indent +'$a[$o+'+(o)+']=((_'+prop.name+'[0]*4095)<<12) + ((_'+prop.name+'[1]*4095)|0),$a[$o+'+(o+1)+']=((_'+prop.name+'[2] * 4095)<<12) + ((_'+prop.name+'[3]*4095)|0)\n'
						}
						else{
							propcode += indent + 'if(typeof _'+prop.name+' === "object"){\n'
							propcode += indent + '	if(_'+prop.name+'.length === 4)$a[$o+'+(o)+']=((Math.min(_'+prop.name+'[0],1.)*4095)<<12) + ((Math.min(_'+prop.name+'[1],1.)*4095)|0),$a[$o+'+(o+1)+']=((Math.min(_'+prop.name+'[2],1.) * 4095)<<12) + ((Math.min(_'+prop.name+'[3],1.)*4095)|0)\n'
							propcode += indent + '	else if(_'+prop.name+'.length === 2)this.$parseColorPacked(_'+prop.name+'[0], _'+prop.name+'[1],$a,$o+'+o+')\n'
							propcode += indent + '	else if(_'+prop.name+'.length === 1)$a[$o+'+o+']=$a[$o+'+(o+1)+']=((_'+prop.name+'[0]*4095)<<12) + ((_'+prop.name+'[0]*4095)|0)\n'
							propcode += indent + '}\n'
							propcode += indent + 'if(typeof _'+prop.name+' === "string")this.$parseColorPacked(_'+prop.name+',1.0,$a,$o+'+o+')\n'
							propcode += indent + 'else if(typeof _'+prop.name+' === "number")$a[$o+'+o+']=$a[$o+'+(o+1)+']=((_'+prop.name+'*4095)<<12) + ((_'+prop.name+'*4095)|0)\n'
						}
					}
					else{ // int packing
						if(fastWrite || prop.config.noCast){
							propcode += indent +'$a[$o+'+(o)+']=(_'+prop.name+'[0]<<12) + (_'+prop.name+'[1]|0),$a[$o+'+(o+1)+']=(_'+prop.name+'[2]<<12) + (_'+prop.name+'[3]|0)\n'
						}
						else{
							propcode += indent + 'if(typeof _'+prop.name+' === "object"){\n'
							propcode += indent + '	if(_'+prop.name+'.length === 4)$a[$o+'+(o)+']=(_'+prop.name+'[0]<<12) + (_'+prop.name+'[1]|0),$a[$o+'+(o+1)+']=(_'+prop.name+'[2]<<12) + (_'+prop.name+'[3]|0)\n'
							propcode += indent + '	else if(_'+prop.name+'.length === 1)$a[$o+'+o+']=$a[$o+'+(o+1)+']=((_'+prop.name+'[0])<<12) + ((_'+prop.name+'[0])|0)\n'
							propcode += indent + '}\n'
							propcode += indent + 'else if(typeof _'+prop.name+' === "number")$a[$o+'+o+']=$a[$o+'+(o+1)+']=((_'+prop.name+')<<12) + ((_'+prop.name+')|0)\n'
						}
					}
				}
				else{
					propcode += indent + 'var _' + prop.name + ' = '+ propsource +'\n'
					if(fastWrite || prop.config.noCast){
						propcode += indent +'$a[$o+'+(o)+']=_'+prop.name+'[0],$a[$o+'+(o+1)+']=_'+prop.name+'[1],$a[$o+'+(o+2)+']=_'+prop.name+'[2],$a[$o+'+(o+3)+']=_'+prop.name+'[3]\n'
					}
					else{
						propcode += indent + 'if(typeof _'+prop.name+' === "object"){\n'
						propcode += indent + '	if(_'+prop.name+'.length === 4)$a[$o+'+(o)+']=_'+prop.name+'[0],$a[$o+'+(o+1)+']=_'+prop.name+'[1],$a[$o+'+(o+2)+']=_'+prop.name+'[2],$a[$o+'+(o+3)+']=_'+prop.name+'[3]\n'
						propcode += indent + '	else if(_'+prop.name+'.length === 1)$a[$o+'+o+']=$a[$o+'+(o+1)+']=$a[$o+'+(o+2)+']=$a[$o+'+(o+3)+']=_'+prop.name+'[0]\n'
						propcode += indent + '	else if(_'+prop.name+'.length === 2)this.$parseColor(_'+prop.name+'[0], _'+prop.name+'[1],$a,$o+'+o+')\n'
						propcode += indent + '}\n'
						propcode += indent + 'else if(typeof _'+prop.name+' === "string")this.$parseColor(_'+prop.name+',1.0,$a,$o+'+o+')\n'
						propcode += indent + 'else if(typeof _'+prop.name+' === "number")$a[$o+'+o+'] = $a[$o+'+(o+1)+'] = $a[$o+'+(o+2)+']=$a[$o+'+(o+3)+']=_'+prop.name+'\n'
					}
				}
			}
			else if(prop.type.name === 'vec2'){
				// check packing
				var pack = prop.config.pack
				if(pack){
					propcode += indent + 'var _' + prop.name + ' = '+ propsource +'\n'
					if(pack === 'float12'){
						if(fastWrite || prop.config.noCast){
							propcode += indent + '$a[$o+'+(o)+']=((_'+prop.name+'[0]*4095)<<12) + ((_'+prop.name+'[1]*4095)|0)\n'
						}
						else{
							propcode += indent + 'if(typeof _'+prop.name+' === "object"){\n'
							propcode += indent + '	$a[$o+'+(o)+']=((_'+prop.name+'[0]*4095)<<12) + ((_'+prop.name+'[1]*4095)|0)\n'
							propcode += indent + '}\n'
							propcode += indent + 'else $a[$o+'+o+']=((_'+prop.name+'*4095)<<12) + ((_'+prop.name+'*4095)|0)\n'
						}
					}
					else{ // int packing
						if(fastWrite || prop.config.noCast){
							propcode += indent + '$a[$o+'+(o)+']=(_'+prop.name+'[0]<<12) + (_'+prop.name+'[1]|0)\n'
						}
						else{
							propcode += indent + 'if(typeof _'+prop.name+' === "object"){\n'
							propcode += indent + '	$a[$o+'+(o)+']=(_'+prop.name+'[0]<<12) + (_'+prop.name+'[1]|0)\n'
							propcode += indent + '}\n'
							propcode += indent + 'else if(typeof _'+prop.name+' === "number")$a[$o+'+o+']=((_'+prop.name+')<<12) + ((_'+prop.name+')|0)\n'
						}
					}
				}
				else{
					propcode += indent + 'var _' + prop.name + ' = '+ propsource +'\n'
					if(fastWrite || prop.config.noCast){
						propcode += indent + '$a[$o+'+(o)+']=_'+prop.name+'[0],$a[$o+'+(o+1)+']=_'+prop.name+'[1]\n'
					}
					else{
						propcode += indent + 'if(typeof _'+prop.name+' === "object"){\n'
						propcode += indent + '	$a[$o+'+(o)+']=_'+prop.name+'[0],$a[$o+'+(o+1)+']=_'+prop.name+'[1]\n'
						propcode += indent + '}\n'
						propcode += indent + 'else $a[$o+'+(o)+']=$a[$o+'+(o+1)+']=_'+prop.name+'\n'
					}
				}
			}
			else{
				if(slots === 1){
					propcode += indent + '$a[$o+'+o+'] = '+propsource+'\n'
				}
				else{
					propcode += indent + 'var _' + prop.name + ' = '+propsource+'\n'
					//propcode += indent + 'if(_'+prop.name+' === undefined) console.error("Property '+prop.name+' is undefined")\n'
					//propcode += indent + 'else '
					for(var i = 0; i < slots; i++){
						if(i) propcode += ','
						propcode += '$a[$o+'+(o+i)+']=_'+prop.name+'['+i+']\n'
					}
					propcode += '\n'
				}
			}

			if(noInPlace){
				propcode += indent+'}\n'
			}			
		}

		// if we dont have per instance tweening
		if(!instanceProps.this_DOT_tween){
			code += indent + 'if($proto.tween > 0){\n'

			if(instanceProps.this_DOT_duration){
				code += indent + '	var $duration = $a[$o + ' + instanceProps.this_DOT_duration.offset +']\n'
			}
			else{
				code += indent + '	var $duration = $proto.duration\n'
			}			
			code += indent + '	if(!$proto.noInterrupt && $view._time < $a[$o + ' + instanceProps.this_DOT_tweenStart.offset +'] +  $duration){\n'
			code += indent + '	var $ease = $proto.ease\n'
			code += indent + '	var $time = $proto.tweenTime($proto.tween'
			code += ',Math.min(1,Math.max(0,($view._time - $a[$o + ' + instanceProps.this_DOT_tweenStart.offset +'])/ $duration))'
			code += ',$ease[0],$ease[1],$ease[2],$ease[3]'
			code += ')\n'
		}
		else{ // we do have per instance tweening
			code += indent + 'var $tween = $a[$o + ' + instanceProps.this_DOT_tween.offset +']\n'
			code += indent + 'if($tween > 0 || $turtle._tween > 0){\n'
			code += indent + '	var $duration = $a[$o + ' + instanceProps.this_DOT_duration.offset +']\n'
			code += indent + '	var $tweenStart = $a[$o + ' + instanceProps.this_DOT_tweenStart.offset +']\n'
			code += indent + '	var $timeMax = $view._time + $turtle._duration\n'
			code += indent +'	if($timeMax > $view.todo.timeMax) $view.todo.timeMax = $timeMax\n'
			code += indent + '	if($view._time < $tweenStart + $duration){\n'
			code += indent + '		var $time = $proto.tweenTime($tween'
			code += ',Math.min(1,Math.max(0,($view._time - $tweenStart)/$duration))'
			code += ',$a[$o + ' + instanceProps.this_DOT_ease.offset +']'
			code += ',$a[$o + ' + (instanceProps.this_DOT_ease.offset+1) +']'
			code += ',$a[$o + ' + (instanceProps.this_DOT_ease.offset+2) +']'
			code += ',$a[$o + ' + (instanceProps.this_DOT_ease.offset+3) +']'
			code += ')\n'
		}
		code += indent + tweencode 
		code += indent + '	}\n'
		code += indent + '}\n'

		if(hasTweenDelta){
			code += 'if($tweenDelta>0){\n'
			code += deltafwd
			code += '}\n'
			code += 'else{\n'
			code += copyfwd
			code += '}\n'
		}
		else{
			code += copyprev
		}

		code += propcode

		if(!instanceProps.this_DOT_tween){
			code += indent + 'var $timeMax = $a[$o + ' + instanceProps.this_DOT_tweenStart.offset +'] + '
			code += (instanceProps.this_DOT_duration?'$a[$o + ' + instanceProps.this_DOT_duration.offset +']':'$proto.duration')+'\n'
			code += indent + 'if($timeMax > $view.todo.timeMax) $view.todo.timeMax = $timeMax\n'
		}

		return code
	}

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
				var old = this._props[key]
				if(old && !('value' in config)){
					for(var key in old) if(!(key in config)){
						config[key] = old[key]
					}
				}
				this._props[key] = config
				if(config.value !== undefined) this[key] = config.value
				if(!config.type) config.type = types.typeFromValue(config.value)
				if(!config.kind) config.kind = 'instance'
			}
		}
	})

	Object.defineProperty(proto, 'defines', {
		get:function(){
			throw new Error('defines is a configurator, please only assign objects: this.'+name+' = {...}')
		},
		set:function(defines){
			if(!this.hasOwnProperty('_defines')){
				this._defines = this._defines? Object.create(this._defines): {}
			}
			for(var key in defines){
				this._defines[key] = defines[key]
			}
		}
	})

	Object.defineProperty(proto, 'requires', {
		get:function(){
			throw new Error('defines is a configurator, please only assign objects: this.'+name+' = {...}')
		},
		set:function(requires){
			if(!this.hasOwnProperty('_requires')){
				this._requires = this._requires? Object.create(this._requires): {}
			}
			for(var key in requires){
				this._requires[key] = requires[key]
			}
		}
	})

	Object.defineProperty(proto, 'structs', {
		get:function(){
			throw new Error('structs is a configurator, please only assign objects: this.props = {...}')
		},
		set:function(structs){
			if(!this.hasOwnProperty('_structs')){
				this._structs = this._structs?Object.create(this._structs):{}
			}
			for(var key in structs){
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
		}
	})

	Object.defineProperty(proto, 'toolMacros', {
		get:function(){
			return this._toolMacros
		},
		set:function(macros){
			if(!this.hasOwnProperty('_toolMacros')) this._toolMacros = this._toolMacros?Object.create(this._toolMacros):{}
			for(var key in macros) this._toolMacros[key] = macros[key]
		}
	})

	proto.toolMacros = {
		length:function(){
			return this.$PROPLEN()
		},
		order:function(overload){
			this.$ALLOCDRAW()
		},
		reuse:function(overload){
			// make sure we are drawn
			this.orderNAME(overload)
			var $props = this.$shaders.NAME.$props
			if($props.oldLength !== undefined){
				$props.length = $props.oldLength
				$props.dirty = false
			}
			//if($props.oldTimeMax !== undefined){
			//	if($props.oldTimeMax > this.todo.timeMax){
			//		this.todo.timeMax = $props.oldTimeMax
			//	}
			//}
		}
	}

	proto.tweenSimple = function(tween, time, easex, easey, easez, easew){
		if(tween == 1.) return time
		return this.tweenEase(time, easex, easey)
	}

	proto.tweenAll = function(tween, time, easex, easey, easez, easew){
		if(tween == 1.) return time
		if(tween == 2.){
			return this.tweenEase(time, easex, easey)
		}
		if(tween == 3.){
			return this.tweenBounce(time, easex)
		}
		if(tween == 4.){
			return this.tweenOvershoot(time, easex, easey, easez, easew)
		}
		if(tween == 5.){
		//	return this.tweenBezier(time, easex, easey, easez, easew)
		}
		
		return 1.
	}

	//proto.tweenTime = proto.tweenSimple
	proto.tweenTime = proto.tweenAll

	proto.tweenEase = function(t, easein, easeout){
		var a = -1. / max(1.,(easein*easein))
		var b = 1. + 1. / max(1.,(easeout*easeout))
		var t2 = pow(((a - 1.) * -b) / (a * (1. - b)), t)
		return (-a * b + b * a * t2) / (a * t2 - b)
	}

	proto.tweenBounce = function(t, f){
		// add bounciness
		var it = t * (1. / (1. - f)) + 0.5
		var inlog = (f - 1.) * it + 1.
		if(inlog <= 0.) return 1.
		var k = floor(log(inlog) / log(f))
		var d = pow(f, k)
		return 1. - (d * (it - (d - 1.) / (f - 1.)) - pow((it - (d-1.) / (f - 1.)), 2.)) * 4.
	}

	proto.tweenOvershoot = function(t, dur, freq, decay, ease){
		var easein = ease
		var easeout = 1.
		if(ease < 0.) easeout = -ease, easein = 1.

		if(t < dur){
			return this.tweenEase(t / dur, easein, easeout)
		}
		else{
			// we have to snap the frequency so we end at 0
			var w = (floor(.5+ (1.-dur)*freq*2. ) / ((1.-dur)*2.)) * PI * 2.
			var velo = ( this.tweenEase(1.001, easein, easeout) - this.tweenEase(1., easein, easeout))/(0.001*dur)

			return 1. + velo * ((sin((t - dur) * w) / exp((t - dur) * decay)) / w)
		}
	}

	proto.tweenBezier = function(cp0, cp1, cp2, cp3, t){

		if(abs(cp0 - cp1) < 0.001 && abs(cp2 - cp3) < 0.001) return t

		var epsilon = 1.0/200.0 * t
		var cx = 3.0 * cp0
		var bx = 3.0 * (cp2 - cp0) - cx
		var ax = 1.0 - cx - bx
		var cy = 3.0 * cp1
		var by = 3.0 * (cp3 - cp1) - cy
		var ay = 1.0 - cy - by
		var u = t

		for(var i = 0; i < 6; i++){
			var x = ((ax * u + bx) * u + cx) * u - t
			if(abs(x) < epsilon) return ((ay * u + by) * u + cy) * u
			var d = (3.0 * ax * u + 2.0 * bx) * u + cx
			if(abs(d) < 1e-6) break
			u = u - x / d
		}

		if(t > 1.) return (ay + by) + cy
		if(t < 0.) return 0.0
		
		var l = 0, w = 0.0, v = 1.0
		u = t
		for(var i = 0; i < 8; i++){
			var x = ((ax * u + bx) * u + cx) * u
			if(abs(x - t) < epsilon) return ((ay * u + by) * u + cy) * u
			if(t > x) w = u
			else v = u
			u = (v - w) *.5 + w
		}

		return ((ay * u + by) * u + cy) * u
	}

	proto.defines = {
		'PI':'3.141592653589793',
		'E':'2.718281828459045',
		'LN2':'0.6931471805599453',
		'LN10':'2.302585092994046',
		'LOG2E':'1.4426950408889634',
		'LOG10E':'0.4342944819032518',
		'SQRT1_2':'0.70710678118654757',
		'TODEG':'0.017453292519943295'
	}


	// default shader properties
	proto.props = {
		time:{kind:'uniform', value: 1.0},

		// pick values
		pickAlpha: {kind:'uniform', value:0.5},
		workerId:{kind:'uniform', asGlobal:true, type:types.float},
		todoId: {kind:'uniform', value:0.},
		pickId: {noTween:true, noStyle:true, value:0.},

		// tweening
		tween: {noTween:true, value:0.},
		ease: {noTween:true, value:[0,0,1.0,1.0]},
		duration: {noTween:true, value:0.},
		delay: {styleLevel:1, value:0.},
		tweenStart: {noTween:true, noStyle:true, value:1.0},

		// clipping and scrolling
		noBounds: {styleLevel:1, value:0},
		lockScroll:{noTween:1, value:1.},
		turtleClip:{styleLevel:3, noInPlace:1, noCast:1, value:[-50000,-50000,50000,50000]},
		viewClip:{kind:'uniform', value:[-50000,-50000,50000,50000]},

		// for ease of use define them here
		pixelRatio:{kind:'uniform', asGlobal:true, type:types.float},
		viewScroll:{kind:'uniform', asGlobal:true, type:types.vec2},
		viewSpace:{kind:'uniform', asGlobal:true, type:types.vec4},

		fingerInfo:{kind:'uniform', asGlobal:true, type:types.mat4},
		vertexPostMatrix:{kind:'uniform', asGlobal:true, type:types.mat4},

		viewPosition:{kind:'uniform', asGlobal:true, type:types.mat4},
		viewInverse:{kind:'uniform', asGlobal:true, type:types.mat4},

		camPosition:{kind:'uniform', asGlobal:true, type:types.mat4},
		camProjection:{kind:'uniform', asGlobal:true, type:types.mat4}
	}

	painter.nameId('this_DOT_time')
	painter.nameId('this_DOT_pixelRatio')
	painter.nameId('this_DOT_workerId')
	painter.nameId('this_DOT_todoId')
	painter.nameId('this_DOT_viewScroll')
	painter.nameId('this_DOT_viewSpace')
	painter.nameId('this_DOT_fingerInfo')
	painter.nameId('this_DOT_vertexPostMatrix')

})
