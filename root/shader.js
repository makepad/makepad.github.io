module.exports = require('class').extend(function Shader(proto){

	require('./canvasmacros')(proto)
	var painter = require('painter')
	var types = require('types')
	var parser = require('jsparser/jsparser')
	var ShaderInfer = require('./shaderinfer')

	var compName = ['x','y','z','w']

	// allocate the nameids for attribute ranges
	for(var i = 0; i < 16; i++) painter.nameId('ATTR_'+i)

	proto.time = 0.0

	proto.blending = [painter.SRC_ALPHA, painter.FUNC_ADD, painter.ONE_MINUS_SRC_ALPHA, painter.ONE, painter.FUNC_ADD, painter.ONE]
	proto.constantColor = undefined

	proto.tween = function(){
		if(this.duration < 0.01) return 1.
		return clamp((time - this.tweenstart) / this.duration, 0.0, 1.0)
	}

	proto.vertexEntry = function(){
		var T = this.tween()
		$CALCULATETWEEN
		return this.vertex()
	}

	proto.pixelEntry = function(){
		this.pixel()
	}

	// ok the alpha blend modes. how do we do it.
	proto.mapExceptions = true

	proto.compileShader = function(){
		if(!this.vertex || !this.pixel) return

		var ast = parser.parse()
		
		var vtx = ShaderInfer.generateGLSL(this, this.vertexEntry, null, proto.mapExceptions)
		var pix = ShaderInfer.generateGLSL(this, this.pixelEntry, vtx.varyOut, proto.mapExceptions)

		var inputs = {}, geometryProps = {}, instanceProps = {}, styleProps = {}, uniforms = {}
		for(var key in vtx.geometryProps) inputs[key] = geometryProps[key] = vtx.geometryProps[key]
		for(var key in pix.geometryProps) inputs[key] = geometryProps[key] = pix.geometryProps[key]
		for(var key in vtx.instanceProps) inputs[key] = styleProps[key] = instanceProps[key] = vtx.instanceProps[key]
		for(var key in pix.instanceProps) inputs[key] = styleProps[key] = instanceProps[key] = pix.instanceProps[key]
		for(var key in vtx.uniforms) uniforms[key] = vtx.uniforms[key]
		for(var key in pix.uniforms) uniforms[key] = pix.uniforms[key]

		// the shaders
		var vhead = '', vpre = '', vpost = ''
		var phead = '', ppre = '', ppost = ''

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
						var start1 = propSlots - slots*2
						var start2 = propSlots - slots
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
						var start1 = propSlots - slots*2
						var start2 = propSlots - slots
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
					for(var i = 0, start1 = propSlots - slots*2, start2 = propSlots - slots; i < slots; i++){
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

		var hasuniforms = 0
		for(var key in vtx.uniforms){
			if(!hasuniforms++)vhead += '\n// uniforms\n'
			vhead += 'uniform ' + vtx.uniforms[key].type.name + ' ' + key + ';\n'
		}

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
		for(var key in vtx.genFunctions){
			var fn = vtx.genFunctions[key]
			vfunc = '\n'+fn.code + '\n' + vfunc
		}

		if(vtx.genFunctions.this_DOT_vertex_T.return.type !== types.vec4){
			vtx.mapException({
				state:{
					curFunction:vtx.genFunctions.this_DOT_vertex_T
				},
				type:'generate',
				message:'vertex function not returning a vec4',
				node:vtx.genFunctions.this_DOT_vertex_T.ast
			})
		}

		var vertex = vhead 
		vertex += vfunc
		vertex += '\nvec4 _main(){\n'
		vertex += vtx.main.replace("\t$CALCULATETWEEN",tweenrep)
		vertex += '}\n'
		vertex += '\nvoid main(){\n'
		vertex += vpre
		vertex += '\tgl_Position = _main();\n'
		vertex += vpost
		vertex += '}\n'

		var pfunc = ''
		for(var key in pix.genFunctions){
			var fn = pix.genFunctions[key]
			pfunc = '\n'+fn.code + '\n' + pfunc
		}
		var pixel = phead
		pixel += pfunc
		pixel += '\nvoid main(){\n'
		pixel += ppre

		if(pix.genFunctions.this_DOT_pixel_T.return.type === types.vec4){
			pixel +=  '\tgl_FragColor = ' + pix.main
		}
		else{
			pixel += pix.main
			pixel += '\tgl_FragColor = this_DOT_outcolor;\n' 
		}

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

		this.compileInfo = {
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

	proto.onextendclass = function(){
		// call shader compiler
		this.compileShader()
	}

	proto.$STYLEPROPS = function(classname, macroargs, mainargs, indent){
		// first generate property overload stack
		// then write them on the turtles' propbag
		var styleProps = this.compileInfo.styleProps
		if(!macroargs) throw new Error('$STYLEPROPS doesnt have overload argument')

		var stack = [macroargs[0],'', 'this._state2','', 'this._state','', 'this._' + classname+'.prototype','']

		// lets make the vars
		var code = indent + 'var _turtle = this.turtle'
		for(var key in styleProps){
			var prop = styleProps[key]
			if(prop.config.noStyle) continue
			if(macroargs[1] && prop.config.styleLevel > macroargs[1]) continue
			code += ', _$' + prop.name
		}
		code += '\n\n'

		// generate the property overload stack
		for(var i = 0; i < stack.length; i+=2){
			var object = stack[i]
			var prefix = stack[i+1]
			var p = '_p'+i
			var subind = indent

			if(object.indexOf('.') !== -1){
				code += indent + 'var ' + p+' = '+ object + '\n'
			}
			else p = object
			
			if(p !== 'this'){
				subind += '\t'
				code += indent + 'if('+p+'){\n'
			}

			for(var key in styleProps){
				var name = styleProps[key].name
				//var slots = types.getSlots(prop.type)
				if(styleProps[key].config.noStyle) continue
				if(i === 0){
					code += subind+'_$'+name+ ' = '+p+'.' + prefix+ name +'\n'
				}
				else{
					code += subind+'if(_$'+name+' === undefined) _$'+name+ ' = '+p+'.' + prefix+ name +'\n'
				}
			}

			if(subind !== indent) code += indent + '}\n'

		}
		// store it on the turtle
		code += '\n'
		for(var key in styleProps){
			var prop = styleProps[key]
			var name = prop.name
			if(prop.config.noStyle) continue
			if(macroargs[1] && prop.config.styleLevel > macroargs[1]) continue
			// store on turtle
			code += indent + '_turtle._' + name +' = _$' + name + '\n'
		}
		return code
	}

	proto.$ALLOCDRAW = function(classname, macroargs, mainargs, indent){
		// lets generate the draw code.
		// what do we do with uniforms?.. object ref them from this?
		// lets start a propsbuffer 
		var info = this.compileInfo
		var code = ''
		
		var need = macroargs[0] || 1

		code += indent+'var _todo = this.todo\n'
		code += indent+'var _shader = this.shaders.'+classname+'\n'
		code += indent+'if(!_shader) _shader = this._allocShader("'+classname+'")\n'
		code += indent+'var _props = _shader._props\n'
		code += indent+'var _need = _props.self.length + '+need+'\n'
		code += indent+'if(_need >= _props.allocated) _props.alloc(_need)\n'
		code += indent+'if(_props._frame !== this._frame){\n'
		code += indent+'	var _proto = this._' + classname +'.prototype\n'
		code += indent+'	_props._frame = this._frame\n'
		code += indent+'	_props.self.length = 0\n'
		code += indent+'	_props.dirty = true\n'
		code += indent+'	\n'
		code += indent+'	_todo.useShader(_shader)\n'
		// first do the normal attributes
		var geometryProps = info.geometryProps
		
		var attrbase = painter.nameId('ATTR_0')
		// do the props
		var attroffset = Math.ceil(info.propSlots / 4)
		code += indent+'	_todo.instances('+(attrbase)+','+attroffset+',_props)\n'
		var attrid = attroffset
		// set attributes
		for(var key in geometryProps){
			var geom = geometryProps[key]
			var attrange = Math.ceil(geom.type.slots / 4)
			var nodot = key.slice(9)
			code += indent+'	_attrlen = _proto.'+nodot+'.length\n'
			code += indent+'	_todo.attributes('+(attrbase+attrid)+','+attrange+',_proto.'+nodot+')\n'
			attrid += attrange
		}
		
		// lets set the blendmode
		code += '	_todo.blending(_proto.blending, _proto.constantColor)\n'

		// set uniforms
		var uniforms = info.uniforms
		for(var key in uniforms){
			var uniform = uniforms[key]
			// this.canvas....?
			var thisname = key.slice(9)
			var source = mainargs[0]+' && '+mainargs[0]+'.'+thisname+' || this.view.'+ thisname +'|| _proto.'+thisname
			//console.log(key, source, mainargs)
			// lets look at the type and generate the right uniform setter
			var typename = uniform.type.name
			// ok so uniforms... where do we get them
			// we can get them from overload or the class prototype
			code += indent+'	_todo.'+typename+'('+painter.nameId(key)+','+source+')\n'
			//code += indent+'console.log("'+key+'",'+source+')\n'
		}

		// do the samplers
		var samplers = info.samplers
		for(var key in samplers){
			var sampler = samplers[key]

			var thisname = key.slice(9)
			var source = mainargs[0]+' && '+mainargs[0]+'.'+thisname+' || _proto.'+thisname

			code += indent +'	_todo.sampler('+painter.nameId(key)+','+source+',_proto.compileInfo.samplers.'+key+')\n'
		}
		// lets draw it
		code += indent + '	_todo.drawTriangles()\n'
		code += indent + '}\n'
		code += indent + 'var _writelevel = (typeof _x === "number" && !isNaN(_x) || typeof _x === "string" || typeof _y === "number" && !isNaN(_y) || typeof _y === "string")?this.turtleStack.len - 1:this.turtleStack.len\n'
		code += indent + 'this.writeList.push(_props, this.turtle.propoffset = _props.self.length, _need, _writelevel)\n'
		code += indent + 'this.turtle.propoffset = _props.self.length\n'
		code += indent + '_props.self.length = _need\n'

		return code
	}

	proto.$TWEENJS = function(indent, tweencode, instanceProps){
		var code = ''
		code += indent + 'var _duration = _a[_o + ' + instanceProps.this_DOT_duration.offset +']\n'
		code += indent + 'var _tweenstart = _a[_o + ' + instanceProps.this_DOT_tweenstart.offset +']\n'
		code += indent + 'if(this.view._time < _tweenstart + _duration){\n'
		code += indent + '	var _tween = Math.min(1,Math.max(0,(this.view._time - _tweenstart)/_duration))\n'
		code += indent + tweencode 
		code += indent + '}'
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
					code += indent + 'console.log("'+(prop.name+(slots>1?i:''))+' "+_a[_o+'+(o+i+slots)+']+"->"+_a[_o+'+(o+i)+'])\n'
				}
			}
			else{
				for(var i = 0; i < slots; i++){
					code += indent + 'console.log("'+(prop.name+(slots>1?i:''))+' "+_a[_o+'+(o+i)+'])\n'
				}
			}
		}
		return code
	}

	proto.$WRITEPROPS = function(classname, macroargs, mainargs, indent){
		// load the turtle
		var info = this.compileInfo
		var instanceProps = info.instanceProps
		var code = ''
		code = indent + 'var _turtle = this.turtle\n'
		code += indent +'var _shader = this.shaders.'+classname+'\n'
		code += indent +'var _props = _shader._props\n'
		code += indent +'var _a = _props.self.array\n'
		code += indent +'var _o = _turtle.propoffset++ * ' + info.propSlots +'\n'
		//code += indent + '_props.self.length++\n'

		var tweencode = '	var _f = _tween, _1mf = _tween, _upn, _upo\n'
		var propcode = ''

		// lets generate the tween
		for(var key in instanceProps){
			var prop = instanceProps[key]
			var slots = prop.slots
			var o = prop.offset
			var notween = prop.config.noTween
			// generate the code to tween.
			if(!notween){
				// new, old
				tweencode += '\n'+indent+'	//' + key + '\n'
				propcode += '\n'+indent+'// '+key + '\n'

				var pack = prop.config.pack
				if(pack){
					// we have to unpack before interpolating
					for(var i = 0; i < slots; i++){
						tweencode += indent + '_upn = _a[_o+'+(o + i)+'], _upo = _a[_o+'+(o + i + slots)+']\n'
						tweencode += indent + '_a[_o+'+(o +i)+'] = ' +
							'((_f * Math.floor(_upo/4096) +' +
							'_1mf * Math.floor(_upn/4096)) << 12) + ' + 
							'((_f * (_upo%4096) +' +
							'_1mf * (_upn%4096))|0)\n'

						propcode += indent + '_a[_o+'+(o + i + slots)+'] = ' +
							'_a[_o+'+(o +i)+']\n'
					}
				}
				else{
					for(var i = 0; i < slots; i++){
						tweencode += indent + '	_a[_o+'+(o +i)+'] = ' +
							'_f * _a[_o+'+(o + i + slots)+'] + ' +
							'_1mf * _a[_o+'+(o +i)+']\n'
						propcode += indent + '_a[_o+'+(o + i + slots)+'] = ' +
							'_a[_o+'+(o +i)+']\n'
					}
				}
			}
			// assign properties
			// check if we are a vec4 and typeof string

			var propsource = '_turtle._' + prop.name
			
			if(prop.config.noStyle){ // its an arg here
				// tweenstart?
				if(prop.name === 'tweenstart'){
					propsource = 'this.view._time'
				}
				else propsource = macroargs[prop.name]
			}

			if(prop.type.name === 'vec4'){
				// check packing
				var pack = prop.config.pack
				if(pack){
					propcode += indent + 'var _$' + prop.name + ' = '+ propsource +'\n'
					propcode += indent + 'if(typeof _$'+prop.name+' === "object"){\n'
					if(pack === 'float12'){
						propcode += indent + '	if(_$'+prop.name+'.length === 4)_a[_o+'+(o)+']=((_$'+prop.name+'[0]*4095)<<12) + ((_$'+prop.name+'[1]*4095)|0),_a[_o+'+(o+1)+']=((_$'+prop.name+'[2] * 4095)<<12) + ((_$'+prop.name+'[3]*4095)|0)\n'
						propcode += indent + '	else if(_$'+prop.name+'.length === 2)this._parseColorPacked(_$'+prop.name+'[0], _$'+prop.name+'[1],_a,_o+'+o+')\n'
						propcode += indent + '	else if(_$'+prop.name+'.length === 1)_a[_o+'+o+']=_a[_o+'+(o+1)+']=((_$'+prop.name+'[0]*4095)<<12) + ((_$'+prop.name+'[0]*4095)|0)\n'
						propcode += indent + '}\n'
						propcode += indent + 'if(typeof _$'+prop.name+' === "string")this._parseColorPacked(_$'+prop.name+',1.0,_a,_o+'+o+')\n'
						propcode += indent + 'else if(typeof _$'+prop.name+' === "number")_a[_o+'+o+']=_a[_o+'+(o+1)+']=((_$'+prop.name+'*4095)<<12) + ((_$'+prop.name+'*4095)|0)\n'
					}
					else{ // int packing
						propcode += indent + '	if(_$'+prop.name+'.length === 4)_a[_o+'+(o)+']=(_$'+prop.name+'[0]<<12) + (_$'+prop.name+'[1]|0),_a[_o+'+(o+1)+']=(_$'+prop.name+'[2]<<12) + (_$'+prop.name+'[3]|0)\n'
						propcode += indent + '	else if(_$'+prop.name+'.length === 1)_a[_o+'+o+']=_a[_o+'+(o+1)+']=((_$'+prop.name+'[0])<<12) + ((_$'+prop.name+'[0])|0)\n'
						propcode += indent + '}\n'
						propcode += indent + 'else if(typeof _$'+prop.name+' === "number")_a[_o+'+o+']=_a[_o+'+(o+1)+']=((_$'+prop.name+')<<12) + ((_$'+prop.name+')|0)\n'
					}
				}
				else{
					propcode += indent + 'var _$' + prop.name + ' = '+ propsource +'\n'
					propcode += indent + 'if(typeof _$'+prop.name+' === "object"){\n'
					propcode += indent + '	if(_$'+prop.name+'.length === 4)_a[_o+'+(o)+']=_$'+prop.name+'[0],_a[_o+'+(o+1)+']=_$'+prop.name+'[1],_a[_o+'+(o+2)+']=_$'+prop.name+'[2],_a[_o+'+(o+3)+']=_$'+prop.name+'[3]\n'
					propcode += indent + '	else if(_$'+prop.name+'.length === 1)_a[_o+'+o+']=_a[_o+'+(o+1)+']=_a[_o+'+(o+2)+']=_a[_o+'+(o+3)+']=_$'+prop.name+'[0]\n'
					propcode += indent + '	else if(_$'+prop.name+'.length === 2)this._parseColor(_$'+prop.name+'[0], _$'+prop.name+'[1],_a,_o+'+o+')\n'
					propcode += indent + '}\n'
					propcode += indent + 'else if(typeof _$'+prop.name+' === "string")this._parseColor(_$'+prop.name+',1.0,_a,_o+'+o+')\n'
					propcode += indent + 'else if(typeof _$'+prop.name+' === "number")_a[_o+'+o+'] = _a[_o+'+(o+1)+'] = _a[_o+'+(o+2)+']=_a[_o+'+(o+3)+']=_$'+prop.name+'\n'
				}
			}
			else if(prop.type.name === 'vec2'){
				// check packing
				var pack = prop.config.pack
				if(pack){
					propcode += indent + 'var _$' + prop.name + ' = '+ propsource +'\n'
					propcode += indent + 'if(typeof _$'+prop.name+' === "object"){\n'
					if(pack === 'float12'){
						propcode += indent + '	_a[_o+'+(o)+']=((_$'+prop.name+'[0]*4095)<<12) + ((_$'+prop.name+'[1]*4095)|0)\n'
						propcode += indent + '}\n'
						propcode += indent + 'else _a[_o+'+o+']=((_$'+prop.name+'*4095)<<12) + ((_$'+prop.name+'*4095)|0)\n'
					}
					else{ // int packing
						propcode += indent + '	_a[_o+'+(o)+']=(_$'+prop.name+'[0]<<12) + (_$'+prop.name+'[1]|0)\n'
						propcode += indent + '}\n'
						propcode += indent + 'else if(typeof _$'+prop.name+' === "number")_a[_o+'+o+']=((_$'+prop.name+')<<12) + ((_$'+prop.name+')|0)\n'
					}
				}
				else{
					propcode += indent + 'var _$' + prop.name + ' = '+ propsource +'\n'
					propcode += indent + 'if(typeof _$'+prop.name+' === "object"){\n'
					propcode += indent + '	_a[_o+'+(o)+']=_$'+prop.name+'[0],_a[_o+'+(o+1)+']=_$'+prop.name+'[1]\n'
					propcode += indent + '}\n'
					propcode += indent + 'else _a[_o+'+(o)+']=_a[_o+'+(o+1)+']=_$'+prop.name+'\n'
				}
			}
			else{
				if(slots === 1){
					propcode += indent + '_a[_o+'+o+'] = '+propsource+'\n'
				}
				else{
					propcode += indent + 'var _$' + prop.name + ' = '+propsource+'\n'
					propcode += indent + 'if(_$'+prop.name+' === undefined) console.error("Property '+prop.name+' is undefined")\n'
					propcode += indent + 'else '
					for(var i = 0; i < slots; i++){
						if(i) propcode += ','
						propcode += '_a[_o+'+(o+i)+']=_$'+prop.name+'['+i+']\n'
					}
					propcode += '\n'
				}
			}
		}
		code += '\n'+this.$TWEENJS(indent, tweencode, instanceProps) +'\n'
		code += propcode
		//code += this.$DUMPPROPS(instanceProps, indent)+'\n'
		// lets generate the write-out
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

	proto.defines = {
		'PI':'3.141592653589793',
		'E':'2.718281828459045',
		'LN2':'0.6931471805599453',
		'LN10':'2.302585092994046',
		'LOG2E':'1.4426950408889634',
		'LOG10E':'0.4342944819032518',
		'SQRT12':'0.70710678118654757',
	}

	proto.props = {
		duration: {noTween:true, value:1.0},
		tweenstart: {noTween:true, noStyle:true, value:1.0}
	}
})
