module.exports = require('base/stamp').extend(function ScrollBarStamp(proto){

	proto.props = {
		text:'Button',
	}

	proto.tools = {
		ScrollBar: require('tools/quad').extend({
			color:'red'
		})
	}

	proto.onFingerDown = function(){
		this.state = this.styles.hover
	}

	proto.onFingerUp = function(){
		this.state = this.styles.default
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