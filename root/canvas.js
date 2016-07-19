var painter = require('painter')
//var fingers = require('fingers')
var types = require('types')

module.exports = function(proto){

	proto.Turtle = require('turtle')

	proto.composeTree = function(oldchildren){
		// it calls compose recursively
		if(this.oncompose){
			this.onflag = 1
			this.children = this.oncompose()
			this.onflag = 0
		}

		if(!Array.isArray(this.children)){
			if(!this.children) this.children = []
			else this.children = [this.children]
		}

		var children = this.children

		if(!this.initialized){
			this.initialized = true
			if(this._oninit) this._oninit()
			if(this.oninit) this.oninit()
		}

		for(var i = 0; i < children.length; i++){
			var child = children[i]
			child.parent = this
			child.root = this.root
			var oldchild = oldchildren && oldchildren[i]
			child.composeTree(oldchild && oldchild.children)
		}

		if(oldchildren) for(;i < oldchildren.length; i++){
			var oldchild = oldchildren[i]
			oldchild.destroyed = true
			if(oldchild.ondestroy) oldchild.ondestroy()
			if(oldchild._ondestroy) oldchild._ondestroy()

		}

		if(this.oncomposed) this.oncomposed()
	}

	proto.initCanvas = function(){
		this.todo = new painter.Todo()
		this.turtle = new this.Turtle(this)
		this.turtleStack = [
			this.turtle
		]
		this.writeList = []
		this.turtleStack.len = 0
		this.shaders = {}
		this.turtle._x = 0
		this.turtle._y = 0
		this.turtle._margin = this._margin
		this.turtle._padding = this._padding
	}

	proto.beginTurtle = function(){
		// add a turtle to the stack
		var len = ++this.turtleStack.len
		var outer = this.turtle
		var turtle = this.turtle = this.turtleStack[len]
		if(!turtle){
			turtle = this.turtle = this.turtleStack[len] = new this.Turtle(this)
		}
		turtle.begin(outer)
		return turtle
	}

	proto.endTurtle = function(){
		// call end on a turtle and pop it off the stack
		this.turtle.end()
		// pop the stack
		var last = this.turtle
		this.turtle = this.turtleStack[--this.turtleStack.len]
		
		return last
	}

	proto.moveWritten = function(start, dx, dy){
		var writes = this.writeList
		var current = this.turtleStack.len
		for(var i = start; i < writes.length; i += 4){
			var props = writes[i]
			var begin = writes[i+1]
			var end = writes[i+2]
			var level = writes[i+3]
			if(current > level) continue
			var slots = props.slots
			var xoff = props.xoffset
			var yoff = props.yoffset
			var array = props.self.array
			for(var j = begin; j < end; j++){
				array[j * slots + xoff] += dx
				array[j * slots + yoff] += dy
 			}
		}
	}

	// internal API used by canvas macros
	proto._allocShader = function(classname){
		var shaders = this.shaders
		var info = this['_' + classname].prototype.compileInfo
		var shader = shaders[classname] = new painter.Shader(info)
		var props = shader._props = new painter.Mesh(info.propSlots)
		props.xoffset = info.instanceProps.this_DOT_x.offset
		props.yoffset = info.instanceProps.this_DOT_y.offset
		return shader
	}

	proto._parseColor = function(str, alpha, a, o){
		if(!types.colorFromString(str, alpha, a, o)){
			console.log("Cannot parse color "+str)
		}
	}

	proto._parseColorPacked = function(str, alpha, a, o){
		if(!types.colorFromStringPacked(str, alpha, a, o)){
			console.log("Cannot parse color "+str)
		}
	}

}
