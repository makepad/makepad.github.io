module.exports = require('base/stamp').extend(function ButtonStamp(proto){

	proto.props = {
		text:'Button',
		icon:''
	}

	proto.inPlace = 1
	
	proto.tools = {
		Bg: require('tools/rect').extend({
			color:'gray',
			padding:[10,10,10,10]
		}),
		Text: require('tools/text').extend({
			font:require('fonts/ubuntu_monospace_256.font')
		}),
		Icon: require('tools/icon').extend({
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

	proto.onFingerDown = function(){
		this.state = this.states.clicked
	}

	proto.onFingerUp = function(e){
		this.state = this.states.default
		if(e.samePick && this.onClick) this.onClick(e)
	}

	proto.onFingerOver = function(){
		this.state = this.states.over
	}

	proto.onFingerOut = function(){
		this.state = this.states.default
	}

	proto.onDraw = function(){
		this.beginBg(this)
		if(this.icon){
			this.drawIcon({
				text:this.lookupIcon[this.icon]
			})
		}
		if(this.text){
			this.drawText({
				text:this.text
			})
		}
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