//var painter = require('painter')
//var fingers = require('fingers')
var painter = require('services/painter')
var fingers = require('services/fingers')
var mat4 = require('base/mat4')
var vec4 = require('base/vec4')
var types = require('base/types')

module.exports = class View extends require('base/class'){

	prototype(){
		this.mixin(
			require('base/states'),
			require('base/tools'),
			require('base/styles')
		)
		
		this.inheritable('props', function(){
			var props = this.props
			for(let key in props){
				this.$defineProp(key, props[key])
			}
		})

		this.viewClip = [-50000,-50000,50000,50000]

		this.props = {
			heavy:true,
			visible:true,
			x:NaN,
			y:NaN,
			z:NaN,
			w:NaN,
			h:NaN,
			d:NaN,
			order:0,
			xOverflow:'scroll',
			yOverflow:'scroll',
			xCenter:0.5,
			yCenter:0.5,
			xScale:1,
			yScale:1,
			clip:true,
			rotate:0,
			time:0,
			wrapped:true,
			frameId:0,
			margin:[0,0,0,0],
			padding:[0,0,0,0],
			align:[0,0],
			down:0,
			wrap:1
		}

		this.tools = {
			Debug:require('shaders/quad'),
			Pass:require('shaders/quad').extend({
				props:{
					colorSampler:{kind:'sampler', sampler:painter.SAMPLER2DNEAREST},
					pickSampler:{kind:'sampler', sampler:painter.SAMPLER2DNEAREST}
				},
				verbs:{
					begin:null,
					end:null,					
				},
				pixelMain(){$
					if(this.pickPass > .5){
						gl_FragColor = texture2D(this.pickSampler, vec2(this.mesh.x, 1.-this.mesh.y))
					}
					else{
						gl_FragColor = texture2D(this.colorSampler, vec2(this.mesh.x, 1.-this.mesh.y))
					}
				}
			})
		}

	
		this.verbs = {
			draw:function(overload){
				var id = overload.id
				if(!this.$views) this.$views = {}
				var view = this.$views[id]
				if(!view){
					this.$views[id] = view = new this.NAME(this, overload)
				}
				else if(view.constructor !== this.NAME) throw new Error('View id collision detected' + id)
				
				view.draw(this, overload)
				return view
			}
		}

		this.blendingEquation = [painter.ONE, painter.FUNC_ADD, painter.ONE_MINUS_SRC_ALPHA, painter.ONE, painter.FUNC_ADD, painter.ONE_MINUS_SRC_ALPHA]
		this.constantColor = undefined
		this.depthFunction =  painter.GREATER
	}

	constructor(owner, overload){
		super()
		// ok how do i get the 'name' of the thing
		//console.log(this.constructor.name)

		if(overload){
			for(var key in overload){
				var value = overload[key]
				if(this.__lookupSetter__(key)){
					this['_'+key] = value
				}
				else {
					this[key] = value
				}
			}
		}

		var app
		if(owner){
			this.owner = owner
			this.app = app = owner.app
			// store our view on the owner
			if(!owner.$ownedViews) owner.$ownedViews = {}
			owner.$ownedViews[this.id] = this
		}
		else{
			app = this
		}
 		
		// Allocate a pickId from the app
		if(!this.pickId){
			var pickId = app.$pickFree.pop()
			if(!pickId) app.$pickIds[pickId = app.$pickAlloc++] = this
			else app.$pickIds[pickId] = this
			// store our numeric id
			this.pickId = pickId
		}
	}
	
	allocPickId(prop, set){
		if(!this.pickIds) this.pickIds = {}
		var app = this.app
		var pickId = app.$pickFree.pop()
		if(!pickId) app.$pickIds[pickId = app.$pickAlloc++] = this
		else app.$pickIds[pickId] = this
		this.pickIds[pickId] = prop
		if(set) this.turtle._pickId = pickId
		return pickId
	}
	
	freePickIds(){
		var pickFree = this.app.$pickFree
		for(var key in this.pickIds){
			pickFree.push(parseInt(key))
		}
		this.pickIds = {}
	}

	destroy(){
		if(this.destroyed) return
		this.destroyed = true

		if(this.onDestroy) this.onDestroy()

		// destroy owned views
		var ownedViews = this.$ownedViews
		for(let key in ownedViews){
			ownedViews[key].destroy()
		}

		this.app.$pickFree.push(this.pickId)
		
		this.pickId = undefined

		// clean out resources
		if(this.$todos) for(var i = 0; i < this.$todos.length; i++){
			var todo = this.$todos[i]
			todo.destroyTodo()
			recurDestroyShaders(todo.$shaders)
		}

		// destroy framebuffers
		for(var name in this.$renderpasses){
			var pass = this.$renderpasses[name]
			this.$renderpasses[name] = undefined
			if(pass.color0) pass.color0.destroyTexture()
			if(pass.pick) pass.pick.destroyTexture()
			if(pass.depth) pass.depth.destroyTexture()
			pass.framebuffer.destroyFramebuffer()
		}
		// remove it
		if(this.owner) delete this.owner.$ownedViews[this.id]
	}

	setState(state, queue, props){
		this.state = state
		// alright now what. now we need to change state on our range.
		
		// grab our 0'th todo
		var todo = this.$mainTodo

		let time = this.app.getTime()

		let writes = todo.$writes
		for(let i = this.$writeStart; i < this.$writeEnd; i+=3){
			let mesh = writes[i]
			let start = writes[i+1]
			let end = writes[i+2]

			if(!mesh || start === -1) continue

			let shaderProto = mesh.shader.shaderProto
			let info = shaderProto.$compileInfo
			let slots = mesh.slots

			let instanceProps = info.instanceProps
			let array = mesh.array
			for(let j = start; j < end; j++){
				let o = j * slots

				if(props) for(let key in props){
					let prop = instanceProps['thisDOT'+key]
					if(!prop) continue
					if(prop.config.pack || prop.slots > 1) throw new Error("Implement propwrite for packed/props with more than 1 slot")
					let off = prop.offset
					if(prop.hasFrom) off += prop.slots
					array[o + off] = props[key]
				}
				var total = shaderProto.setState(state, queue, time, array, j, array, j)
				//console.log("HI", total, queue)
				if(total > todo.timeMax) todo.timeMax = total
			}
			// alright so how do we declare this thing dirty
			if(!mesh.dirty){
				mesh.updateMesh()
				mesh.dirty = true
			}
		}
		todo.updateTodoTime()
	}

	$moveWritten(start, dx, dy){
		var writes = this.todo.$writes
		for(var i = start; i < writes.length; i += 3){
			var props = writes[i]
			var begin = writes[i + 1]
			if(begin < 0){ // its a view
				// move the view
				//console.log("MOVE", dx, dy)
				props.$x += dx
				props.$y += dy
				continue
			}
			var end = writes[i + 2]
			var slots = props.slots
			var xoff = props.xOffset
			var yoff = props.yOffset
			var array = props.array
			for(var j = begin; j < end; j++){
				array[j * slots + xoff] += dx
				array[j * slots + yoff] += dy
 			}
		}
	}	



	// Turtle management



	beginTurtle(ref){
		var outer = this.turtle
		if(ref){
			// set input props
			outer._margin = ref.margin
			outer._padding = ref.padding
			outer._align = ref.align
			outer._down = ref.down
			outer._wrap = ref.wrap
			outer._x = ref.x
			outer._y = ref.y
			outer._w = ref.w
			outer._h = ref.h
		}
		// add a turtle to the stack
		var ts = this.app.$turtleStack

		// use the turtlestack as alloc cache
		var len = ts.len++
		var turtle = this.turtle = ts[len]
		if(!turtle){
			turtle = this.turtle = ts[len] = new this.app.Turtle(this)
		}

		//forward pickId inwards
		turtle.view = this
		turtle._pickId = outer._pickId
		turtle._order = outer._order
		turtle.begin(outer)

		return outer
	}

	endTurtle(doBounds){
		// call end on a turtle and pop it off the stack
		this.turtle.end(doBounds)
		// pop the stack
		var ts = this.app.$turtleStack
		ts.len--
	
		// pop the turtle
		var inner = this.turtle
		this.turtle = inner.outer

		// walk it
		this.turtle.walk(inner)

		return inner
	}

	lineBreak(){
		this.turtle.lineBreak()
	}



	// todo mgmt



	// begin a todo, and a turtle (since its a scrollable area)
	beginTodo(ref){
		var todoCt = this.$todoCounter++
		if(!this.$todos) this.$todos = []
		var todo = this.$todos[todoCt] 

		if(!todo){ // make a new todo
			todo = this.$todos[todoCt] = new painter.Todo()
			todo.onFinalizeTodoOrder = this.onFinalizeTodoOrder.bind(this)
			var todoUboDef = this.Pass.prototype.$compileInfo.uboDefs.todo
			todo.todoUbo = new painter.Ubo(todoUboDef)//this.$todoUboDef)

			todo.$view = this
			todo.$writes = []
			todo.$shaders = {}
			todo.$viewClip = []
			todo.$viewPosition = mat4.create()
			todo.$viewInverse = mat4.create()
			todo.$viewTotal = mat4.create()

			// lets check if we need to connect it to the main framebuffer
			if(todoCt === 0 && this.app === this){
				painter.mainFramebuffer.assignTodoAndUbo(todo, this.$painterUbo)
			}
		}
		else{
			// reset writes
			todo.$writes.length = 0
		}


		var parent = this.todo
		todo.$parent = parent

		// copy over the props used to calc the matrix
		todo.$xCenter = ref.xCenter
		todo.$yCenter = ref.yCenter
		todo.$xScale = ref.xScale
		todo.$yScale = ref.yScale
		todo.$rotate = ref.rotate

		this.todo = todo

		// push the todo into the parent
		if(parent){
			parent.$writes.push(todo, -1, -1)
			parent.beginOrder(ref.order)
			parent.addChildTodo(todo)
			parent.endOrder()
		}

		// set up our stuff
		todo.clearTodo()
		todo.blending(ref.blendingEquation, ref.constantColor)
		todo.depthTest(ref.depthFunction, true)
		if(todoCt === 0 && this.app === this){
			todo.clearColor(0.2, 0.2, 0.2, 1)
		}
		var turtle = this.turtle
		turtle._turtleClip = [-50000,-50000,50000,50000]
		
		this.beginTurtle(ref)

		var nt = this.turtle

		// make turtle relatively positioned
		nt.wx -= turtle.wx
		nt.wy -= turtle.wy
		nt.sx -= turtle.wx
		nt.sy -= turtle.wy
		todo.$x = turtle.wx //+ turtle.$xAbs
		todo.$y = turtle.wy//+ turtle.$yAbs

		var clip = todo.$viewClip
		clip[0] = -50000
		clip[1] = -50000
		clip[2] = 50000
		clip[3] = 50000

		if(ref.clip){
			let pad = nt.padding
			if(!isNaN(this.turtle.width)){
				clip[0] = pad[3]
				clip[2] = this.turtle.width+pad[3]
			}
			if(!isNaN(this.turtle.height)){
				clip[1] = pad[0]
				clip[3] = this.turtle.height+pad[0]
			}
		}
	}	
	
	// end the todo, end the turtle, manage scrollbars
	endTodo(ref){
		var turtle = this.turtle
		var todo = this.todo

		// store our computed coords on the todo
		// needed for the matrix stack stuff.
		todo.$w = turtle.wBound()
		todo.$h = turtle.hBound()
		
		todo.$vw = turtle.x2// - nt.$xAbs //- turtle._margin[3]
		todo.$vh = turtle.y2// - nt.$yAbs //- turtle._margin[0]
		todo.$xReuse = turtle.x2
		todo.$yReuse = turtle.y2
		// drawing scrollbars?
		this.$drawScrollBars(todo.$w, todo.$h, todo.$vw, todo.$vh, ref)

		this.endTurtle()

		this.todo = todo.parent

		// lets do scrollbars for the area

	}

	toLocal(msg, noScroll){
		var xy = [0,0,0,0]
		vec4.transformMat4(xy, [msg.x, msg.y, 0, 1.], this.$mainTodo.$viewInverse)
		var ret = {
			x:xy[0] + (noScroll?0:(this.$mainTodo.xScroll || 0)),
			y:xy[1] + (noScroll?0:(this.$mainTodo.yScroll || 0))
		}
		ret.x -= this.$x
		ret.y -= this.$y
		return ret
	}


	// lets compute the matrix stack from the todo stack




	// how do we incrementally redraw?
	redraw(force){
		var node = this
		while(node){
			node.$dirty = true
			node = node.parent
		}
		let app = this.app
		if(app && !app.redrawTimer) app._redraw(force)
	}
	
	layout(){
		return {
			margin:this._margin,
			align:this._align,
			down:this._down,
			x:this._x,
			y:this._y,
			w:this._w,
			h:this._h,
		}
	}

	draw(parent, overload){
		//if(!parent) throw new Error('Please pass in parent when drawing a view')
		var todo
		if(parent){
			this.parent = parent
			this.turtle = parent.turtle
			todo = this.todo = parent.todo
		}
		else{
			this.turtle = this.$appTurtle
		}
		this.time = this.app.time
		this.frameId = this.app.frameId
		//this._order = 0.
		this.$todoCounter = 0
		
		if(this.onStyle) this.onStyle(overload)
				
		if(overload){
			for(var key in overload){
				var value = overload[key]
				var old = this[key]
				if(value !== this[key]){
					this[key] = value
					this.$dirty = true
				}
			}
		}

		if(!this.visible) return // dont do anything

		if(this.heavy){ // heavy views have their own todo
			
			// dirty check to bail on drawing for incremental
			var mainTodo = this.$mainTodo
			var check = this.$dirtyCheck
			var turtle = this.turtle
			var parent = this.todo
			if(!check) this.$dirtyCheck = check = {}
			if(mainTodo && 
			  !this.$dirty &&
			  check.width === turtle.width &&  
			  check.height === turtle.height &&
			  check.w === this.w &&  
			  check.h === this.h &&
			  check.wx === turtle.wx &&
			  check.wy === turtle.wy){
				// lets just walk the turtle
				// and not run draw
				turtle._margin = this.margin
				turtle._padding = this.padding
				turtle._align = this.align
				turtle._down = this.down
				turtle._wrap = this.wrap
				turtle._x = this.x
				turtle._y = this.y
				turtle._w = mainTodo.$w // for computed size last time
				turtle._h = mainTodo.$h
				turtle.walk()
				// lets add our todo to the parent
				if(parent){
					parent.$writes.push(mainTodo, -1, -1)
					parent.beginOrder(this.order)
					parent.addChildTodo(mainTodo)
					parent.endOrder()
				}
				return
			}
			// store our current state checking against
			check.w = this.w
			check.h = this.h
			check.wx = turtle.wx
			check.wy = turtle.wy
			check.width = turtle.width
			check.height = turtle.height
		
			this.beginTodo(this)
		}
		else {
			// push the shaders slot

			var shaders = todo.$shaders
			todo.$shaders = todo.$shaders[this.constructor.toolName] || 
						(todo.$shaders[this.constructor.toolName] = {})
			// write this
			this.todo.$writes.push(this, -1, -1)

			// begin our own turtle
			if(this.wrapped){
				this.beginTurtle(this)
			}
		}

		// set our pickid
		var oldPick = this.turtle._pickId
		this.turtle._pickId = this.pickId

		// store our main todo
		this.$mainTodo = this.todo
		this.$writeStart = this.todo.$writes.length

		this.$dirty = false
		if(this.onDraw){
			this.onDraw()
		}

		this.$writeEnd = this.todo.$writes.length

		if(this.heavy){
			this.endTodo(this)
			this.$x = 0
			this.$y = 0
			this.$w = this.$mainTodo.$w
			this.$h = this.$mainTodo.$h
		}
		else{
			// pop the shaders slot
			todo.$shaders = shaders
			if(this.wrapped){
				this.endTurtle()
			}
			this.$x = this.turtle._x
			this.$y = this.turtle._y
			this.$w = this.turtle._w
			this.$h = this.turtle._h
		}

		this.todo = undefined
		this.turtle._pickId = oldPick
	}

	$allocShader(classname, order){
		var shaders = this.todo.$shaders
		var proto = new this[classname]()
		
		var info = proto.$compileInfo
		var shaderOrder = shaders[classname] || (shaders[classname] = {})

		var shader = shaderOrder[order] = new painter.Shader(info)
	
		var litDef = info.uboDefs.literals
		var litUbo = shader.$literalsUbo = new painter.Ubo(info.uboDefs.literals)
		
		// lets fill the literals ubo
		for(var litKey in litDef){
			if(litKey.indexOf('_litFloat') === 0){
				litUbo.vec4(painter.nameId(litKey), litDef[litKey].value)
			}
			else{
				litUbo.ivec4(painter.nameId(litKey), litDef[litKey].value)
			}
		}

		shader.$drawUbo = new painter.Ubo(info.uboDefs.draw)
		shader.shaderProto = proto
		var props = shader.$props = new painter.Mesh(info.propSlots)
		props.shader = shader
		props.order = order
		props.hook = this
		// create a vao
		var vao = shader.$vao = new painter.Vao(shader)

		// initialize the VAO
		var geometryProps = info.geometryProps
		var attrbase = painter.nameId('ATTR_0')
		var attroffset = Math.ceil(info.propSlots / 4)

		vao.instances(attrbase, attroffset, props)

		var attrid = attroffset
		// set attributes
		for(let key in geometryProps){
			var geom = geometryProps[key]
			var attrRange = ceil(geom.type.slots / 4)
			vao.attributes(attrbase + attrid, attrRange, proto[geom.name])
			attrid += attrRange
		}

		// check if we have indice
		if(proto.indices){
			vao.indices(proto.indices)
		}

		props.name = this.id + "-"+classname
		var xProp = info.instanceProps.thisDOTx
		props.xOffset = xProp && xProp.offset
		var yProp = info.instanceProps.thisDOTy 
		props.yOffset = yProp && yProp.offset

		props.transferData = proto.transferData
		return shader
	}

	$drawScrollBars(wx, wy, vx, vy, ref){
		if(!this.ScrollBar) this.ScrollBar = this.app.ScrollBar

		// store the draw width and height for layout if needed
		var tw = wx//this.$wDraw = turtle._w
		var th = wy//this.$hDraw = turtle._h
		var xOverflow = ref.xOverflow
		var yOverflow = ref.yOverflow
		var addHor, addVer
		var sbSize = this.ScrollBar.prototype.scrollBarSize
		// lets compute if we need scrollbars
		if(vy > th){
			addVer = true
			if(xOverflow === 'scroll') tw -= sbSize
			if(vx > tw) th -= sbSize, addHor=true // add vert scrollbar
		}
		else if(vx > tw){
			addHor = true
			if(yOverflow === 'scroll') th -= sbSize
			if(vy > th) tw -= sbSize, addVer = true
		}

		// view heights for scrolling on the todo
		var todo = this.todo

		todo.scrollMask = 0
		todo.xTotal = vx
		todo.xView = tw
		todo.yTotal = vy
		todo.yView = th
		todo.scrollMomentum = 0.92
		todo.scrollToSpeed = 0.5
		let xScroll = todo.xScroll
		let yScroll = todo.yScroll
		if(xOverflow === 'scroll'){
			if(addHor){//th < this.$hDraw){
				this.lineBreak()
				
				if(!this.$xScroll) this.$xScroll = new this.ScrollBar(this,{
					id:'hscroll',
					moveScroll:0,
					vertical:false,
					x:'0',
					y:'@0',
					w:'100%',
					h:sbSize,// / painter.pixelRatio,
				})
				this.$xScroll.draw(this)
				
				todo.scrollMinSize = this.ScrollBar.prototype.ScrollBar.prototype.scrollMinSize

				this.todo.xScrollId = this.$xScroll.pickId
				if(this.onScroll) this.todo.onScroll = this.onScroll.bind(this)
			}
			else if(todo.xScroll > 0){
				todo.scrollTo(0,undefined,-1)
			}
			// lets clamp our scroll positions
			xScroll = clamp(xScroll,0,max(0,todo.xTotal - todo.xView))
		}
		if(yOverflow === 'scroll'){
			if(addVer){//tw < this.$wDraw){ // we need a vertical scrollbar
				if(!this.ScrollBar) this.ScrollBar = this.app.ScrollBar
				if(!this.$yScroll) this.$yScroll = new this.ScrollBar(this,{
					id:'vscroll',
					moveScroll:0,
					vertical:true,
					x:'@0',
					y:'0',
					w:sbSize,// / painter.pixelRatio,
					h:'100%',
				})
				
				this.$yScroll.draw(this)

				todo.scrollMinSize = this.ScrollBar.prototype.ScrollBar.prototype.scrollMinSize

				this.todo.yScrollId = this.$yScroll.pickId
				if(this.onScroll) this.todo.onScroll = this.onScroll.bind(this)
			}
			else if(todo.yScroll > 0){
				todo.scrollTo(undefined,0,-1)
			}
			yScroll = clamp(yScroll,0,max(0,todo.yTotal - todo.yView))
		}
		if(xScroll !== todo.xScroll || yScroll !== todo.yScroll){
			todo.scrollTo(xScroll, yScroll, -1)
		}
	}

	isScrollBar(pickId){
		if(this.$xScroll && this.$xScroll.pickId === pickId) return true
		if(this.$yScroll && this.$yScroll.pickId === pickId) return true
		return false
	}

	// called by painter to finalize a todo
	onFinalizeTodoOrder(todo){
		// trigger a not drawn callback so system can 
		// process things not drawing
		var props = todo.props
		var props2 = todo.props2
		for(let i = 0, l = props2.length; i < l; i++){
			var lastProp = props2[i]
		
			if(props.indexOf(lastProp) === -1 ){ // we didnt use props at all
				lastProp.flip(true)
			}

			// otherwise we have to see if we have a destroy state
			var shaderProto = lastProp.shader.shaderProto
			var order = lastProp.order
			var drawUbo = lastProp.shader.$drawUbo

			if(shaderProto.states && shaderProto.states.destroy){
				// has destroy state. lets process it.
			}
			// set the lazy uniforms
			for(var key in this.lazyUniforms){
				var propName = 'thisDOT'+key
				var propType = drawUbo.layout[propName]
				if(propType){
					drawUbo[propType.type.name+'s'](propName, this[key])
				}
			}
		}
	}




	// drawpass handling



	beginPass(options){
		let w = options.w
		let h = options.h

		if(typeof w === 'string'){
			this.turtle._margin = zeroMargin
			w = this.turtle.evalw(w, this)
		}
		if(typeof h === 'string'){
			this.turtle._margin = zeroMargin
			h = this.turtle.evalh(h, this)
		}
		if(w === undefined) w = this.$mainTodo.$w
		if(h === undefined) h = this.$mainTodo.$h
		if(isNaN(w)) w = 1
		if(isNaN(h)) h = 1
		let pixelRatio = options.pixelRatio || painter.pixelRatio
		
		var sw = w * pixelRatio
		var sh = h * pixelRatio

		let id = options.id
		// and the todo is forked out
		if(!this.$renderPasses) this.$renderPasses = {}
		var pass = this.$renderPasses[id] 

		if(!pass){ // initialize the buffers for the pass
			pass = this.$renderPasses[id] = {}
			pass.color0 = new painter.Texture({
				format:painter.RGBA, 
				type:options.colorType || painter.UNSIGNED_BYTE, 
				flags:0, 
				w:0, 
				h:0
			})
			if(options.pick) pass.pick = new painter.Texture({
				format:painter.RGBA, 
				type:painter.UNSIGNED_BYTE, 
				flags:0, 
				w:0, 
				h:0
			})
			if(options.depth) pass.depth = new painter.Texture({
				format:painter.DEPTH, 
				type:painter.UNSIGNER_SHORT, 
				flags:0, 
				w:0, 
				h:0
			})
			pass.framebuffer = new painter.Framebuffer(sw, sh,{
				color0:pass.color0,
				pick:pass.pick,
				depth:pass.depth,
			})
			var todo = new painter.Todo()

			todo.onFinalizeTodoOrder = this.onFinalizeTodoOrder.bind(this)
			var todoUboDef = this.Pass.prototype.$compileInfo.uboDefs.todo
			todo.todoUbo = new painter.Ubo(todoUboDef)
			pass.todo = todo

			pass.todo.viewId = 'surface-' + (this.id || this.constructor.name)
			pass.projection = mat4.create()
			pass.w = w
			pass.h = h
			mat4.ortho(pass.projection, 0, pass.w, 0, pass.h, -100, 100)
			// assign the todo to the framebuffe
			pass.framebuffer.assignTodoAndUbo(pass.todo, this.app.$painterUbo)

			if(options.dx !== undefined || options.dy !== undefined){
				let pp = this.$positionedPasses
				if(!pp) this.$positionedPasses = pp = []
				pp.push(pass)	
			}
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
			//pass.sx = this.$xAbs
			//pass.sy = this.$yAbs
			pass.w = w
			pass.h = h
			pass.sw = sw
			pass.sh = sh
			mat4.ortho(pass.projection,0, pass.w,  0,pass.h, -100, 100)
		}
		pass.dx = options.dx || 0
		pass.dy = options.dy || 0
		return pass
	}
	
	endPass(){
		// stop the pass and restore our todo
		this.todo = this.$todoStack.pop()
	}

	transferFingerMove(digit){
		this.app.transferFingerMove(
			digit, 
			this.pickId
		)
	}


	// Find view with id


	// breadth first find child by name
	find(id){
		var views = this.$ownedViews
		if(id.constructor === RegExp){
			for(let key in views)	{
				if(key.match(id)) return views[key]
			}
		}
		else{
			for(let key in views)	{
				if(key === id) return views[key]
			}
		}
		for(let key in views)	{
			let res = views[key].find(id)
			if(res) return res
		}
	}

	// depth first find all
	findAll(id, set){
		if(!set) set = []
		if(id.constructor === RegExp){
			if(typeof this.id === 'string' && this.id.match(id)) set.push(this)
		}
		else{
			if(this.id == id) set.push(this)
		}
		var views = this.$ownedViews
		for(let key in views)	{
			let child = views[key]
			child.findAll(id, set)
		}
		return set
	}

	findInstances(cons, set){
		if(!set) set = []
		if(this instanceof cons) set.push(this)
		var views = this.$ownedViews
		for(let key in views){
			views[key].findInstances(cons, set)
		}
		return set
	}



	// Scroll API



	scrollIntoView(x, y, w, h,scrollToSpeed){
		// we figure out the scroll-to we need
		var todo = this.$mainTodo
		var sx = todo.xScroll, sy = todo.yScroll
		if(x < todo.xScroll) sx = max(0., x)
		if(x+w > todo.xScroll + todo.xView) sx = clamp(0.,x + w - todo.xView, todo.xTotal - todo.xView)
		if(y < todo.yScroll) sy = max(0., y)
		if(y+h > todo.yScroll + todo.yView) sy = clamp(0.,y + h - todo.yView, todo.yTotal - todo.yView)
		todo.scrollTo(sx, sy,scrollToSpeed)
	}

	scrollTo(x, y, scrollToSpeed){
		var todo = this.$mainTodo
		todo.scrollTo(x,y,scrollToSpeed)
	}

	scrollMode(scrollMode){
		var todo = this.$mainTodo
		todo.scrollMode = scrollMode
	}

	scrollArea(x,y,w,h){
		var todo = this.$mainTodo
		todo.xVisible = x
		todo.yVisible = y
		todo.wVisible = w
		todo.hVisible = h
	}

	scrollAtDraw(dx, dy, delta){
		var todo = this.$mainTodo
		this.$scrollAtDraw = {
			x:delta?todo.xScroll+(dx||0):(dx||0),
			y:delta?todo.yScroll+(dy||0):(dy||0)
		}
		this.redraw()
	}

	scrollSize(x2, y2, x1, y1){
		var turtle = this.turtle
		if(x2 > turtle.x2) turtle.x2 = x2
		if(y2 > turtle.y2) turtle.y2 = y2
		if(x1 < turtle.x1) turtle.x1 = x1
		if(y1 < turtle.y1) turtle.y1 = y1
	}

	reuseDrawSize(){
		this.turtle.x2 = this.$mainTodo.$xReuse
		this.turtle.y2 = this.$mainTodo.$yReuse
	}


	// Focus handling


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

	onFingerDown(){
		this.setFocus()
	}

	hasFocus(){
		return this === this.app.$focusView
	}

	setFocus(){
		var old = this.app.$focusView
		//this.app.setWorkerKeyboardFocus()
		if(old !== this){
			this.app.$focusView = this
			if(old && old.onClearFocus) old.onClearFocus(this)
			if(this.onSetFocus) this.onSetFocus(old)
			if(this.app.onFocusChange) this.app.onFocusChange(this, old)
		}
	}

	clearFocus(){
		var old = this.app.$focusView		
		this.app.$focusView = undefined
		if(old && old.onClearFocus){
			old.onClearFocus(undefined)
		}
		if(this.app.onFocusChange) this.app.onFocusChange(undefined, old)
	}

	
	$defineProp(key, value){
		if(!this.hasOwnProperty('_props')){
			this._props = this._props?Object.create(this._props):{}
		}

		var config = value
		if(typeof config !== 'object' || !config || config.constructor !== Object){
			config = {value:config}
		}

		var old = this._props[key]
		if(old){
			for(let key in old) if(!(key in config)){
				config[key] = old[key]
			}
		}

		this._props[key] = config
		if(config.value !== undefined) this[key] = config.value
	}

	// Parse color



	parseColor(str, alpha){
		var out = []
		if(!types.colorFromString(str, alpha, out, 0)){
			console.log("Cannot parse color" + str)
		}
		return out
	}

	$parseColor(str, alpha, a, o){
		if(!types.colorFromString(str, alpha, a, o)){
			console.log("Cannot parse color "+str)
		}
	}

	$parseColorPacked(str, alpha, a, o){
		if(!types.colorFromStringPacked(str, alpha, a, o)){
			console.log("Cannot parse color "+str)
		}
	}

	onCompileVerbs(){
		this.__initproto__()
	}
}

