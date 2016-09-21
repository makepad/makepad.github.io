module.exports=require('base/drawapp').extend({
	tools:{
		Line:{
			lineWidth:2
		},
		Slider:require('tools/slider').extend({
			inPlace:0
		})
	},
	onDraw:function(){
		var v=this.drawSlider({
			w:200,
			h:30,
			range:[0,1],
		})
		for(let i=0;i<450;i++){
			this.drawLine({
				x:i,
				y:50*v.value*sin(-.1*i)+120
			})
		}
	}
})