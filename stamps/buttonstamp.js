module.exports = require('stamp').extend(function ButtonStamp(proto){

	proto.props = {
		text:'Button',
		//w:50,
		//h:50
	}

	proto.inPlace = 1

	proto.tools = {
		Bg: require('shaders/rectshader').extend({
			color:'gray',
			padding:[10,10,10,10]
		}),
		Text: require('shaders/sdffontshader').extend({
			font:require('fonts/ubuntu_monospace_256.sdffont')
		})
	}

	proto.states = {
		default:{
			Bg:{color:'gray'}
		},
		hover:{
			tween:0.1,
			Bg:{color:'red'},
		}
	}

	proto.onFingerDown = function(){
		this.state = this.states.hover
	}

	proto.onFingerUp = function(){
		this.state = this.states.default
	}

	proto.onDraw = function(){
		this.beginBg(this)
		this.drawText({
			text:this.text
		})
		this.endBg()
	}

	proto.toolMacros = {
		draw:function(overload){
			this.$STYLESTAMP(overload)
			this.$DRAWSTAMP()
			return $stamp
		}
	}
})