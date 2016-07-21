module.exports = require('stamp').extend(function ButtonStamp(proto){

	proto.props = {
		text:'Hello',
		padding:[10,10,10,10]
	}

	proto.tools = {
		Bg: require('shaders/rectshader').extend({
			color:'gray'
		}),
		Text: require('shaders/sdffontshader').extend({
			font:require('fonts/ubuntu_monospace_256.sdffont')
		})
	}

	proto.states = {
		normal:{
			Bg:{color:'red'}
		},
		hover:{
			Bg:{color:'blue'}
		}
	}

	proto.onFingerOver = function(){
		this.state = this.states.hover
	}

	proto.onFingerOut = function(){
		this.state = this.states.normal
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