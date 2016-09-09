function $P(id, arg){
	// we can interact with the editor in the other thread.
	// console.log(arg)
	// how do we re-render?... what does it mean to update a value?
	// if its in shader we can just redraw
	// if its in a class we have to reinitialize the class
	// so it depends
	return arg
}

module.exports = require('base/view').extend({
	name:'Probes',
	props:{
	},
	padding:[0,0,0,0],
	tools:{
		Text:require('tools/text').extend({
			font:require('fonts/ubuntu_monospace_256.font'),
			margin:[5,0,0,0],
			fontSize:10,
			wrapping:'char',
			color:'#f'
		}),
		Background:require('tools/quad').extend({
			color:'#0000',
			wrap:1,
		}),
		Button:require('tools/button'),
		Item:require('tools/button').extend({
			w:'100%',
			Bg:{
				padding:4,
				wrap:true
			},
			Text:{
				fontSize:7,
				wrapping:'char'
			}
		}),
		Slider:require('tools/slider')
	},
	styles:{
		playButton:{
			icon:'play',
			onClick:function(){
				this.view.onPlay()
			}
		},
		stopButton:{
			icon:'stop',
			onClick:function(){
				this.view.onStop()
			}
		}
	},
	onBeginFormatAST:function(){
		this.code.trace = $P.toString()+'\n'
		this.probes = []
	},
	onProbe:function(node, lhs){
		// ok we have a probe, but what is it
		var name='prop'
		if(lhs){
			if(lhs.type === 'Identifier') name = lhs.name
			if(lhs.type === 'MemberExpression') name = lhs.property.name
		}
		//if(lhs.type === )
		return this.probes.push({
			node:node,
			name:name
		}) - 1
	},
	onAfterCompose:function(){
		this.code = this.parent
		this.code.onBeginFormatAST = this.onBeginFormatAST.bind(this)
		this.code.onProbe = this.onProbe.bind(this)
	},
	onDraw:function(){
		//alright so how are we going to select things
		this.beginBackground(this.viewGeom)
		this.drawButton(this.styles.playButton)
		// lets add a slider widget
		var probes = this.probes
		if(probes) for(var i = 0; i < probes.length; i++){
			var probe = probes[i]
			this.drawItem({
				text:probe.name
			})
			/*
			this.drawText({
			})
			var node = probe.node
			// lets make a number slider
			if(node.type === 'Literal' && node.kind === 'num'){
				this.drawSlider({
					vertical:false,
					w:'100%'
				})
			}*/
		}
		this.endBackground()
	}
})