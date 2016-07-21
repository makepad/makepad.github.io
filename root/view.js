//var painter = require('painter')
//var fingers = require('fingers')
var painter = require('painter')
var fingers = require('fingers')
var mat4 = require('math/mat4')

module.exports = require('class').extend(function View(proto){
	// load mixins
	require('props')(proto)
	require('events')(proto)
	require('canvas')(proto)
	
	proto.Turtle = require('turtle')

	// lets define some props
	proto.props = {
		x:NaN,
		y:NaN,
		z:NaN,
		w:NaN,
		h:NaN,
		d:NaN,
		time:0,
		frameId:0,
		surface:false,
		margin:[0,0,0,0],
		padding:[0,0,0,0],
		align:[0,0],
		wrap:true		
	}

	proto._onConstruct = function(args){
		// lets process the args and construct things
		// lets create a todo
		this.$initCanvas()
		this.view = this
		this.position = mat4.create()
	}

	proto._onDestroy = function(){
		// destroy the todo
		this.todo.destroyTodo()
		this.todo = undefined
	}

	proto.$composeTree = function(oldChildren){
		// it calls compose recursively
		if(this.onCompose){
			this.onflag = 1
			this.children = this.onCompose()
			this.onflag = 0
		}

		if(!Array.isArray(this.children)){
			if(!this.children) this.children = []
			else this.children = [this.children]
		}

		var children = this.children

		if(!this.initialized){
			this.initialized = true
			if(this._onInit) this._onInit()
			if(this.onInit) this.onInit()
		}

		for(var i = 0; i < children.length; i++){
			var child = children[i]
			child.parent = this
			child.root = this.root
			var oldchild = oldChildren && oldChildren[i]
			child.composeTree(oldchild && oldchild.children)
		}

		if(oldChildren) for(;i < oldChildren.length; i++){
			var oldchild = oldChildren[i]
			oldchild.destroyed = true
			if(oldchild.onDestroy) oldchild.onDestroy()
			if(oldchild._onDestroy) oldchild._onDestroy()
		}

		if(this.onComposed) this.onComposed()
	}

	proto.recompose = function(){
	}

	proto.redraw = function(){
	}

	proto.relayout = function(){
	}

	proto.$redrawChildren = function(){
		var todo = this.todo
		var children = this.children
		for(var i = 0; i < children.length; i++){
			child = children[i]
			todo.addTodo(child.todo)
			child.redrawCanvas()
		}
	}

	var zeroMargin = [0,0,0,0]
	proto.$redrawView = function(){
		this._time = this.root._time
		this._frameId = this.root._frameId

		// begin a new todo stack
		var todo = this.todo

		todo.clearTodo()
		todo.clearColor(0.2, 0.2, 0.2, 1)

		// begin a new turtle with the views' layout settings
		var turtle = this.turtle
		turtle._margin = zeroMargin
		turtle._padding = this._padding
		turtle._align = this._align
		turtle._wrap = this._wrap
		turtle._w = painter.w
		turtle._h = painter.h

		this.$pickid = 1

		this.beginTurtle()

		this.onFlag = 2
		this.onDraw()
		this.onFlag = 0

		this.endTurtle()
	}

	proto.onDraw = function(){
		this.$redrawBackground()
		this.$redrawChildren()
	}
	
	proto.onFlag1 = this.recompose
	proto.onFlag2 = this.redraw

	proto.$redrawApp = function(){
		// we can submit a todo now
		this._time = (typeof performance !== 'undefined'?performance.now():Date.now()) / 1000
		this._frameId++

		mat4.ortho(this.camProjection,0, painter.w, 0, painter.h, -100, 100)
		this.$redrawView()
	}

	proto.runApp = function(){

		this.viewPosition = mat4.create()
		this.camPosition = mat4.create()
		this.camProjection = mat4.create()
		
		this._frameId = 0

		// dispatch mouse events
		fingers.onFingerDown = function(msg){

		}

		// dispatch mouse events
		fingers.onFingerHover = function(msg){
			//console.log(msg.pick)
			this.$redrawApp()
		}.bind(this)

		painter.onResize = function(){
			this.$redrawApp()
		}.bind(this)

		// lets do our first redraw
		this.root = this

		// compose the tree
		this.$composeTree()

		// lets attach our todo to the main framebuffer
		painter.mainFramebuffer.assignTodo(this.todo)

		// first draw
		this.$redrawApp(0,0)
	}
})