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


})