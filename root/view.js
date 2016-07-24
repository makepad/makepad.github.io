//var painter = require('painter')
//var fingers = require('fingers')
var painter = require('painter')
var fingers = require('fingers')
var mat4 = require('math/mat4')

module.exports = require('class').extend(function View(proto){

	require('props')(proto)
	require('events')(proto)
	require('canvas')(proto)
	
	proto.Turtle = require('turtle')
	
	var View = proto.constructor

	// lets define some props
	proto.props = {
		x:NaN,
		y:NaN,
		z:NaN,
		w:NaN,
		h:NaN,
		d:NaN,
		cenX:0.5,
		cenY:0.5,
		scaleX:1,
		scaleY:1,
		rotate:0,
		time:0,
		frameId:0,
		surface:false,
		margin:[0,0,0,0],
		padding:[0,0,0,0],
		align:[0,0],
		wrap:true		
	}

	proto.viewId = 0

	proto._onConstruct = function(){
		// lets process the args and construct things
		// lets create a todo
		this.todo = new painter.Todo()
		this.turtle = new this.Turtle(this)
		// our matrix
		this.viewPosition = mat4.create()

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

		this.children = this.initChildren = []
		for(i = 0; i < arguments.length; i++){
			var value = arguments[i]
			if(typeof value === 'object' && value.constructor === Object){
				for(var key in value){
					this[key] = value[key]
				}
			}
			else if(value instanceof View){
				this.initChildren.push(value)
			}
		}
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
			this.children = this.children?[this.children]:[]
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
			child.$composeTree(oldchild && oldchild.children)
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
				next = iter.children[index] // grab next node
				if(next) next.$childIndex = index // store the index
				//else we hopped up to parent
			}
			iter = next
		}
	}

	proto.recompose = function(){

	}

	// how do we incrementally redraw?
	proto.redraw = function(){
		this.$drawClean = false
		if(!this.root.redrawTimer){
			this.root.redrawTimer = setTimeout(function(){
				this.redrawTimer = undefined
				this.$redrawApp()
			}.bind(this.root),0)
		}
	}

	proto.onFlag1 = this.recompose
	proto.onFlag2 = this.redraw

	proto.onDrawChildren = function(){
		var todo = this.todo
		var children = this.children
		for(var i = 0; i < children.length; i++){
			child = children[i]
			todo.addChildTodo(child.todo)
			child.$redrawView()
		}
	}

	var zeroMargin = [0,0,0,0]
	proto.$redrawView = function(){		
		this._time = this.root._time
		this._frameId = this.root._frameId
		this.$writeList.length = 0

		// update the matrix?
		if(!this.$matrixClean){
			this.$matrixClean = true
			var hw = this.$w * this.cenX
			var hh = this.$h * this.cenY
			mat4.fromTSRT(this.viewPosition, -hw, -hh, 0, this.scaleX, this.scaleY, 1., 0, 0, this.rotate, hw + this.$x, hh+this.$y, 0)
		}

		// begin a new todo stack
		var todo = this.todo
		todo.clearTodo()
		
		// lets set some globals
		todo.mat4Global(painter.nameId('this_DOT_viewPosition'), this.viewPosition)

		if(this.root == this){
			todo.mat4Global(painter.nameId('this_DOT_camPosition'), this.root.camPosition)
			todo.mat4Global(painter.nameId('this_DOT_camProjection'), this.root.camProjection)
			todo.clearColor(0.2, 0.2, 0.2, 1)
		}

		// store time info on todo
		todo.self.timeStart = this._time
		todo.self.timeMax = 0

		// begin a new turtle with the views' layout settings
		var turtle = this.turtle
		turtle._margin = zeroMargin
		turtle._padding = this._padding
		turtle._align = this._align
		turtle._wrap = this._wrap
		turtle._w = this.$w
		turtle._h = this.$h

		this.$stampId = 1

		this.beginTurtle()

		if(this.onDraw){
			this.onFlag = 2
			this.onDraw()
			this.onFlag = 0
		}

		this.onDrawChildren()

		this.endTurtle()
	}
	
	proto.$redrawApp = function(){
		// we can submit a todo now
		this._time = (Date.now() - painter.timeBoot) / 1000
		this._frameId++

		mat4.ortho(this.camProjection,0, painter.w, 0, painter.h, -100, 100)

		var todo = this.todo

		if(this.$layoutClean){
			this.$relayoutView()
		}

		this.$redrawView()
	}
	
	// relayout needs to happen on all of it
	proto.$relayoutApp = function(){

		var iter = this
		var layout = this.$turtleLayout

		// reset the write list
		layout.$writeList.length = 0
		layout.$turtleStack.len = 0
		layout.view = layout

		iter._x = 0
		iter._y = 0
		iter._w = painter.w
		iter._h = painter.h

		while(iter){
			var turtle = layout.turtle

			// copy the props from the iterator node to the turtle
			turtle._x = iter._x
			turtle._y = iter._y
			turtle._w = iter._w
			turtle._h = iter._h
			turtle._margin = iter._margin
			turtle._padding = iter._padding
			turtle._align = iter._align
			turtle._wrap = iter._wrap

			var level = layout.$turtleStack.len - (
				typeof turtle._x === "number" && !isNaN(turtle._x) || typeof turtle._x === "string" || 
				typeof turtle._y === "number" && !isNaN(turtle._y) || typeof turtle._y === "string"
			)?-1:0

			layout.$writeList.push(iter, level)

			layout.beginTurtle()
			turtle = layout.turtle

			turtle.view_iter = iter

			// depth first recursion free walk
			var next = iter.children[0]
			if(next) next.$childIndex = 0
			else while(!next){ // skip to parent next
				var view = turtle.view_iter
				
				var ot = layout.endTurtle()

				//if(!layout.turtle.outer)debugger
				layout.turtle.walk(ot)

				turtle = layout.turtle
				
				// copy the layout from the turtle to the view
				view.$x = turtle._x
				view.$y = turtle._y
				view.$w = turtle._w
				view.$h = turtle._h
				//console.log(view.name, view.$w)
				// treewalk
				var index = iter.$childIndex + 1 // make next index
				iter = iter.parent // hop to parent
				if(!iter) break // cant walk up anymore
				next = iter.children[index] // grab next node
				if(next) next.$childIndex = index // store the index
			}
			iter = next
		}
	}

	proto.runApp = function(){
		var views = this.$views = []
		
		// our layout object used for running turtles on the view tree
		var layout = this.$turtleLayout = {
			$writeList: [],
			Turtle:this.Turtle,
			beginTurtle:function(){
				var len = ++this.$turtleStack.len
				var outer = this.turtle
				var turtle = this.turtle = (this.$turtleStack[len] || (this.$turtleStack[len] = new this.Turtle(this)))
				turtle.begin(outer)
				return turtle
			},
			endTurtle:function(){
				this.turtle.end()
				var last = this.turtle
				this.turtle = this.$turtleStack[--this.$turtleStack.len]
				return last
			},
			$moveWritten:function(start, dx, dy){
				var writes = this.$writeList
				var current = this.$turtleStack.len
				for(var i = start; i < writes.length; i += 2){
					var node = writes[i]
					var level = writes[i+1]
					if(current > level) continue
					node.$x += dx
					node.$y += dy
				}
			}
		}
		layout.turtle = new this.Turtle(layout)
		layout.$turtleStack = [layout.turtle]
		layout.$writeList = []
		layout.view = layout

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

		this.$relayoutApp()

		// first draw
		this.$redrawApp(0,0)
	}
})