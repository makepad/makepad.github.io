//var painter = require('painter')
//var fingers = require('fingers')
var painter = require('services/painter')
var fingers = require('services/fingers')
var mat4 = require('base/mat4')
var types = require('base/types')

var zeroMargin = [0,0,0,0]
var identityMat4 = mat4.create()

module.exports = class View extends require('base/class'){

	prototype(){
		this.mixin(
			require('base/props'),
			require('base/events'),
			require('base/tools')
		)

		this.Turtle = require('base/turtle')

		this.props = {
			visible:true,
			x:NaN,
			y:NaN,
			z:NaN,
			w:NaN,
			h:NaN,
			xOverflow:'scroll',
			yOverflow:'scroll',
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
			// drawPadding:undefined,
			align:[0,0],
			down:0,
			wrap:1
		}

		this.inheritable('verbs', function(){
			var verbs = this.verbs
			if(!this.hasOwnProperty('_verbs')) this._verbs = this._verbs?Object.create(this._verbs):{}
			for(let key in verbs) this._verbs[key] = verbs[key]
		})

		this.$todoUboDef = {
			thisDOTtodoId:{type:{slots:1,name:'float'}},
			thisDOTviewInverse:{type:{slots:16,name:'mat4'}},
			thisDOTviewPosition:{type:{slots:16,name:'mat4'}},
			thisDOTviewScroll:{type:{slots:1,name:'vec2'}},
			thisDOTviewSpace:{type:{slots:1,name:'vec4'}}
		}

		this.$painterUboDef = {
			thisDOTcamPosition:{type:{slots:16,name:'mat4'}},
			thisDOTcamProjection:{type:{slots:16,name:'mat4'}},
			thisDOTfingerInfo:{type:{slots:16,name:'mat4'}},
			thisDOTpixelRatio:{type:{slots:16,name:'float'}},
			thisDOTtime:{type:{slots:16,name:'float'}},
			thisDOTvertexPostMatrix:{type:{slots:16,name:'mat4'}},
			thisDOTworkerId:{type:{slots:16,name:'float'}},
		}
		/*
		this.tools = {
			ScrollBar: require('stamps/scrollbar'),
			Debug:require('shaders/quad'),
			Surface:require('base/shader').extend({
				props:{
					x: NaN,
					y: NaN,
					w: NaN,
					h: NaN,
					z: 0,
					mesh:{kind:'geometry', type:types.vec2},
					colorSampler:{kind:'sampler', sampler:painter.SAMPLER2DNEAREST},
					pickSampler:{kind:'sampler', sampler:painter.SAMPLER2DNEAREST}
				},
				mesh:new painter.Mesh(types.vec2).pushQuad(0, 0, 1, 0, 0, 1, 1, 1),
				drawTrace:1,
				
				vertex(){$
					var pos = vec2(this.mesh.x * this.w, this.mesh.y * this.h) + vec2(this.x, this.y)
					return vec4(pos, 0., 1.0) * this.viewPosition * this.camPosition * this.camProjection
				},

				pixelMain(){$
					if(this.workerId < 0.){
						gl_FragColor = texture2D(this.pickSampler, vec2(this.mesh.x, 1.-this.mesh.y))
					}
					else{
						gl_FragColor = texture2D(this.colorSampler, vec2(this.mesh.x, 1.-this.mesh.y))
					}
				},

				verbs:{
					draw:function(overload){
						this.$STYLEPROPS(overload)
						this.$ALLOCDRAW()
						this.$WRITEPROPS()
					}
				}
			})
		}*/

		//this.viewId = 0
		this._onVisible = 8

		this.$scrollBarSize = 8
		this.$scrollBarMinSize = 30
		this.$scrollBarRadius = 2
		this.$scrollPickIds = 65000
	
		this.onFlag4 = this.redraw

		this.verbs = {
			draw:function(overload){
				//this.app.$viewTodoMap[this.todo.todoId] = this
				var id = overload.id
				if(id === undefined) throw new Error('Please provide a local unique ID for a view')

				var view = this.$views[id]
				if(!view){
					view = new this.NAME(overload, this.app)
					view.parent = this
					view.app = this.app
				}
				else{ // copy props
					for(var key in overload){
						view[key] = overload[key]
					}
				}
				// add it to our todo
				this.todo.addChildTodo(view.todo)
				// draw it here
				view.$redrawView()
			}
		}
	}

	constructor(overload, app){
		super()
		this.app = app
		this.todo = this.$createTodo()
		// hook it
		if(app) app.$viewTodoMap[this.todo.todoId] = this

		// put in our default turtle
		this.$turtleStack = []
		this.$turtleStack.len = 0
		this.$writeList = []

		this.$renderPasses = {}

		// our matrix
		this.viewPosition = mat4.create()
		this.viewInverse = mat4.create()
		this.viewTotal = mat4.create()

		// shader tree and stamp array
		this.$shaders = {}
		//this.$stampId = 0
		this.$stamps = {}
		this.$views = {}
		this.$pickIds = {}
		this.$pickId = 1
		this.view = this

		this.todo.viewId = this.id

		if(overload){
			for(let key in overload){
				this['_'+key] = overload[key]
			}
		}
	}
	
	destroy(){
		if(this.destroyed) return
		this.destroyed = true

		if(this.onDestroy) this.onDestroy()
		var children = this.children
		if(children) for(var i = 0; i < children.length; i++){
			children[i].destroy()
		}
		// clean out resources
		var todo = this.todo
		if(todo){
			this.todo = undefined
			this.app.$viewTodoMap[todo.todoId] = undefined
			todo.destroyTodo()
		}
		this.$recurDestroyShaders(this.$shaders)
		// destroy framebuffers
		for(var name in this.$renderpasses){
			var pass = this.$renderpasses[name]
			this.$renderpasses[name] = undefined
			if(pass.color0) pass.color0.destroyTexture()
			if(pass.pick) pass.pick.destroyTexture()
			if(pass.depth) pass.depth.destroyTexture()
			pass.framebuffer.destroyFramebuffer()
		}
	}

	bindProp(propname, subname, subprop){
		Object.defineProperty(this, propname, {
			get:function(){
				
			},
			set:function(){
				
			}
		})
	}

	$createTodo(){
		var todo = new painter.Todo()

		//var todoUboDef = this.Surface.prototype.$compileInfo.uboDefs.todo
		
		// we need the todo ubo part
		// how do we get it without compiling it.

		//console.log(todoUboDef)
		todo.todoUbo = new painter.Ubo(this.$todoUboDef)
		todo.view = this
		return todo
	}

	findInstances(cons, set){
		if(!set) set = []
		if(this instanceof cons) set.push(this)
		var children = this.children
		if(children){
			var childlen = children.length
			for(let i = 0; i < childlen; i++){
				var child = children[i]
				child.findInstances(cons, set)
			}
		}
		return set
	}

	// breadth first find child by name
	find(id){
		var children = this.children
		if(children){
			var childlen = children.length
			if(id.constructor === RegExp){
				for(let i = 0; i < childlen; i++){
					var child = children[i]
					if(child.id && child.id.match(id)) return child
				}
			}
			else{
				for(let i = 0; i < childlen; i++){
					var child = children[i]
					if(child.id === id) return child
				}
			}
			for(let i = 0; i< childlen; i++){
				var child = children[i]
				var res = child.find(id)
				if(res) return res
			}
		}
	}

	// depth first find all
	findAll(id, set){
		if(!set) set = []
		if(id.constructor === RegExp){
			if(this.id && this.id.match(id)) set.push(this)
		}
		else{
			if(this.id === id) set.push(this)
		}
		for(var key in this.$views)	{
			var child = this.$views[key]
			child.findAll(id, set)
		}
		return set
	}

	onComposeDestroy(){
		// remove entry
		this.destroy()
	}

	beginSurface(name, w, h, pixelRatio, hasPick, hasZBuf, colorType){
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
			pass.todo = this.$createTodo()
			// store the view reference
			this.app.$viewTodoMap[pass.todo.todoId] = this

			pass.todo.viewId = 'surface-' + (this.id || this.constructor.name)
			pass.projection = mat4.create()
			pass.w = w
			pass.h = h
			mat4.ortho(pass.projection, 0, pass.w, 0, pass.h, -100, 100)
			// assign the todo to the framebuffe
			pass.framebuffer.assignTodoAndUbo(pass.todo, this.app.painterUbo)
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

	/*
	addNewChild(child, index){
		if(index === undefined) index = this.children.length
		this.children.splice(index, 0, child)
		child.app = this.app
		child.store = this.store
		child.parent = this
		this.app.$composeTree(child)
		if(this.onAfterCompose) this.onAfterCompose()
		//this.redraw()
		this.relayout()
		return index
	}
	
	replaceNewChild(child, index){
		var oldChild = this.children[index]
		this.children[index] = child
		child.app = this.app
		child.store = this.store
		child.parent = this
		this.app.$composeTree(child)
		this.relayout()
		if(this.onAfterCompose) this.onAfterCompose()
		return oldChild
	}

	replaceOldChild(child, index){
		var oldChild = this.children[index] 
		this.children[index] = child
		child.app = this.app
		child.store = this.store
		child.parent = this
		this.relayout()
		if(this.onAfterCompose) this.onAfterCompose()
		return oldChild
	}

	addOldChild(child, index){
		if(index === undefined) index = this.children.length
		this.children.splice(index, 0, child)
		child.parent = this
		this.relayout()
	}

	deleteChild(index){
		var del = this.children.splice(index, 1)[0]
		this.relayout()
		return del
	}

	removeChild(index){
		var del = this.children.splice(index, 1)[0]
		this.relayout()
		return del
	}
	*/
	
	endSurface(){
		// stop the pass and restore our todo
		this.todo = this.$todoStack.pop()
	}

	transferFingerMove(digit, pickId){
		this.app.transferFingerMove(digit, this.todo.todoId, pickId)
	}

	/*
	get viewGeom(){
		return {
			moveScroll:0.,
			noBounds:1,
			w:this.$w,
			h:this.$h,
			padding:this.drawPadding || this.padding
		}
	}

	set viewGeom(v){
		throw new Error('Dont call set on viewGeom')
	}*/

	scrollIntoView(x, y, w, h){
		// we figure out the scroll-to we need
		var todo = this.todo
		var sx = todo.xScroll, sy = todo.yScroll
		if(x < todo.xScroll) sx = Math.max(0., x)
		if(x+w > todo.xScroll + todo.xView) sx = Math.max(0.,Math.min(x + w - todo.xView, todo.xTotal - todo.xView))
		if(y < todo.yScroll) sy = Math.max(0., y)
		if(y+h > todo.yScroll + todo.yView) sy = Math.max(0.,Math.min(y + h - todo.yView, todo.yTotal - todo.yView))
		this.todo.scrollTo(sx, sy)
	}

	$recomputeMatrix(){
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

		var todo = this.todo
		// lets set some globals
		var todoUbo = todo.todoUbo
		todoUbo.mat4(painter.nameId('thisDOTviewPosition'), this.viewPosition)
		todoUbo.mat4(painter.nameId('thisDOTviewInverse'),this.viewInverse)

		var children = todo.children
		var todoIds = todo.todoIds
		for(var i = 0, l = children.length; i < l; i++){
			var view = todoIds[children[i]].view
			view.$recomputeMatrix()
		}
	}

	$allocStamp(args, classname){
		var turtle = this.turtle
		var id = args.id
		if(id === undefined) throw new Error("Please provide a locally unique id to a stamp")
		var stamp = this.$stamps[id]
		if(!stamp){
			stamp = this.$stamps[id] = new this[classname]()
			var pickId = this.$pickId++
			this.$pickIds[pickId] = stamp
			stamp.view = this
			stamp.$pickId = pickId
		}
		else if(stamp.constructor !== this[classname]) console.error("Stamp ID reused for different class!")
		var group = args.group
		if(group){
			var l = group + classname
			stamp.group = group
			stamp.$shaders = this.$shaders[l]
			if(!stamp.$shaders) $stamp.$shaders = (this.$shaders[l] = {})
		}
		else{
			stamp.$shaders = this.$shaders[classname]
			if(!stamp.$shaders) stamp.$shaders = (this.$shaders[classname] = {})
		}
		stamp.turtle = turtle
		//turtle._pickId = stamp.$pickId
		return stamp
	}

	$redrawView(){
		this._time = this.app._time
		this._frameId = this.app._frameId

		//this.$writeList.length = 0

		// what if drawClean is true?....
		// update the matrix?
		// begin a new todo stack
		var todo = this.todo
		if(!todo) return // init failed

		var todoUbo = todo.todoUbo

		// alright so now we decide wether this todo needs updating
		if(this.$drawClean) return

		todo.clearTodo()
		// if we are not visible...
		if(!this.visible) return
		
		if(this.$scrollAtDraw){
			todo.scrollSet(this.$scrollAtDraw.x, this.$scrollAtDraw.y)
			this.$scrollAtDraw = undefined
		}
		
		if(this.app == this){
			this.painterUbo.mat4(painter.nameId('thisDOTcamPosition'), this.camPosition)
			this.painterUbo.mat4(painter.nameId('thisDOTcamProjection'), this.camProjection)
			todo.clearColor(0.2, 0.2, 0.2, 1)
		}

		// we need to render to a texture
		/*
		if(this.surface){
			// set up a surface and start a pass
			var pass = this.beginSurface('surface', this.$w, this.$h, painter.pixelRatio, true)
			todo = this.todo
			todoUbo = todo.todoUbo
			todoUbo.mat4(painter.nameId('thisDOTviewPosition'),identityMat4)
			todoUbo.mat4(painter.nameId('thisDOTviewInverse'),this.viewInverse)
			//!TODO SOLVE THIS LATER, for a surface this changes
			//todoUbo.mat4(painter.nameId('thisDOTcamPosition'),identityMat4)
			//todoUbo.mat4(painter.nameId('thisDOTcamProjection'),pass.projection)
			todo.clearColor(0., 0., 0., 1)
		}*/

		// store time info on todo
		//todo.timeStart = this._time		
		// our turtle is the parent

		var turtle = this.turtle = this.parent?this.parent.turtle:this.appTurtle

		if(this.parent){ // push us into the displacement list
			this.parent.$writeList.push(this,-1,-1)
		}

		// clear our write list
		this.$writeList.length = 0

		// set input props
		turtle._margin = this._margin
		turtle._padding = this._padding
		turtle._align = this._align
		turtle._down = this._down
		turtle._wrap = this._wrap
		turtle._x = this._x
		turtle._y = this._y
		turtle._w = this._w
		turtle._h = this._h
		this.$turtleStack.len = 0

		// lets set up a clipping rect IF we know the size
		turtle._turtleClip = [-50000,-50000,50000,50000]
		
		//turtle._pickId = 0
		//this.$pickId = 0

		this.beginTurtle()

		this.turtle.$xAbs = this.turtle.wx
		this.turtle.$yAbs = this.turtle.wy

		if(this.clip && !isNaN(this.turtle.width) && !isNaN(this.turtle.height)){
			this.viewClip = [0, 0, this.turtle.width, this.turtle.height]
		}

		if(this.onDraw){
			this.onFlag = 4
			this.onDraw()
			this.onFlag = 0
		}

		var ot = this.endTurtle()
		// walk it
		turtle.walk(ot)
		// write coordinates to view
		this.$x = turtle._x
		this.$y = turtle._y
		this.$w = turtle._w
		this.$h = turtle._h

		if(this.$turtleStack.len !== 0){
			console.error("Disalign detected in begin/end for turtle: "+this.name+" disalign:"+$turtleStack.len, this)
		}
		/*
		// store the draw width and height for layout if needed
		var tw = this.$wDraw = turtle._w
		var th = this.$hDraw = turtle._h
		var tx2 = turtle.x2
		var ty2 = turtle.y2
		
		this.$x2Old = tx2
		this.$y2Old = ty2

		var addHor, addVer
		// lets compute if we need scrollbars
		if(this.xOverflow === 'scroll' || this.yOverflow === 'scroll'){
			if(ty2 > th){
				tw -= this.$scrollBarSize, addVer = true
				if(tx2 > tw) th -= this.$scrollBarSize, addHor=true // add vert scrollbar
			}
			else if(tx2 > tw){
				th -= this.$scrollBarSize, addHor = true
				if(ty2 > th) tw -= this.$scrollBarSize, addVer = true
			}
		}

		// these things go away?..
		/*
		// draw dependent layouts (content sized views)
		if(typeof this.w === "number" && isNaN(this.w)){
			if(this.app.$drawDepLayoutStep === 0){
				this.app.$drawDepLayoutNext = true
				this.$drawDepLayout = true
			}
			this.$wDraw = tx2 === -Infinity?0:tx2
			if(addVer) this.$wDraw += this.$scrollBarSize
		}

		if(typeof this.h === "number" && isNaN(this.h) ){
			if(this.app.$drawDepLayoutStep === 0){
				this.app.$drawDepLayoutNext = true
				this.$drawDepLayout = true
			}
			//this.app.$drawDependentLayout = true
			//this.$drawDependentLayout = true
			this.$hDraw = ty2 === -Infinity?0:ty2
			if(addHor) this.$hDraw += this.$scrollBarSize
		}

		// view heights for scrolling on the todo
		this.todo.scrollMask = 0
		this.todo.xTotal = tx2
		this.todo.xView = tw
		this.todo.yTotal = ty2
		this.todo.yView = th
		this.todo.scrollMomentum = 0.92
		this.todo.scrollToSpeed = 0.5
		this.todo.xsScroll = this.$xAbs + painter.x
		this.todo.ysScroll = this.$yAbs + painter.y
		this.todo.scrollMinSize = this.$scrollBarMinSize

		// clear out unused stamps
		for(let i = this.$pickId+1;this.$stamps[i];i++){
			this.$stamps[i] = null
		}

		this.$pickId = this.$scrollPickIds
		if(this.xOverflow === 'scroll'){
			if(addHor){//th < this.$hDraw){
				this.$xScroll = this.drawScrollBar({
					moveScroll:0,
					vertical:false,
					scrollMinSize:this.$scrollBarMinSize,
					x:0,
					y:this.$hDraw - this.$scrollBarSize,//-this.padding[0],// / painter.pixelRatio,
					w:tw,
					h:this.$scrollBarSize,// / painter.pixelRatio,
					borderRadius:this.$scrollBarRadius// / painter.pixelRatio
				})
				this.todo.xScrollId = this.$xScroll.$stampId
				if(this.onScroll) this.todo.onScroll = this.onScroll.bind(this)
			}
			else if(todo.xScroll > 0){
				todo.scrollTo(0,undefined)
			}
		}
		if(this.yOverflow === 'scroll'){
			if(addVer){//tw < this.$wDraw){ // we need a vertical scrollbar

				this.$yScroll = this.drawScrollBar({
					moveScroll:0,
					vertical:true,
					scrollMinSize:this.$scrollBarMinSize,
					x:this.$wDraw - this.$scrollBarSize,//-this.padding[3], /// painter.pixelRatio,
					y:0,
					w:this.$scrollBarSize,// / painter.pixelRatio,
					h:th,
					borderRadius:this.$scrollBarRadius// / painter.pixelRatio
				})
				this.todo.yScrollId = this.$yScroll.$stampId
				if(this.onScroll) this.todo.onScroll = this.onScroll.bind(this)
			}
			else if(todo.yScroll > 0){
				todo.scrollTo(undefined,0)
			}
		}*/

		// if we are a surface, end the pass and draw it to ourselves
		/*
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
		*/
		/*
		if(this.onOverlay){
			// reset our matrices
			//todo.mat4Global(painter.nameId('thisDOTviewPosition'), this.viewPosition)
			//todo.mat4Global(painter.nameId('thisDOTviewInverse'),this.viewInverse)
			this.beginTurtle()
			this.turtle._x = 0
			this.turtle._y = 0		
			this.onFlag = 4
			this.onOverlay()
			this.onFlag = 0
			this.endTurtle()

			for(let i = this.$pickId+1;this.$stamps[i];i++){
				this.$stamps[i] = null
			}
		}
		*/

		//if(this.onAfterDraw){
		//	this.onAfterDraw()
		//}

		// mark draw clean
		//this.$drawClean = true
	}

	scrollAtDraw(dx, dy, delta){
		this.$scrollAtDraw = {
			x:delta?this.todo.xScroll+(dx||0):(dx||0),
			y:delta?this.todo.yScroll+(dy||0):(dy||0)
		}
		this.redraw()
	}

	onKeyDown(e){
		var name = e.name
		if(!name) return console.error("Strange", e)
		var prefix = ''
		var evname = 'onKey' + name.charAt(0).toUpperCase()+name.slice(1)
		if(this[evname]){
			if(!this[evname](e)){
				return true
			}
		}
	}

	scrollSize(x2, y2, x1, y1){
		var turtle = this.turtle
		if(x2 > turtle.x2) turtle.x2 = x2
		if(y2 > turtle.y2) turtle.y2 = y2
		if(x1 < turtle.x1) turtle.x1 = x1
		if(y1 < turtle.y1) turtle.y1 = y1
	}

	reuseDrawSize(){
		this.turtle.x2 = this.$x2Old
		this.turtle.y2 = this.$y2Old
	}

	$drawCleanFalse(){
		var node = this
		while(node){//}] && node.$drawClean){
			node.$drawClean = false
			node = node.parent
		}
	}

	// how do we incrementally redraw?
	redraw(){
		//if(this.$drawClean){
		this.$drawCleanFalse()
		if(this.app && !this.app.redrawTimer){
			this.app.redrawTimer = setImmediate(function(){
				this.$redrawViews()
				this.redrawTimer = undefined
			}.bind(this.app),0)
		}
		//}
	}

	setFocus(){
		var old = this.app.focusView
		//this.app.setWorkerKeyboardFocus()
		if(old !== this){
			this.app.focusView = this
			if(old) old.hasFocus = false
			this.hasFocus = true
			if(this.app.onFocusChange) this.app.onFocusChange(this, old)
		}
	}

	clearFocus(){
		var old = this.app.focusView		
		this.app.focusView = undefined
		if(old){
			old.hasFocus = false
		}
		if(this.app.onFocusChange) this.app.onFocusChange(undefined, old)
	}

	animateUniform(value){
		var timeMax = value[0] + value[1]
		if(timeMax > this.todo.timeMax) this.todo.timeMax = timeMax
	}

	static style(StyleClass){
		return StyleClass.apply(this)
	}
}