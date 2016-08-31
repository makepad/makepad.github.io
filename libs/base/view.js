//var painter = require('painter')
//var fingers = require('fingers')
var painter = require('services/painter')
var fingers = require('services/fingers')
var mat4 = require('base/mat4')
var types = require('base/types')

module.exports = require('base/class').extend(function View(proto){

	require('base/props')(proto)
	require('base/events')(proto)
	require('base/tools')(proto)

	proto.Turtle = require('base/turtle')
	
	var View = proto.constructor

	// lets define some props
	proto.props = {
		visible:true,
		x:NaN,
		y:NaN,
		z:NaN,
		w:'100%',
		h:'100%',
		overflow:'scroll',
		d:NaN,
		clip:true,
		xCenter:0.5,
		yCenter:0.5,
		xScale:1,
		yScale:1,
		rotate:0,
		time:0,
		hasFocus:false,
		frameId:0,
		surface:false,
		margin:[0,0,0,0],
		padding:[0,0,0,0],
		drawPadding:[0,0,0,0],
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
		//this.$stampId = 0
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

	// breadth first find child by name
	proto.find = function(name){
		if(this.name === name || this.constructor.name === name) return this
		var children = this.children
		if(children){
			var childlen = children.length
			for(var i = 0; i < childlen; i++){
				var child = children[i]
				if(child.name === name || child.constructor.name === name) return child
			}
			for(var i = 0; i< childlen; i++){
				var child = children[i]
				var res = child.find(name)
				if(res) return res
			}
		}
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
			pass.framebuffer = new painter.Framebuffer(sw, sh,{
				color0:pass.color0,
				pick:pass.pick,
				depth:pass.depth,
			}, this.$xAbs, this.$yAbs)
			pass.todo = new painter.Todo()
			// store the view reference
			this.app.$viewTodoMap[pass.todo.todoId] = this

			pass.todo.name = 'surface-' + (this.name || this.constructor.name)
			pass.projection = mat4.create()
			pass.w = w
			pass.h = h
			mat4.ortho(pass.projection, 0, pass.w, 0, pass.h, -100, 100)
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
		if(pass.sw !== sw || pass.sh !== sh || pass.sx !== this.$xAbs || pass.sy !== this.$yAbs){
			pass.framebuffer.resize(sw, sh, this.$xAbs, this.$yAbs)
			pass.sx = this.$xAbs
			pass.sy = this.$yAbs			
			pass.w = w
			pass.h = h
			pass.sw = sw
			pass.sh = sh
			mat4.ortho(pass.projection,0, pass.w,  0,pass.h, -100, 100)
		}

		return pass
	}

	proto.addChild = function(child, index){
		if(index === undefined) index = this.children.length
		this.children.splice(index, 0, child)
		child.app = this.app
		child.parent = this
		this.app.$composeTree(child)
		//this.redraw()
		this.relayout()
	}

	proto.removeChild = function(index){
		this.children.splice(index, 1)
		this.relayout()
	}

	Object.defineProperty(proto, 'viewGeom', {
		get:function(){
			return {
				lockScroll:0.,
				noBounds:1,
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

	proto.$scrollBarSize = 8
	proto.$scrollBarRadius = 4
	proto.$scrollPickIds = 65530

	proto.scrollIntoView = function(x, y, w, h){
		// we figure out the scroll-to we need
		var todo = this.todo
		var sx = todo.xScroll, sy = todo.yScroll
		if(x < todo.xScroll) sx = Math.max(0., x)
		if(x+w > todo.xScroll + todo.xView) sx = Math.max(0.,Math.min(x + w - todo.xView, todo.xTotal - todo.xView))
		if(y < todo.yScroll) sy = Math.max(0., y)
		if(y+h > todo.yScroll + todo.yView) sy = Math.max(0.,Math.min(y + h - todo.yView, todo.yTotal - todo.yView))
		this.todo.scrollTo(sx, sy)
	}

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
			if(this.parent){
				mat4.multiply(this.viewTotal, this.parent.viewPosition, this.viewPosition)
				mat4.invert(this.viewInverse, this.viewTotal)
				if(!this.parent.surface){
					mat4.multiply(this.viewPosition, this.parent.viewPosition, this.viewPosition)
				}
			}
		}
		// begin a new todo stack
		var todo = this.todo
		todo.clearTodo()
		if(!this._visible) return
		// lets set some globals
		todo.mat4Global(painter.nameId('this_DOT_viewPosition'), this.viewPosition)
		//todo.viewInverse = this.viewInverse
		todo.mat4Global(painter.nameId('this_DOT_viewInverse'),this.viewInverse)

		if(this.app == this){
			todo.mat4Global(painter.nameId('this_DOT_camPosition'), this.camPosition)
			todo.mat4Global(painter.nameId('this_DOT_camProjection'), this.camProjection)
			todo.clearColor(0.2, 0.2, 0.2, 1)
		}

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

		// store time info on todo
		todo.timeStart = this._time
		
		// clean out the turtlestack for our draw api
		this.$turtleStack.len = 0
		var turtle = this.turtle
		turtle._margin = zeroMargin
		turtle._padding = this.drawPadding// this._padding
		turtle._align = this._align
		turtle._wrap = this._wrap
		turtle._x = 0
		turtle._y = 0		
		turtle._w = this.$w
		turtle._h = this.$h
		turtle.x1 = turtle.y1 = Infinity
		turtle.x2 = turtle.y2 = -Infinity

		// lets set up a clipping rect
		if(this.clip){
			//console.log(this.$x, this.$y, this.$w, this.$h)
			this.viewClip = [0,0,this.$w,this.$h]
		}
		turtle._turtleClip = [-50000,-50000,50000,50000]
		turtle._pickId = 0
		this.$pickId = 0
		//this.$stampId = 1

		this.beginTurtle()

		if(this.onDraw){
			this.onFlag = 2
			this.onDraw()
			this.onFlag = 0
		}

		this.onDrawChildren()

		this.endTurtle()

		// store the draw width and height for layout if needed
		var tw = this.$wDraw = turtle._w
		var th = this.$hDraw = turtle._h
		var tx2 = this.turtle.x2
		var ty2 = this.turtle.y2
		this.$x2Old = tx2
		this.$y2Old = ty2
	
		// lets compute if we need scrollbars
		if(this.overflow === 'scroll'){
			if(ty2 > th){
				tw -= this.$scrollBarSize
				if(tx2 > tw) th -= this.$scrollBarSize // add vert scrollbar
			}
			else if(tx2 > tw){
				th -= this.$scrollBarSize
				if(ty2 > th) tw -= this.$scrollBarSize
			}
		}

		// store the total and view heights for scrolling on the todo
		this.todo.scrollMask = 0
		this.todo.xTotal = tx2
		this.todo.xView = tw
		this.todo.yTotal = ty2
		this.todo.yView = th
		this.todo.scrollMomentum = 0.92
		this.todo.scrollToSpeed = 0.5
		this.todo.xsScroll = this.$xAbs
		this.todo.ysScroll = this.$yAbs
		// use the last 2 stampIds for the scroller
		this.$pickId = this.$scrollPickIds
		if(this.overflow === 'scroll'){
			if(th < this.$hDraw){
				this.$xScroll = this.drawScrollBar({
					lockScroll:0,
					isHorizontal:1.,
					x:0,
					y:this.$hDraw - this.$scrollBarSize,//-this.padding[0],// / painter.pixelRatio,
					w:tw,
					h:this.$scrollBarSize,// / painter.pixelRatio,
					borderRadius:this.$scrollBarRadius// / painter.pixelRatio
				})

				this.todo.xScrollId = this.$xScroll.$stampId
			}

			if(tw < this.$wDraw){ // we need a vertical scrollbar

				this.$yScroll = this.drawScrollBar({
					lockScroll:0,
					isHorizontal:0.,
					x:this.$wDraw - this.$scrollBarSize,//-this.padding[3], /// painter.pixelRatio,
					y:0,
					w:this.$scrollBarSize,// / painter.pixelRatio,
					h:th,
					borderRadius:this.$scrollBarRadius// / painter.pixelRatio
				})

				this.todo.yScrollId = this.$yScroll.$stampId
			}
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
		if(this.onAfterDraw) this.onAfterDraw()
	}

	proto.reuseDrawSize = function(){
		this.turtle.x2 = this.$x2Old
		this.turtle.y2 = this.$y2Old
	}

	proto.recompose = function(){
	}

	// how do we incrementally redraw?
	proto.redraw = function(){
		this.$drawClean = false
		if(this.app && !this.app.redrawTimer){
			this.app.redrawTimer = setImmediate(function(){
				this.$redrawViews()
				this.redrawTimer = undefined
			}.bind(this.app),0)
		}
	}

	proto.relayout = function(){
		this.app.$layoutClean = false
		this.redraw()
	}

	proto.setFocus = function(){
		var old = this.app.$focusView
		this.app.setWorkerKeyboardFocus()
		if(old !== this){
			this.app.$focusView = this
			old.hasFocus = false
			this.hasFocus = true
		}
	}

	proto.clearFocus = function(){
		var old = this.app.$focusView		
		this.app.$focusView = undefined
		if(old){
			old.hasFocus = false
		}
	}

	proto.animateUniform = function(value){
		var timeMax = value[0] + value[1]
		if(timeMax > this.todo.timeMax) this.todo.timeMax = timeMax
	}

	proto.onFlag1 = proto.recompose
	proto.onFlag2 = proto.redraw
	proto.onFlag4 = proto.relayout

	proto.tools = {
		ScrollBar: require('base/stamp').extend(function ScrollBarStamp(proto){
			proto.props = {
				isHorizontal:0.,
				lockScroll:1.,
				borderRadius:4
			}

			proto.tools = {
				ScrollBar: require('tools/quad').extend({
					props:{
						x:{noTween:1, noInPlace:1, value:NaN},
						y:{noTween:1, noInPlace:1, value:NaN},
						isHorizontal:{noTween:1, value:0.},
						bgColor:'#000',
						handleColor:'#111',
						borderRadius:4
					},
					vertexStyle:function(){$ // bypass the worker roundtrip :)
						var pos = vec2()
						if(this.isHorizontal > .5){
							this.y += 1.///this.pixelRatio
							this.handleSize = this.viewSpace.x / this.viewSpace.z
							this.handlePos = this.viewScroll.x / this.viewSpace.z
						}
						else{
							this.x += 1.///this.pixelRatio
							this.handleSize = this.viewSpace.y / this.viewSpace.w
							this.handlePos = this.viewScroll.y / this.viewSpace.w
						}
					},
					pixelStyle:function(){},
					pixel:function(){
						this.pixelStyle()
						var p = this.mesh.xy * vec2(this.w, this.h)
						var antialias = 1./length(vec2(length(dFdx(p.x)), length(dFdy(p.y))))
						
						// background field
						var pBg = p
						var bBg = this.borderRadius
						var hBg = vec2(.5*this.w, .5*this.h)
						var fBg = length(max(abs(pBg-hBg) - (hBg - vec2(bBg)), 0.)) - bBg

						// handle field
						var pHan = p
						var hHan = vec2(.5*this.w, .5*this.h)
						if(this.isHorizontal > 0.5){
							pHan -= vec2(this.w * this.handlePos, 0.)
							hHan *= vec2(this.handleSize, 1.)
						}
						else{
							pHan -=  vec2(0., this.h * this.handlePos)
							hHan *=  vec2(1., this.handleSize)
						}
						
						var bHan = this.borderRadius
						var fHan = length(max(abs(pHan-hHan) - (hHan - vec2(bHan)), 0.)) - bHan

						// mix the fields
						var finalBg = mix(this.bgColor, vec4(this.bgColor.rgb, 0.), clamp(fBg*antialias+1.,0.,1.))
						return mix(this.handleColor, finalBg, clamp(fHan * antialias + 1., 0., 1.))
					}
				})
			}

			proto.states = {
				default:{
					ScrollBar:{
						tween:1,
						duration:0.3,
						bgColor:'#4448',
						handleColor:'#888'
					}
				},
				hover:{
					ScrollBar:{
						tween:1,
						duration:0.1,
						bgColor:'#555f',
						handleColor:'yellow'
					}
				}
			}

			proto.inPlace = true

			proto.onFingerDown = function(){
				this.state = this.states.hover
			}

			proto.onFingerUp = function(){
				this.state = this.states.default
			}

			proto.onDraw = function(){
				this.drawScrollBar(this)
			}

			proto.toolMacros = {
				draw:function(overload){
					this.$STYLESTAMP(overload)
					this.$DRAWSTAMP()
					return $stamp
				}
			}
		}),
		Surface:require('base/shader').extend(function Surface(proto){
			proto.props = {
				x: {noTween:1, value:NaN},
				y: {noTween:1, value:NaN},
				w: {noTween:1, value:NaN},
				h: {noTween:1, value:NaN},
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
				if(this.workerId < 0.){
					gl_FragColor = texture2D(this.pickSampler, vec2(this.mesh.x, 1.-this.mesh.y))
				}
				else{
					gl_FragColor = texture2D(this.colorSampler, vec2(this.mesh.x, 1.-this.mesh.y))
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