//var painter = require('painter')
//var fingers = require('fingers')
var painter = require('painter')
var fingers = require('fingers')
var mat4 = require('math/mat4')
var types = require('types')

module.exports = require('class').extend(function View(proto){

	require('props')(proto)
	require('events')(proto)
	require('tools')(proto)

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
		clip:true,
		xCenter:0.5,
		yCenter:0.5,
		xScale:1,
		yScale:1,
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
		this.$turtleStack = [this.turtle]
		this.$writeList = []
		this.$renderPasses = {}

		// our matrix
		this.viewPosition = mat4.create()
		this.viewInverse = mat4.create()
		this.viewTotal = mat4.create()

		// shader tree and stamp array
		this.$shaders = {}
		this.$stampId = 0
		this.$stamps = [0]

		this.view = this

		var children = this.children = this.constructorChildren = []
		for(i = 0; i < arguments.length; i++){
			var value = arguments[i]
			if(typeof value === 'object' && value.constructor === Object){
				for(var key in value){
					this[key] = value[key]
				}
			}
			else if(value instanceof View){
				children.push(value)
			}
		}

		this.todo.name = this.name || this.constructor.name
	}

	proto._onInit = function(){
		// connect our todo map
		this.app.$viewTodoMap[this.todo.todoId] = this
	}

	proto._onDestroy = function(){
		// destroy the todo
		this.todo.destroyTodo()
		this.todo = undefined
	}

	proto.onDrawChildren = function(){
		var todo = this.todo
		var children = this.children
		for(var i = 0; i < children.length; i++){
			child = children[i]
			todo.addChildTodo(child.todo)
			child.$redrawView()
		}
	}

	proto.beginSurface = function(name, w, h, pixelRatio, hasPick, hasZBuf, colorType){
		if(w === undefined) w = this.$w
		if(h === undefined) h = this.$h
		if(isNaN(w)) w = 1
		if(isNaN(h)) h = 1

		var sw = w * pixelRatio
		var sh = h * pixelRatio

		// and the todo is forked out
		var pass = this.$renderPasses[name] 

		if(!pass){ // initialize the buffers for the pass
			pass = this.$renderPasses[name] = {}
			pass.color0 = new painter.Texture(painter.RGBA, colorType || painter.UNSIGNED_BYTE, 0, 0, 0)
			if(hasPick) pass.pick = new painter.Texture(painter.RGBA, painter.UNSIGNED_BYTE, 0, 0, 0)
			if(hasZBuf) pass.depth = new painter.Texture(painter.DEPTH, painter.UNSIGNER_SHORT, 0, 0, 0)
			pass.framebuffer = new painter.Framebuffer(sw, sh, {
				color0:pass.color0,
				pick:pass.pick,
				depth:pass.depth
			})
			pass.todo = new painter.Todo()
			// store the view reference
			this.app.$viewTodoMap[pass.todo.todoId] = this

			pass.todo.name = 'surface-' + (this.name || this.constructor.name)
			pass.projection = mat4.create()
			pass.w = w
			pass.h = h
			mat4.ortho(pass.projection, 0, pass.w, pass.h, 0, -100, 100)
			// assign the todo to the framebuffe
			pass.framebuffer.assignTodo(pass.todo)
		}

		// swap out our todo object
		if(!this.$todoStack) this.$todoStack = []
		this.$todoStack.push(this.todo)
		this.todo = pass.todo
		// clear it
		this.todo.clearTodo()

		// see if we need to resize buffers
		if(pass.sw !== sw || pass.sh !== sh){
			pass.framebuffer.resize(sw, sh)
			pass.w = w
			pass.h = h
			pass.sw = sw
			pass.sh = sh
			mat4.ortho(pass.projection,0, pass.w, pass.h, 0, -100, 100)
		}

		return pass
	}

	Object.defineProperty(proto, 'viewGeom', {
		get:function(){
			return {
				lockScroll:0.,
				w:this.$w,
				h:this.$h,
				padding:this.padding
			}
		},
		set:function(){
			throw new Error('Dont call set on geom')
		}
	})

	proto.endSurface = function(){
		// stop the pass and restore our todo
		this.todo = this.$todoStack.pop()
	}

	var zeroMargin = [0,0,0,0]
	var identityMat4 = mat4.create()

	proto.$redrawView = function(){		
		this._time = this.app._time

		this._frameId = this.app._frameId
		this.$writeList.length = 0
		this.$drawClean = true
		// update the matrix?
		if(!this.$matrixClean){
			this.$matrixClean = true
			var hw = this.$w * this.xCenter
			var hh = this.$h * this.yCenter
			mat4.fromTSRT(this.viewPosition, -hw, -hh, 0, this.xScale, this.yScale, 1., 0, 0, radians(this.rotate), hw + this.$x, hh+this.$y, 0)

			if(this.parent && !this.parent.surface){
				mat4.multiply(this.viewPosition, this.viewPosition, this.parent.viewPosition)
			}
			// keep total and inverse
			if(this.parent){
				mat4.multiply(this.viewTotal, this.viewPosition, this.parent.viewPosition)
				mat4.invert(this.viewInverse, this.viewTotal)
			}
			else{
				mat4.invert(this.viewInverse, this.viewPosition)
			}
		}
		
		// begin a new todo stack
		var todo = this.todo
		todo.clearTodo()
		// lets set some globals
		todo.mat4Global(painter.nameId('this_DOT_viewPosition'), this.viewPosition)
		todo.mat4Global(painter.nameId('this_DOT_viewInverse'),this.viewInverse)

		// we need to render to a texture
		if(this.surface){
			// set up a surface and start a pass
			var pass = this.beginSurface('surface', this.$w, this.$h, painter.pixelRatio, true)
			todo = this.todo
			todo.mat4Global(painter.nameId('this_DOT_viewPosition'),identityMat4)
			todo.mat4Global(painter.nameId('this_DOT_viewInverse'),this.viewInverse)
			todo.mat4Global(painter.nameId('this_DOT_camPosition'),identityMat4)
			todo.mat4Global(painter.nameId('this_DOT_camProjection'),pass.projection)
			todo.clearColor(0., 0., 0., 1)
		}
		else{
			if(this.app == this){
				todo.mat4Global(painter.nameId('this_DOT_camPosition'), this.camPosition)
				todo.mat4Global(painter.nameId('this_DOT_camProjection'), this.camProjection)
				todo.clearColor(0.2, 0.2, 0.2, 1)
			}
		}

		// store time info on todo
		todo.timeStart = this._time
		todo.timeMax = 0

		// clean out the turtlestack for our draw api
		this.$turtleStack.len = 0
		var turtle = this.turtle
		turtle._margin = zeroMargin
		turtle._padding = zeroMargin// this._padding
		turtle._align = this._align
		turtle._wrap = this._wrap
		turtle._x = 0
		turtle._y = 0		
		turtle._w = this.$w
		turtle._h = this.$h

		// lets set up a clipping rect
		if(this.clip){
			//console.log(this.$x, this.$y, this.$w, this.$h)
			this.viewClip = [0,0,this.$w,this.$h]
		}
		turtle._turtleClip = [-50000,-50000,50000,50000]
		turtle._pickId = 0
		this.$stampId = 1

		this.beginTurtle()

		if(this.onDraw){
			this.onFlag = 2
			this.onDraw()
			this.onFlag = 0
		}

		this.onDrawChildren()

		this.endTurtle()

		// store the draw width and height for layout if needed
		this.$wDraw = turtle._w
		this.$hDraw = turtle._h

		// store the total and view heights for scrolling on the todo
		this.todo.xTotal = this.turtle.x2
		this.todo.xView = this.$wDraw
		this.todo.yTotal = this.turtle.y2
		this.todo.yView = this.$hDraw
		this.todo.momentum = 0.92

		// check if we are larger than our view area, show a scrollbar
		if(this.turtle.y2 > this.$hDraw){

			this.$yScroll = this.drawScrollBar({
				lockScroll:0,
				x:this.$wDraw - 10,
				handleSize: this.$hDraw/this.turtle.y2,
				y:0,
				w:10,
				h:this.$hDraw,
			})

			this.todo.yScrollId = this.$yScroll.$stampId
			
			// alright im'a going to allow prop buffer
			// patching from a widget.
			
			this.todo.onScroll = function(x, y){
				this.todo.xScroll = x
				this.todo.yScroll = y
				this.$yScroll.setHandlePos(y / this.todo.yTotal)
			}.bind(this)

			this.$yScroll.onSlide = function(v){
				// scroll the todo
				this.todo.setScroll(0, v * this.todo.yTotal) 
			}.bind(this)
		}
		if(this.turtle.x2 > this.$wDraw){
			this.todo.xView = this.todo.xTotal
		}

		// if we are a surface, end the pass and draw it to ourselves
		if(this.surface){
			this.endSurface()
			// draw using 
			this.drawSurface({
				x:0,
				y:0,
				w:this.$w,
				h:this.$h,
				colorSampler: pass.color0,
				pickSampler: pass.pick
			})
		}
	}

	proto.recompose = function(){
	}

	// how do we incrementally redraw?
	proto.redraw = function(){
		this.$drawClean = false
		if(!this.app.redrawTimer){
			this.app.redrawTimer = setTimeout(function(){
				this.redrawTimer = undefined
				this.$redrawViews()
			}.bind(this.app),0)
		}
	}

	proto.relayout = function(){
		this.app.$layoutClean = false
		this.redraw()
	}

	proto.onFlag1 = proto.recompose
	proto.onFlag2 = proto.redraw
	proto.onFlag4 = proto.relayout

	proto.tools = {
		ScrollBar: require('stamps/scrollbarstamp'),
		Surface:require('shader').extend(function Surface(proto){
			proto.props = {
				x: NaN,
				y: NaN,
				w: NaN,
				h: NaN,
				z: 0,
				mesh:{kind:'geometry', type:types.vec2},
				colorSampler:{kind:'sampler', sampler:painter.SAMPLER2DNEAREST},
				pickSampler:{kind:'sampler', sampler:painter.SAMPLER2DNEAREST}
			}

			proto.mesh = painter.Mesh(types.vec2).pushQuad(0, 0, 1, 0, 0, 1, 1, 1)

			proto.vertex = function(){$
				var pos = vec2(this.mesh.x * this.w, this.mesh.y * this.h) + vec2(this.x, this.y)
				return vec4(pos, 0., 1.0) * this.viewPosition * this.camPosition * this.camProjection
			}

			proto.pixelMain = function(){$
				if(painterPickPass != 0){
					gl_FragColor = texture2D(this.pickSampler, this.mesh.xy)
				}
				else{
					gl_FragColor = texture2D(this.colorSampler, this.mesh.xy)
				}
			}

			proto.toolMacros = {
				draw:function(overload){
					this.$STYLEPROPS(overload)
					this.$ALLOCDRAW()
					this.$WRITEPROPS()
				}
			}
		})
	}

})