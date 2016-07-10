module.exports = require('class').extend(function Shader(){

	require('./canvasmacros').call(this)
	require('./props').call(this)



	var parser = require('jsparser/jsparser')
	var ShaderGen = require('./shadergen')

	this.compileShader = function(){
		if(!this.vertex || !this.pixel) return

		var ast = parser.parse(this.vertex.toString())
		var vertexgen = new ShaderGen(this)

		var res = vertexgen.block(ast.body[0].body.body)

		console.log(res)
	}

	this.onextendclass = function(){
		// call shader compiler
		this.compileShader()
	}

	this.compileCanvasMacros = function(target){
		
	}
})
