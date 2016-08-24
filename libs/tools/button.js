module.exports = require('base/stamp').extend(function ButtonStamp(proto){

	proto.props = {
		text:'Button'
	}

	proto.inPlace = 1
	
	proto.tools = {
		Bg: require('shaders/rectshader').extend({
			color:'gray',
			padding:[10,10,10,10]
		}),
		Text: require('shaders/fontshader').extend({
			font:require('fonts/ubuntu_monospace_256.font')
		})
	}

	proto.states = {
		default:{
			Bg:{color:'gray'}
		},
		click:{
			Bg:{color:'red'}
		}
	}

	proto.onFingerDown = function(){
		this.state = this.states.click
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