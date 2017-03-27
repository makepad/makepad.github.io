module.exports = class Stamp extends require('base/class'){
	//var types = require('types')
	prototype(){

		this.wrapped = true

		this.mixin(
			require('base/props'),
			require('base/tools')
		)
		
		//this.onFlag0 = 1
		//this.onFlag1 = this.redraw

		this.props = {
			x:NaN,
			y:NaN,
			w:NaN,
			h:NaN,
			order:0,
			padding:[0,0,0,0],
			margin:[0,0,0,0],
			align:[0,0],
			down:0,
			queue:undefined,
			cursor:undefined,
			id:''
		}

		this.inheritable('verbs', function(){
			var verbs = this.verbs
			if(!this.hasOwnProperty('_verbs')) this._verbs = this._verbs?Object.create(this._verbs):{}
			for(let key in verbs) this._verbs[key] = verbs[key]
		})


		this.verbs = {
			draw: function(overload, click) {
				var stamp = this.ALLOCSTAMP(overload)
				if(stamp.onStyle) stamp.onStyle(overload)
				this.STYLESTAMP(stamp, overload)
				stamp.drawStamp(overload)
				return stamp
			}
		}
	}

	toLocal(msg){
		let view = this.view
		let out = view.toLocal(msg, true)
		out.x -= this.$x //- view.$x
		out.y -= this.$y //- view.$y
		if(this.moveScroll){
			out.x += view.todo.xScroll || 0
			out.y += view.todo.yScroll || 0
		}
		return out
	}


	redraw(){
		var view = this.view
		if(view) view.redraw()
	}

	ALLOCSTAMP(args, indent, className, scope){
		return 'this.view.$allocStamp('+args[0]+', "'+className+'", this)\n'
	}

	STYLESTAMP(args, indent, className, scope){
		var code = ''
		var props = this._props
		code += indent + 'var $v;if(($v=' + args[1] + '.state) !== undefined) '+args[0]+'.state = $v;\n'
		for(let key in props){
			code += indent + 'var $v;if(($v=' + args[1] + '.' + key + ') !== undefined) '+args[0]+'._'+key+' = $v;\n'
		}
		return code
	}

	wrap(){
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

	drawStamp(args){
		var view = this.view
		var $writeList = view.$writeList
		this.$writeStart = $writeList.length
		
		var turtle = this.turtle

		if(!this.wrapped){
			let pickId = turtle._pickId
			let order = turtle._order
			turtle._pickId = this.$pickId
			turtle._order = this._order
			this.onDraw(args)
			turtle._pickId = pickId
			turtle._order = order
		}
		else{
			turtle._margin = this._margin
			turtle._padding = this._padding
			turtle._align = this._align
			turtle._down = this._down
			turtle._wrap = this._wrap
			turtle._x = this._x
			turtle._y = this._y
			turtle._w = this._w
			turtle._h = this._h
			this.beginTurtle()
			this.turtle._pickId = this.$pickId
			this.turtle._order = this._order
			//var order = this.order
			//this.turtle._order = order !== 0? order: view.$order++
			this.onDraw(args)
			var ot = this.endTurtle()
			turtle.walk(ot)
		}
		this.$x = turtle._x
		this.$y = turtle._y
		this.$w = turtle._w
		this.$h = turtle._h
		this.$writeEnd = $writeList.length
		// lets store things on the stamp
		$writeList.push(this, -1, -1)
	}

	onCompileVerbs(){
		this.__initproto__()
	}
}