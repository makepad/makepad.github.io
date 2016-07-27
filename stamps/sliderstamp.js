module.exports = require('stamp').extend(function ScrollBarStamp(proto){

	proto.props = {
		text:'Button',
	}

	proto.tools = {
		ScrollBar: require('shaders/quadshader').extend({
			color:'red'
		})
	}

	proto.onFingerDown = function(){
		this.state = this.states.hover
	}

	proto.onFingerUp = function(){
		this.state = this.states.default
	}

	proto.onDraw = function(){
		this.drawScrollBar(this)
	}

	proto.toolMacros = {
		draw:function(overload){
			this.$STYLESTAMP(overload)
			this.$DRAWSTAMP()
			return $stamp
		}
	}
})