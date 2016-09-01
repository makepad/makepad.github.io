module.exports = require('base/stamp').extend(function Split(proto){

	proto.props = {}
	proto.inPlace = 1

	proto.tools = {
		Bg: require('tools/rect').extend({
			borderRadius:1,
			color:'gray',
		})
	}

	proto.states = {
		default:{
			Bg:{color:'gray'}
		},
		clicked:{
			Bg:{color:'red'}
		}
	}

	proto.onFingerDown = function(e){
		this.xStart = e.xView
		this.yStart = e.yView
		this.state = this.states.clicked 
	}

	proto.onFingerMove = function(e){
		if(this.view.onSplitMove){
			e.xSplit = e.xView - this.xStart
			e.ySplit = e.yView - this.yStart
			this.view.onSplitMove(e)
		}
	}

	proto.onFingerUp = function(){ this.state = this.states.default }
	proto.onFingerOver = function(){ this.state = this.states.over }
	proto.onFingerOut = function(){ this.state = this.states.default }

	proto.onDraw = function(){
		this.drawBg(this)
	}

	proto.toolMacros = {
		draw:function(overload){
			this.$STYLESTAMP(overload)
			this.$DRAWSTAMP()
			return $stamp
		}
	}
})