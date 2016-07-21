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

	proto.viewId = 0

	proto.$forwardCanvas = function(stamp){

	}

	proto._onConstruct = function(args){
		// lets process the args and construct things
		// lets create a todo
		this.todo = new painter.Todo()
		this.turtle = new this.Turtle(this)

		// stuff needed for the drawing
		this.$turtleStack = [
			this.turtle
		]
		// the buffer writelist for nested turtle layout
		this.$writeList = []

		// the turtlestack. Its turtles all the way down
		this.$turtleStack.len = 0

		// shader tree and stamp array
		this.$shaders = {}
		this.$stampId = 0
		this.$stamps = [0]

		this.turtle._x = 0
		this.turtle._y = 0
		this.turtle._margin = this._margin
		this.turtle._padding = this._padding

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

	proto.$generateViewIds = function(){
		var viewId = 1
		var map = this.$views
		map.length = 1

		var iter = this
		while(iter){
			map[viewId] = iter
			iter.pickIdHi = viewId++
			// depth first recursion free walk
			var next = iter.children[0]
			if(next) next.$childIndex = 0
			else while(!next){ // skip to parent next
				var index = iter.$childIndex + 1 // make next index
				iter = iter.parent // hop to parent
				if(!iter) break // cant walk up anymore
				next = parent.children[index] // grab next node
				if(next) next.$childIndex = index // store the index
				//else we hopped up to parent
			}
			iter = next
		}
	}

	proto.recompose = function(){
	}

	proto.redraw = function(){
		if(!this.root.redrawTimer){
			this.root.redrawTimer = setTimeout(function(){
				this.root.redrawTimer = undefined
				this.$redrawApp()
			}.bind(this.root),0)
		}
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
		this.$writeList.length = 0
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

		this.$stampId = 1

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
		var views = this.$views = []
		this.viewPosition = mat4.create()
		this.camPosition = mat4.create()
		this.camProjection = mat4.create()
		
		this._frameId = 0

		function fingerMessage(event, viewId, stampId, msg){
			var view = views[viewId]
			if(!view) return
			if(view[event]) view[event](msg)
			var stamp = view.$stamps[stampId]
			if(stamp && stamp[event]) stamp[event](msg)
		}

		// dispatch mouse events
		fingers.onFingerDown = function(msg){
			fingerMessage('onFingerDown', msg.pick.hi, msg.pick.lo, msg)
		}

		fingers.onFingerMove = function(msg){
			fingerMessage('onFingerMove', msg.pick.hi, msg.pick.lo, msg)
		}

		fingers.onFingerUp = function(msg){
			fingerMessage('onFingerUp', msg.pick.hi, msg.pick.lo, msg)
		}

		var lastViewId = 0
		var lastStampId = 0
		fingers.onFingerHover = function(msg){
			// we want mouse in/out messages to go to the right view and stamp.
			var viewId = msg.pick.hi
			var stampId = msg.pick.lo
			if(viewId!==lastViewId || stampId !== lastStampId){
				fingerMessage('onFingerOut', lastViewId, lastStampId, msg)
				fingerMessage('onFingerOver', msg.pick.hi, msg.pick.lo, msg)
			}
			lastViewId = viewId
			lastStampId = stampId
			fingerMessage('onFingerHover', msg.pick.hi, msg.pick.lo, msg)
		}

		fingers.onFingerWheel = function(msg){
			fingerMessage('onFingerWheel', msg.pick.hi, msg.pick.lo, msg)
		}

		fingers.onFingerTap = function(msg){
			fingerMessage('onFingerTap', msg.pick.hi, msg.pick.lo, msg)
		}

		painter.onResize = function(){
			this.$redrawApp()
		}.bind(this)

		// lets do our first redraw
		this.root = this

		// compose the tree
		this.$composeTree()

		// regenerate view ids
		this.$generateViewIds()

		// lets attach our todo to the main framebuffer
		painter.mainFramebuffer.assignTodo(this.todo)

		// first draw
		this.$redrawApp(0,0)
	}
})