module.exports = function painterScroll(proto){

	proto.onConstructPainterScroll = function(){
		this.fingerInfo =  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
		this.isScrollBarMove = 0
		this.scrollDelta
	}

	proto.doScroll = function(todo, sx, sy){

		var xScroll = sx !== todo.xScroll?Math.min(Math.max(sx, 0), Math.max(0,todo.xTotal - todo.xView)):todo.xScroll
		var yScroll = sy !== todo.yScroll?Math.min(Math.max(sy, 0), Math.max(0,todo.yTotal - todo.yView)):todo.yScroll

		if(yScroll === -Infinity || xScroll === -Infinity) return
		if(xScroll !== todo.xScroll || yScroll !== todo.yScroll){
			todo.xScroll = xScroll
			todo.yScroll = yScroll
			this.postMessage({
				fn:'onScrollTodo',
				todoId:todo.todoId,
				x:xScroll,
				y:yScroll
			})
			this.requestRepaint()
			return true
		}
	}

	proto.processScrollState = function(todo){
		if(todo.yScrollTo !== undefined || todo.xScrollTo !== undefined){
			var ys = todo.yScroll
			if(todo.yScrollTo !== undefined){
				ys = (todo.yScroll*(1.-todo.scrollToSpeed) + todo.yScrollTo*todo.scrollToSpeed)
				if(Math.abs(todo.yScroll - todo.yScrollTo) < 1){
					todo.yScrollTo = undefined
				}
			}
			var xs = todo.xScroll
			if(todo.xScrollTo !== undefined){
				xs = (todo.xScroll*(1.-todo.scrollToSpeed) + todo.xScrollTo*todo.scrollToSpeed)
				if(Math.abs(todo.xScroll - todo.xScrollTo) < 1){
					todo.xScrollTo = undefined
				}
			}
			this.doScroll(todo, xs, ys)

			return true
		}

		if(todo.xScrollFlick !== 0 || todo.yScrollFlick !== 0){
			if(this.doScroll(todo, todo.xScroll + todo.xScrollFlick, todo.yScroll + todo.yScrollFlick)){
				if(Math.abs(todo.xScrollFlick) < 1) todo.xScrollFlick = 0
				if(Math.abs(todo.yScrollFlick) < 1) todo.yScrollFlick = 0
				todo.xScrollFlick *= todo.scrollMomentum
				todo.yScrollFlick *= todo.scrollMomentum
				return true
			}
			else{
				todo.xScrollFlick = 0
				todo.yScrollFlick = 0
			}
		}
	}

	proto.onFingerDown = function(f){

		if(f.workerId && f.workerId !== this.worker.workerId) return this.children[f.workerId].onFingerDown(f)


		var fingerInfo = this.fingerInfo
		var args = this.args
		var o = (f.digit - 1.) * 4

		fingerInfo[o + 0] = f.x - args.x
		fingerInfo[o + 1] = f.y - args.y
		fingerInfo[o + 2] = f.workerId * 256 + f.todoId
		fingerInfo[o + 3] = f.pickId

		// check if we are down on a scrollbar
		var todo = this.todoIds[f.todoId]
		if(!todo) return
		// mousedown on a scrollbar
		if(f.pickId === todo.yScrollId){
			// the position of the scrollbar
			var ysize = todo.yView
			var delta = ((f.y - todo.ysScroll) / todo.yView) * todo.yTotal - todo.yScroll
			if(delta < 0){
				todo.yScrollTo = Math.max(0,todo.yScroll - todo.yView)
				this.isScrollBarMove = 0
			}
			else if(delta > ysize){
				todo.yScrollTo = Math.min(Math.max(0.,todo.yTotal - todo.yView),todo.yScroll + todo.yView)
				this.isScrollBarMove = 0
			}
			else this.isScrollBarMove = 1
			this.scrollDelta = delta
		}
		else if(f.pickId === todo.xScrollId){
			// the position of the scrollbar
			var ysize = todo.xView
			var delta = ((f.x - todo.xsScroll) / todo.xView) * todo.xTotal - todo.xScroll

			if(delta < 0){
				todo.xScrollTo = Math.max(0,todo.xScroll - todo.xView)
				this.isScrollBarMove = 0
			}
			else if(delta > ysize){
				todo.xScrollTo = Math.min(Math.max(0.,todo.xTotal - todo.xView),todo.xScroll + todo.xView)
				this.isScrollBarMove = 0
			}
			else this.isScrollBarMove = 2
			this.scrollDelta = delta
		}
		else this.isScrollBarMove = 0

		this.requestRepaint()
	}

	proto.onFingerMove = function(f){
		if(f.workerId && f.workerId !== this.worker.workerId) return this.children[f.workerId].onFingerMove(f)
		var fingerInfo = this.fingerInfo
		var args = this.args
		// store finger pos
		var o = (f.digit-1) * 4
		fingerInfo[o+0] = f.x - args.x
		fingerInfo[o+1] = f.y - args.y

		if(f.tapCount > 0) return
		var todo = this.todoIds[f.todoId]
		if(!todo) return

		if(this.isScrollBarMove === 1){
			var ys = ((f.y - todo.ysScroll) / todo.yView)*todo.yTotal - this.scrollDelta
			this.doScroll(todo, todo.xScroll, ys)
			return
		}
		if(this.isScrollBarMove === 2){
			var xs =  ((f.x - todo.xsScroll) / todo.xView)*todo.xTotal -this.scrollDelta
			this.doScroll(todo,xs, todo.yScroll)
			return
		}

		// dont scroll
		if(!f.touch || f.pickId === todo.yScrollId || f.pickId === todo.xScrollId) return	
		if(todo.scrollMask >= 0 && f.pickId !== todo.scrollMask) return
		
		this.doScroll(todo, todo.xScroll + f.dx, todo.yScroll + f.dy)
	}

	proto.onFingerUp = function(f){
		//if(f.workerId && f.workerId !== service.workerId) return subWorkers[f.workerId].onFingerUp(f)
		var fingerInfo = this.fingerInfo
		var args = this.args
		this.requestRepaint()

		var o = (f.digit-1) * 4
		fingerInfo[o+0] = f.x - args.x
		fingerInfo[o+1] = f.y - args.y
		fingerInfo[o+2] = -(f.workerId*256 + f.todoId)
		fingerInfo[o+3] = f.pickId

		var todo = this.todoIds[f.todoId]
		if(!todo) return

		if(!f.touch || f.pickId === todo.yScrollId || f.pickId === todo.xScrollId) return
		// do a flick?
		todo.xScrollFlick = f.dx
		todo.yScrollFlick = f.dy
	}

	proto.onFingerHover = function(f){
		if(f.workerId && f.workerId !== this.worker.workerId) return this.children[f.workerId].onFingerHover(f)
		var fingerInfo = this.fingerInfo
		var args = this.args
		var o = (f.digit-1) * 4
		fingerInfo[o+0] = f.x - args.x
		fingerInfo[o+1] = f.y - args.y
		fingerInfo[o+2] = -(f.workerId*256 + f.todoId)
		fingerInfo[o+3] = f.pickId
		this.requestRepaint()
	}

	proto.onFingerWheel = function(f){
		if(f.workerId && f.workerId !== this.worker.workerId) return this.children[f.workerId].onFingerWheel(f)

		var todo = this.todoIds[f.todoId]
		if(!todo) return
		this.doScroll(todo, todo.xScroll + f.xWheel, todo.yScroll + f.yWheel)
	}
}