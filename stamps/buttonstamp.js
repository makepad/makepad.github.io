module.exports = require('stamp').extend(function ButtonStamp(proto){

	proto.props = {
		text:'Hello',
	}

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
			tween:0.3,
			Bg:{color:'gray'}
		},
		hover:{
			tween:0.3,
			Bg:{color:'blue',borderColor:'yellow',borderRadius:40,borderWidth:[5,0,5,0],padding:40},
			Text:{fontSize:35}
		}
	}

	proto.onFingerOver = function(){
		this.state = this.states.hover
	}

	proto.onFingerOut = function(){
		this.state = this.states.default
	}

	//margin,x/y/w/h
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