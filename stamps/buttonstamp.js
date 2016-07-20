module.exports = require('stamp').extend(function ButtonStamp(proto){

	proto.props = {
		text:'Hello',
		padding:[10,10,10,10]
	}

	proto.tools = {
		Bg: require('shaders/rectshader').extend({
			color:'red'
		}),
		Text: require('shaders/sdffontshader').extend({
			font:require('fonts/ubuntu_monospace_256.sdffont')
		})
	}

	proto.onFingerDown = function(){
		
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