module.exports = require('class').extend(function Shader(){

	require('./canvasmacros').call(this)
	var painter = require('painter')
	var types = require('types')
	var parser = require('jsparser/jsparser')
	var ShaderGen = require('./shadergen')

	var compName = ['x','y','z','w']

	// allocate the nameids for attribute ranges
	for(var i = 0; i < 16; i++) painter.nameid('ATTR_'+i)

	this.time = 0.0

	this.blending = [painter.SRC_ALPHA, painter.FUNC_ADD, painter.ONE_MINUS_SRC_ALPHA]
	this.constant = undefined

	this.tween = function(){
		if(props.duration < 0.01) return 1.
		return clamp((time - props.tweenstart) / props.duration, 0.0, 1.0)
	}

	this.vertexEntry = function(){
		var T = tween()
		$CALCULATETWEEN
		return this.vertex()
	}

	this.pixelEntry = function(){
		this.pixel()
	}

	// ok the alpha blend modes. how do we do it.

	this.compileShader = function(){
		if(!this.vertex || !this.pixel) return

		var ast = parser.parse()
		
		var vtx = ShaderGen.generateGLSL(this, this.vertexEntry, null, false)
		var pix = ShaderGen.generateGLSL(this, this.pixelEntry, vtx.varyout, false)

		var inputs = {}, attrs = {}, props = {}, uniforms = {}
		for(var key in vtx.attributes) inputs[key] = attrs[key] = vtx.attributes[key]
		for(var key in pix.attributes) inputs[key] = attrs[key] = pix.attributes[key]
		for(var key in vtx.props) inputs[key] = props[key] = vtx.props[key]
		for(var key in pix.props) inputs[key] = props[key] = pix.props[key]
		for(var key in vtx.uniforms) uniforms[key] = vtx.uniforms[key]
		for(var key in pix.uniforms) uniforms[key] = pix.uniforms[key]

		// the shaders
		var vhead = '', vpre = '', vpost = ''
		var phead = '', ppre = '', ppost = ''

		// Unpack and tween props
		vhead += '// attributes\n'

		var tweenrep = ''

		// calc prop size
		var totalslots = 0
		for(var key in props){
			var prop = props[key]
			var slots = types.getSlots(prop.type)
			prop.offset = totalslots
			prop.slots = slots
			totalslots += slots
			if(!prop.config.notween) totalslots += slots
		}

		// Unpack attributes
		var lastslot = Math.floor(totalslots/4)
		var propslots = 0
		for(var key in props){
			var prop = props[key]
			var slots = prop.slots
			// lets create the unpack / mix code here
			propslots += slots
			if(prop.config.notween){
				var v1 = prop.type._name + '('
				if(v1 === 'float(') v1 = '('
				vpre += '\t' + key + ' = ' + v1
				for(var i = 0, start = propslots - slots; i < slots; i++){
					if(i) vpre += ', '
					var vslot = Math.floor((start + i)/4)
					vpre += 'ATTR_' +  vslot
					if(lastslot !== vslot || totalslots%4 !== 1) vpre += '.' + compName[(start + i)%4]
				}
				vpre += ');\n'
			}
			else{
				propslots += slots
				var vnew = prop.type._name + '('
				if(vnew === 'float(') vnew = '('
				var vold = vnew
				for(var i = 0, start1 = propslots - slots*2, start2 = propslots - slots; i < slots; i++){
					if(i) vnew += ', ', vold += ', '
					var vnewslot = Math.floor((start1 + i)/4)
					vnew += 'ATTR_' +  vnewslot
					if(lastslot !== vnewslot || totalslots%4 !== 1) vnew += '.' + compName[(start1 + i)%4]
					var voldslot =  Math.floor((start2 + i)/4)
					vold += 'ATTR_' + voldslot
					if(lastslot !== voldslot || totalslots%4 !== 1) vold += '.' + compName[(start2 + i)%4]
				}
				vnew += ')'
				vold += ')'
				tweenrep += '\t' + key + ' = mix(' + vnew + ',' + vold + ',T);\n'
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

		for(var key in attrs){
			var attr = attrs[key]
			var slots = types.getSlots(attr.type)

			if(slots > 4){
				var v1 = attr.type._name + '('
				if(v1 === 'float(') v1 = '('
				vpre += '\t' + key + ' = ' + v1
				for(var i = 0; i < slots; i++){
					if(i) vpre += ', '
					vpre += '\tATTR_' + (attrpid + Math.floor(i/4)) + '.' + compName[i%4]
				}
				vpre += ');\n'

				for(var i = slots, pid = 0; i > 0; i -= 4){
					if(i >= 4) vhead += 'attribute vec4 ATTR_'+(attrid)+';\n'
					if(i == 3) vhead += 'attribute vec3 ATTR_'+(attrid)+';\n'
					if(i == 2) vhead += 'attribute vec2 ATTR_'+(attrid)+';\n'
					if(i == 1) vhead += 'attribute float ATTR_'+(attrid)+';\n'
					attrid ++
				}
			}
			else{
				vpre += '\t' + key + ' = ATTR_' + attrid + ';\n'
				vhead += 'attribute '+attr.type._name+' ATTR_' + attrid + ';\n'
				attrid++
			}
		}

		// define the input variables
		vhead += '\n// inputs\n'
		for(var key in inputs){
			var input = inputs[key]
			vhead += input.type._name + ' ' + key + ';\n'
		}

		// define the varying targets
		for(var key in vtx.varyout){
			var vary = vtx.varyout[key]
			vhead += vary.type._name + ' ' + key + ';\n'
		}

		// lets pack/unpack varyings and props and attributes used in pixelshader
		var allvary = {}
		for(var key in pix.attributes) allvary[key] = pix.attributes[key]
		for(var key in pix.varyout) allvary[key] = pix.varyout[key]
		for(var key in pix.props) allvary[key] = pix.props[key]
		
		// make varying packing and unpacking
		var vid = 0, curslot = 0, varystr = ''
		var varyslots = 0
		for(var key in allvary){
			var prop = allvary[key]
			var type = prop.type
			var slots = types.getSlots(type)

			// define the variables in pixelshader
			if(curslot === 0) phead += '// inputs\n'
			phead += type._name + ' ' + key + ';\n'
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
			var v1 = prop.type._name + '('
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
			vhead += 'uniform ' + vtx.uniforms[key].type._name + ' ' + key + ';\n'
		}

		var hasuniforms = 0
		for(var key in pix.uniforms){
			if(!hasuniforms++)phead += '\n// uniforms\n'
			phead += 'uniform ' + pix.uniforms[key].type._name + ' ' + key + ';\n'
		}

		// define output variables in pixel shader
		phead += '\n// outputs\n'
		for(var key in pix.outputs){
			var output = pix.outputs[key]
			phead += output._name + ' ' + key + ';\n'
		}

		// alright lets put together the shaders
		var vfunc = ''
		for(var key in vtx.generatedfns){
			var fn = vtx.generatedfns[key]
			vfunc = '\n'+fn.generatedcode + '\n' + vfunc
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
		for(var key in pix.generatedfns){
			var fn = pix.generatedfns[key]
			pfunc = '\n'+fn.generatedcode + '\n' + pfunc
		}
		var pixel = phead
		pixel += pfunc
		pixel += '\nvoid main(){\n'
		pixel += ppre
		if(pix.generatedfns.pixel_T.return.type === types.vec4){
			pixel +=  '\tgl_FragColor = ' + pix.main
		}
		else{
			pixel += pix.main
			pixel += '\tgl_FragColor = out_DOT_color;\n' 
		}

		//!TODO: do MRT stuff
		pixel += ppost + '}\n'

		this.compileinfo = {
			attrs:attrs,
			uniforms:uniforms,
			props:props,
			vertex:vertex,
			pixel:pixel,
			propslots:propslots
		}
		console.log(vertex,pixel)
		//console.log(vertex)
	}

	this.onextendclass = function(){
		// call shader compiler
		this.compileShader()
	}

	this.$OVERLOADPROPS = function(classname, macroargs, mainargs, indent){
		// first generate property overload stack
		// then write them on the turtles' propbag
		var props = this.compileinfo.props
		if(!mainargs || !mainargs[0]) throw new Error('$OVERLOADPROPS doesnt have a main argument')

		var stack = [mainargs[0],'', 'this._state2','', 'this._state','', 'this._' + classname+'.prototype','']

		// lets make the vars
		var code = indent + 'var _turtle = this.turtle'
		for(var key in props){
			code += ', _$' + props[key].name
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

			for(var key in props){
				var name = props[key].name
				//var slots = types.getSlots(prop.type)
				if(props[key].config.nostyle) continue
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
		for(var key in props){
			var name = props[key].name
			if(props[key].config.nostyle) continue
			// store on turtle
			code += indent + '_turtle._' + name +' = _$' + name + '\n'
		}
		return code
	}

	this.$ALLOCDRAW = function(classname, macroargs, mainargs, indent){
		// lets generate the draw code.
		// what do we do with uniforms?.. object ref them from this?
		// lets start a propsbuffer 
		var info = this.compileinfo
		var code = ''
		
		var need = macroargs || 1

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
		var attrs = info.attrs
		var attrid = 0
		
		var attrbase = painter.nameid('ATTR_0')
		// do the props
		var proprange = Math.floor(info.propslots / 4) + 1
		code += indent+'	_todo.instances('+(attrbase+attrid)+','+proprange+',_props)\n'
		attrid += proprange
		// set attributes
		for(var key in attrs){
			// check if attribute is larger than 4
			var attr = attrs[key]
			var attrange = Math.floor(types.getSlots(attr.type) / 4) + 1
			code += indent+'	_attrlen = _proto.'+key+'.length\n'
			code += indent+'	_todo.attributes('+(attrbase+attrid)+','+attrange+',_proto.'+key+')\n'
			attrid += attrange
		}
		
		// lets set the blendmode
		code += '	_todo.blending(_proto.blending, _proto.constant)\n'

		// set uniforms
		var uniforms = info.uniforms
		for(var key in uniforms){
			var uniform = uniforms[key]
			// this.canvas....?
			var segs = key.split("_DOT_")
			var fullname = segs.join('.')
			var first = segs[0]
			// lets check special uniforms view, camera and time
			var source
			if(first === 'view'){
				source = 'this.' + fullname	
			}
			else if(first === 'camera'){
				source = 'this.view.root.' + fullname
			}
			else if(first === 'time'){
				source = 'this.view._time'
			}
			else source = 'overload && overload.'+key+' || _proto.'+fullname
	
			// lets look at the type and generate the right uniform setter
			var typename = uniform.type._name
			// ok so uniforms... where do we get them
			// we can get them from overload or the class prototype
			code += indent+'	_todo.'+typename+'('+painter.nameid(key)+','+source+')\n'
			//code += indent+'console.log("'+key+'",'+source+')\n'
		}
		// lets draw it
		code += indent + '	_todo.drawTriangles()\n'
		code += indent + '}\n'
		return code
	}

	this.$TWEENJS = function(indent, tweencode, props){
		var code = ''
		code += indent + 'var _duration = _a[_o + ' + props.props_DOT_duration.offset +']\n'
		code += indent + 'var _tweenstart = _a[_o + ' + props.props_DOT_tweenstart.offset +']\n'
		code += indent + 'if(this.view._time < _tweenstart + _duration){\n'
		code += indent + '	var _tween = Math.min(1,Math.max(0,(this.view._time - _tweenstart)/_duration))\n'
		code += indent + tweencode 
		code += indent + '}'
		return code
	}

	this.$DUMPPROPS = function(props, indent){
		var code = ''
		for(var key in props){
			var prop = props[key]
			var slots = prop.slots
			var o = prop.offset
			var notween = prop.config.notween
			// generate the code to tween.
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

	this.$WRITEPROPS = function(classname, macroargs, mainargs, indent){
		// load the turtle
		var info = this.compileinfo
		var props = info.props
		var code = ''
		code = indent + 'var _turtle = this.turtle\n'
		code += indent +'var _shader = this.shaders.'+classname+'\n'
		code += indent +'var _props = _shader._props\n'
		code += indent +'var _a = _props.self.array\n'
		code += indent +'var _o = _props.self.length * ' + info.propslots +'\n'
		code += indent + '_props.self.length++\n'

		var tweencode = '	var _f = _tween, _1mf = _tween\n'
		var propcode = ''

		// lets generate the tween
		for(var key in info.props){
			var prop = info.props[key]
			var slots = prop.slots
			var o = prop.offset
			var notween = prop.config.notween
			// generate the code to tween.
			if(!notween){
				// new, old
				tweencode += '\n'+indent+'	//' + key + '\n'
				propcode += '\n'+indent+'// '+key + '\n'
				for(var i = 0; i < slots; i++){
					tweencode += indent + '	_a[_o+'+(o +i)+'] = ' +
						'_f * _a[_o+'+(o + i + slots)+'] + ' +
						'_1mf * _a[_o+'+(o +i)+']\n'
					propcode += indent + '_a[_o+'+(o + i + slots)+'] = ' +
						'_a[_o+'+(o +i)+']\n'
				}
			}
			// assign properties
			// check if we are a vec4 and typeof string

			var propsource = '_turtle._' + prop.name
			if(prop.config.nostyle){ // its an arg here
				if(prop.name === 'tweenstart'){
					propsource = 'this.view._time'
				}
				else{

				}
			}

			if(prop.type._name === 'vec4'){
				propcode += indent + 'var _$' + prop.name + ' = '+ propsource +'\n'
				propcode += indent + 'if(typeof _$'+prop.name+' === "object"){\n'
				propcode += indent + '	if(_$'+prop.name+'.length === 4)_a[_o+'+(o)+']=_$'+prop.name+'[0],_a[_o+'+(o+1)+']=_$'+prop.name+'[1],_a[_o+'+(o+2)+']=_$'+prop.name+'[2],_a[_o+'+(o+3)+']=_$'+prop.name+'[3]\n'
				propcode += indent + '	else if(_$'+prop.name+'.length === 1)_a[_o+'+o+']=_a[_o+'+(o+1)+']=_a[_o+'+(o+2)+']=_a[_o+'+(o+3)+']=_$'+prop.name+'[0]\n'
				propcode += indent + '	else if(_$'+prop.name+'.length === 2)this._parseColor(_$'+prop.name+'[0], _$'+prop.name+'[1],_a,_o+'+o+')\n'
				propcode += indent + '}\n'
				propcode += indent + 'if(typeof _$'+prop.name+' === "string")this._parseColor(_$'+prop.name+',1.0,_a,_o+'+o+')\n'
				propcode += indent + 'else if(typeof _$'+prop.name+' === "number")_a[_o+'+o+'] = _a[_o+'+(o+1)+'] = _a[_o+'+(o+2)+']=_a[_o+'+(o+3)+']=_$'+prop.name+'\n'
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
		code += '\n'+this.$TWEENJS(indent, tweencode, props) +'\n'
		code += propcode
		//code += this.$DUMPPROPS(props, indent)+'debugger\n'
		// lets generate the write-out
		return code
	}
	
	function defineSetterObject(name){
		var _name = '_' + name
		Object.defineProperty(this, name, {
			get:function(){
				throw new Error('Please only assign to '+name+': this.'+name+' = {...}')
			},
			set:function(props){
				if(!this.hasOwnProperty(_name)){
					this[_name] = this[_name]? Object.create(this[_name]): {}
				}
				for(var key in props){
					this[_name][key] = props[key]
				}
			}
		})
	}

	Object.defineProperty(this, 'props', {
		get:function(){
			throw new Error('Please only assign to props: this.props = {...}')
		},
		set:function(props){
			if(!this.hasOwnProperty('_props')){
				this._props = this._props?Object.create(this._props):{}
			}
			for(var key in props){
				var value = props[key]
				if(Object.getPrototypeOf(value) !== Object.prototype){
					value = {value:value}
				}
				this._props[key] = value
				this[key] = value.value
			}
		}
	})
	defineSetterObject.call(this, 'defines')
	defineSetterObject.call(this, 'structs')

	this.defines = {
		'PI':'3.141592653589793',
		'E':'2.718281828459045',
		'LN2':'0.6931471805599453',
		'LN10':'2.302585092994046',
		'LOG2E':'1.4426950408889634',
		'LOG10E':'0.4342944819032518',
		'SQRT12':'0.70710678118654757',
	}

	this.props = {
		duration: {notween:true, value:1.0},
		tweenstart: {notween:true, nostyle:true, value:1.0}
	}
})
