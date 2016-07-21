module.exports = require('stamp').extend(function ButtonStamp(proto){

	proto.props = {
		text:'Hello',
		
	}

	proto.tools = {
		Bg: require('shaders/rectshader').extend({
			padding:[10,10,10,10],
			color:'gray',
			duration:0.3
		}),
		Text: require('shaders/sdffontshader').extend({
			font:require('fonts/ubuntu_monospace_256.sdffont'),
			duration:0.3
		})
	}

	proto.states = {
		normal:{
			Bg:{color:'red',duration:0.3}
		},
		hover:{
			Bg:{color:'blue',borderColor:'yellow',borderRadius:40,borderWidth:[5,0,5,0],padding:40,duration:0.3},
			Text:{duration:0.3, fontSize:35}
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