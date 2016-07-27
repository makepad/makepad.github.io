//var painter = require('painter')
//var fingers = require('fingers')
var painter = require('painter')
var fingers = require('fingers')
var mat4 = require('math/mat4')
var vec4 = require('math/vec4')
module.exports = require('view').extend(function App(proto, base){
	proto.name = 'App'
	// lets define some props
	proto.props = {
	}

	proto._onConstruct = function(){
		base._onConstruct.call(this)
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
					node.$xAbs += dx
					node.$yAbs += dy
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
			var xyLocal = [0,0,0,0]
			vec4.transformMat4(xyLocal, [msg.x, msg.y, 0, 1.], view.viewInverse)
			msg.xAbs = msg.x
			msg.yAbs = msg.y
			msg.x = msg.xView = xyLocal[0]
			msg.y = msg.yView = xyLocal[1]
			if(view[event]) view[event](msg)
			var stamp = view.$stamps[stampId]
			if(!stamp) return
			msg.x = msg.xView - stamp.$x
			msg.y = msg.yView - stamp.$y
			if(stamp[event]) stamp[event](msg)
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

		painter.onResize = function(){
			this.$redrawViews()
		}.bind(this)

		// lets do our first redraw
		this.app = this

		// compose the tree
		this.$composeTree(this)

		// regenerate view ids
		this.$generateViewIds()

		// lets attach our todo to the main framebuffer
		painter.mainFramebuffer.assignTodo(this.todo)

		// first draw
		this.$redrawViews(0,0)		
	}

	proto._onDestroy = function(){
		base._onDestroy.call(this)
	}

	proto.$composeTree = function(node, oldChildren){
		// it calls compose recursively
		if(node.onCompose){
			node.onflag = 1
			node.children = node.onCompose()
			node.onflag = 0
		}

		if(!Array.isArray(node.children)){
			node.children = node.children?[node.children]:[]
		}

		var children = node.children

		if(!node.initialized){
			node.initialized = true
			if(node._onInit) node._onInit()
			if(node.onInit) node.onInit()
		}

		for(var i = 0; i < children.length; i++){
			var child = children[i]
			child.parent = node
			child.app = node.app
			var oldchild = oldChildren && oldChildren[i]
			this.$composeTree(child, oldchild && oldchild.children)
		}

		if(oldChildren) for(;i < oldChildren.length; i++){
			var oldchild = oldChildren[i]
			oldchild.destroyed = true
			if(oldchild.onDestroy) oldchild.onDestroy()
			if(oldchild._onDestroy) oldchild._onDestroy()
		}

		if(node.onComposed) node.onComposed()
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


	// relayout the viewtree
	proto.$relayoutViews = function(){

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

			iter.$matrixClean = false

			// copy the props from the iterator node to the turtle
			turtle._x = iter._x
			turtle._y = iter._y
			if(iter.$drawDependentLayout){
				iter.$drawDependentLayout = false
				turtle._w = iter.$wDraw
				turtle._h = iter.$hDraw
			}
			else{
				turtle._w = iter._w
				turtle._h = iter._h
			}
			turtle._margin = iter._margin
			turtle._padding = iter._padding
			turtle._align = iter._align
			turtle._wrap = iter._wrap

			var level = layout.$turtleStack.len - ((
				typeof turtle._x === "number" && !isNaN(turtle._x) || typeof turtle._x === "string" || 
				typeof turtle._y === "number" && !isNaN(turtle._y) || typeof turtle._y === "string"
			)?-1:0)

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
				view.$xAbs = turtle._x 
				view.$yAbs = turtle._y 
				view.$w = turtle._w
				view.$h = turtle._h

				// we need an extra layout cycle after redraw
				if(isNaN(view.$w) || isNaN(view.$h)){
					iter.$drawDependentLayout = true
					this.$drawDependentLayout = true
				}
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

		// compute relative positions
		var iter = this
		iter.$x = 0
		iter.$y = 0
		while(iter){
			if(iter.parent){
				iter.$x = iter.$xAbs - iter.parent.$xAbs
				iter.$y = iter.$yAbs - iter.parent.$yAbs
			}			
			var next = iter.children[0]
			if(next) next.$childIndex = 0
			else while(!next){ // skip to parent next
				var index = iter.$childIndex + 1 // make next index
				iter = iter.parent // hop to parent
				if(!iter) break // cant walk up anymore
				next = iter.children[index] // grab next node
				if(next) next.$childIndex = index // store the index
			}
			iter = next
		}
	}

	proto.$redrawViews = function(){
		// we can submit a todo now
		this._time = (Date.now() - painter.timeBoot) / 1000
		this._frameId++
		mat4.ortho(this.camProjection,0, painter.w, 0, painter.h, -100, 100)

		var todo = this.todo

		if(!this.$layoutClean){
			this.$layoutClean = false
			this.$relayoutViews()
		}

		this.$redrawView()

		// needs another draw cycle because some sizes depended on their draw
		if(this.$drawDependentLayout){
			this._frameId++
			this.$drawDependentLayout = false
			this.$relayoutViews()
			this.$redrawView()			
		}
	}
})