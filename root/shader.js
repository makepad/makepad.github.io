module.exports = require('class').extend(function Shader(){

	require('./canvasmacros').call(this)
	var types = require('types')
	var parser = require('jsparser/jsparser')
	var ShaderGen = require('./shadergen')

	this.compileShader = function(){
		if(!this.vertex || !this.pixel) return

		var ast = parser.parse()
		
		var vertexgen = ShaderGen.generateGLSL(this, this.vertex, false)

		console.log(vertexgen)
	}

	this.onextendclass = function(){
		// call shader compiler
		this.compileShader()
	}

	this.compileCanvasMacros = function(target){
		
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
				this[key] = this._props[key] = value
			}
		}
	})

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

	defineSetterObject.call(this, 'mesh')
	defineSetterObject.call(this, 'locals')
	defineSetterObject.call(this, 'globals')
	defineSetterObject.call(this, 'view')
	defineSetterObject.call(this, 'stamp')
})