var zeroMargin = [0,0,0,0]
var identityMat4 = mat4.create()

// destroy helper fn
function recurDestroyShaders(node){
	for(var key in node){
		var shader = node[key]
		node[key] = undefined
		if(shader.constructor === Object){
			recurDestroyShaders(shader)
			continue
		}
		shader.$drawUbo.destroyUbo()
		shader.$vao.destroyVao()
		shader.$props.destroyMesh()
		shader.destroyShader()
	}
}

module.exports.recomputeTodoMatrices = function recomputeTodoMatrices(todo, px, py){

	var hw = todo.$w * todo.$xCenter
	var hh = todo.$h * todo.$yCenter
	let rx = todo.$x// - px
	let ry = todo.$y// - py
	let ax = todo.$ax = rx + px
	let ay = todo.$ay = ry + py

	mat4.fromTSRT(todo.$viewPosition, -hw, -hh, 0, todo.$xScale, todo.$yScale, 1., 0, 0, radians(todo.$rotate), hw + rx, hh+ry, 0)

	if(todo.$parent){
		mat4.multiply(todo.$viewTotal, todo.$parent.$viewPosition, todo.$viewPosition)
		mat4.invert(todo.$viewInverse, todo.$viewTotal)
		//if(!this.parent.surface){
		mat4.multiply(todo.$viewPosition, todo.$parent.$viewPosition, todo.$viewPosition)
		//}
	}

	// set the start of the scroll
	todo.xsScroll = ax + painter.x 
	todo.ysScroll = ay + painter.y 

	//TODO FIX THIS
	//console.log(painter.y)
	let pp = todo.$view && todo.$view.$positionedPasses
	if(pp){
		for(let i = 0 ;i < pp.length;i++){
			pp[i].framebuffer.position(ax+painter.x + pp[i].dx, ay+painter.y + pp[i].dy)
		}
	}

	// lets set some globals
	var todoUbo = todo.todoUbo
	todoUbo.mat4(painter.nameId('thisDOTviewPosition'), todo.$viewPosition)
	todoUbo.mat4(painter.nameId('thisDOTviewInverse'), todo.$viewInverse)

	var children = todo.children
	var todoIds = todo.todoIds
	for(var i = 0, l = children.length; i < l; i++){
		var childTodo = todoIds[children[i]]
		if(!childTodo) continue
		recomputeTodoMatrices(childTodo, ax, ay)
	}
}