// simple drawing app
module.exports = require('base/view').extend(function Draw(proto){
	proto.props = {
		text:'',
		icon:''
	}

	proto.tools = {
		Button:require('tools/button').extend({
			onClick:function(){
				this.view.onClick()
			}
		})
	}
	
	proto.onClick = function(){

	}

	proto.onDraw = function(){
		this.drawButton({
			w:this.$w,
			h:this.$h,
			text:this.text,
			icon:this.icon
		})
	}
})