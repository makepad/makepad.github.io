var painter = require('painter')
var types = require('types')

var worker = require('worker')(function(){
	var owner = require('worker')
	var painter = require('painter')

	owner.onMessage = function(msg){
		console.log("GOT MESSAGE FROM OWNER", msg)
	}

	owner.postMessage("ho!")
})

worker.postMessage("hi")
worker.onMessage = function(msg){
	console.log("got message from worker", msg)
}

var fingers = require("fingers")

var shader = new painter.Shader({
	pixel:
		"uniform vec2 prop;\n"+
		"void main(){\n"+
		"	gl_FragColor = vec4(0., prop.x, 0., 1.);\n"+
		"}\n",
	vertex:
		"attribute vec2 mesh;\n"+
		"void main(){\n"+
		"	gl_Position = vec4(mesh.x, mesh.y, 0, 1.);\n"+
		"}\n"
})

var mesh = new painter.Mesh(types.vec2)
mesh.push(-.5, -.5, 0., .5, .5, -.5)

var todo = new painter.Todo()
todo.clearTodo()
todo.clearColor(0.1, 0.5, 0., 1.)
todo.useShader(shader)
todo.attributes(painter.nameId('mesh'), 1, mesh)
todo.vec2Uniform(painter.nameId('prop'), [0.9, 0])
todo.drawArrays(painter.TRIANGLES)
// attach it to the main framebuffer
painter.mainFramebuffer.assignTodo(todo)