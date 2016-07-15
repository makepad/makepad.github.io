//var painter = require('painter')
//var fingers = require('fingers')
var painter = require('painter')
var fingers = require('fingers')
var mat4 = require('math/mat4')

module.exports = require('class').extend(function View(){
	// load mixins
	require('props').call(this)
	require('events').call(this)
	require('canvas').call(this)

	// lets define some props
	this.props = {
		x:NaN,
		y:NaN,
		z:NaN,
		w:NaN,
		h:NaN,
		d:NaN,
		time:0,
		frame:0,
		surface:false,
		margin:[0,0,0,0],
		padding:[0,0,0,0],
		align:'lefttop',
		walk:'lrtbwrap'		
	}

	//this.onfingerdown
	//this.onfingerup
	//this.onfingermove
	//this.onfingerhover
	//this.onfingerwheel

	this._onconstruct = function(args){
		// lets process the args and construct things
		// lets create a todo
		this.todo = new painter.Todo()
		this.turtlestack = [
			new this.Turtle()
		]
		this.turtle = this.turtlestack[0]
		this.view = this
		this.position = mat4.create()
		this.shaders = {}
	}

	this._ondestroy = function(){
		// destroy the todo
		this.todo.destroyTodo()
		this.todo = undefined
	}

	this.composeTree = function(oldchildren){
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
			child.camera = this.root.camera
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

	this.recompose = function(){
	}

	this.redraw = function(){
	}

	this.relayout = function(){
	}

	this.redrawChildren = function(){
		var todo = this.todo
		var children = this.children
		for(var i = 0; i < children.length; i++){
			child = children[i]
			todo.addTodo(child.todo)
			child.redrawCanvas()
		}
	}

	this.redrawView = function(){
		this._time = this.root._time
		this._frame = this.root._frame

		// begin a new todo stack
		var todo = this.todo
		todo.beginTodo()
		todo.clearColor(0.8,1,1,1)

		// begin a new turtle
		var turtle = this.beginTurtle()

		this.onflag = 2
		this.ondraw()
		this.onflag = 0

		// keep redrawing:
		// if(this._ontime&2 || this._onframe&2)
		this.endTurtle()
		todo.endTodo()
	}

	this.ondraw = function(){
		this.redrawBackground()
		this.redrawChildren()
	}
	
	this.onflag1 = this.recompose
	this.onflag2 = this.redraw

	this.runApp = function(){
		this.camera = {
			position:mat4.create(),
			projection:mat4.create()
		}
		
		// dispatch mouse events
		fingers.ondown = function(msg){
			
		}

		painter.onsyncdraw = function(msg){
			// we can submit a todo now
			this._time = msg.time / 1000
			this._frame = msg.frame

			mat4.ortho(this.camera.projection,0, painter.w, 0, painter.h, -100, 100)

			this.redrawView()

			// send todotree to main thread
			this.todo.runTodo()

		}.bind(this)

		this.root = this

		// compose the tree
		this.composeTree()

		// then lets draw it
		painter.syncDraw()
	}

	this.onnestedassign = function(key, cls){
		if(cls.prototype.compileCanvasMacros){
			cls.prototype.compileCanvasMacros(key, this)
		}
	}
})