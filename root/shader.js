module.exports = require('class').extend(function Shader(){

	require('./canvasmacros').call(this)
	var painter = require('painter')
	var types = require('types')
	var parser = require('jsparser/jsparser')
	var ShaderGen = require('./shadergen')

	var compName = ['x','y','z','w']

	this.tween = function(){
		return 1.
	}

	this.vertexEntry = function(){
		var T = tween()
		REPLACETWEENREPLACE
		return this.vertex()
	}

	this.pixelEntry = function(){
		this.pixel()
	}

	this.compileShader = function(){
		if(!this.vertex || !this.pixel) return

		var ast = parser.parse()
		
		var vtx = ShaderGen.generateGLSL(this, this.vertexEntry, null, false)
		var pix = ShaderGen.generateGLSL(this, this.pixelEntry, vtx.varyout, false)

		var inputs = {}, attrs = {}, props = {}
		for(var key in vtx.attributes) inputs[key] = attrs[key] = vtx.attributes[key]
		for(var key in pix.attributes) inputs[key] = attrs[key] = pix.attributes[key]
		for(var key in vtx.props) inputs[key] = props[key] = vtx.props[key]
		for(var key in pix.props) inputs[key] = props[key] = pix.props[key]

		// the shaders
		var vhead = '', vpre = '', vpost = ''
		var phead = '', ppre = '', ppost = ''

		// Unpack and tween props
		vhead += '// attributes\n'

		var tweenrep = ''

		var propslots = 0
		var this_props = this._props
		for(var key in props){
			var prop = props[key]
			var slots = types.getSlots(prop.type)
			propslots += slots
			// lets create the unpack / mix code here
			if(!this_props[prop.name].notween){
				propslots += slots
				var v1 = prop.type._name + '('
				if(v1 === 'float(') v1 = '('
				var v2 = v1
				for(var i = 0, start1 = propslots - slots*2, start2 = propslots - slots; i < slots; i++){
					if(i) v1 += ', ', v2 += ', '
					v1 += 'PROPS_' +  Math.floor((start1 + i)/4) + '.' + compName[(start1 + i)%4]
					v2 += 'PROPS_' +  Math.floor((start2 + i)/4) + '.' + compName[(start2 + i)%4]
				}
				v1 += ')'
				v2 += ')'
				tweenrep += '\t' + key + ' = mix(' + v1 + ',' + v2 + ',T);\n'
			}
			else{
				var v1 = prop.type._name + '('
				if(v1 === 'float(') v1 = '('
				tweenrep += '\t' + key + ' = ' + v1
				for(var i = 0, start = propslots - slots; i < slots; i++){
					if(i) vpre += ', '
					tweenrep += 'PROPS_' +  Math.floor((start + i)/4) + '.' + compName[(start + i)%4]
				}
				tweenrep += ');\n'
			}
		}
		for(var i = propslots, pid = 0; i > 0; i-=4){
			if(i >= 4) vhead += 'attribute vec4 PROPS_'+(pid++)+';\n'
			if(i == 3) vhead += 'attribute vec3 PROPS_'+(pid++)+';\n'
			if(i == 2) vhead += 'attribute vec2 PROPS_'+(pid++)+';\n'
			if(i == 1) vhead += 'attribute float PROPS_'+(pid++)+';\n'
		}

		// Unpack attributes
		for(var key in attrs){
			var attr = attrs[key]
			var slots = types.getSlots(attr.type)

			if(slots > 4){
				var v1 = attr.type._name + '('
				if(v1 === 'float(') v1 = '('
				vpre += '\t' + key + ' = ' + v1
				for(var i = 0; i < slots; i++){
					if(i) vpre += ', '
					vpre += '\tattr_'+key+Math.floor(i/4) + '.' + compName[i%4]
				}
				vpre += ');\n'

				for(var i = slots, pid = 0; i > 0; i-=4){
					if(i >= 4) vhead += 'attribute vec4 ATTR_'+key+(pid++)+';\n'
					if(i == 3) vhead += 'attribute vec3 ATTR_'+key+(pid++)+';\n'
					if(i == 2) vhead += 'attribute vec2 ATTR_'+key+(pid++)+';\n'
					if(i == 1) vhead += 'attribute float ATTR_'+key+(pid++)+';\n'
				}
			}
			else{
				vhead += 'attribute '+attr.type._name+' ATTR_' + key +';\n'
				vpre += '\t' + key + ' = ATTR_' + key + ';\n'
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
				vpost += key + '[' + i + ']'
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
		for(var i =(4-curslot%4)%4 - 1; i >= 0; i--){
			vpost += ',0.'
		}
		if(curslot) vpost += ');\n'

		// define output variables in pixel shader
		for(var key in pix.outputs){
			var output = pix.outputs[key]
			phead += output._name + ' ' + key + ';\n'
		}

		// alright lets put together the shaders
		var vertex = vhead 
		for(var key in vtx.generatedfns){
			var fn = vtx.generatedfns[key]
			vertex += '\n'+fn.generatedcode + '\n'
		}
		vertex += '\nvec4 _main(){\n'
		vertex += vtx.main.replace("\tREPLACETWEENREPLACE",tweenrep) 
		vertex += '}\n'
		vertex += '\nvoid main(){\n'
		vertex += vpre 
		vertex += '\tgl_Position = _main();\n'
		vertex += vpost
		vertex += '}\n'

		var pixel = phead
		for(var key in pix.generatedfns){
			var fn = pix.generatedfns[key]
			pixel += '\n'+fn.generatedcode + '\n'
		}
		pixel += '\nvoid main(){\n'
		pixel += ppre
		pixel += pix.main

		//!TODO: do MRT stuff
		pixel += '\tgl_FragColor = out_DOT_color;\n' 
		pixel += ppost + '}\n'

		this.compileinfo ={
			attrs:attrs,
			props:props,
			vertex:vertex,
			pixel:pixel
		}
		console.log('Shaders:', vertex,pixel)
	}

	this.onextendclass = function(){
		// call shader compiler
		this.compileShader()
	}

	this.compileCanvasMacros = function(target){
		// compile canvas draw macros!
	}

	function defineSetterObject(name){
		var _name = '_' + name
		Object.defineProperty(this, name, {
			get:function(){
				throw new Error('Please only assign to '+name+': this.'+name+' = {...}')
			},
			set:function(props){
				if(!this.hasOwnProperty(_name)){
					this[_name] = this[_name]?Object.create(this[_name]):{}
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
})
