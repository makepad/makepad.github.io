function $P(id, arg){
	
	/*if(typeof arg === 'number'){
		var sh = arg
		var str = ''
		while(sh){
			var code = sh&0xff
			if(code<31 || code >127){str = '';break}
			str += String.fromCharCode(code)
			sh = sh >> 8
		}
		//console.log(arg,arg.toString(16), str)
	}*/
	//else 
	console.log(arg)
	// we can interact with the editor in the other thread.
	// console.log(arg)
	// how do we re-render?... what does it mean to update a value?
	// if its in shader we can just redraw
	// if its in a class we have to reinitialize the class
	// so it depends
	return arg
}

module.exports = class Probes extends require('base/view'){
	prototype(){
		this.name = 'Probes'
		this.props = {
		}
		this.padding = [0,0,0,0]
		this.tools = {
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
		}
		this.styles = {
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
		}
	}

	onBeginFormatAST(){
		this.code.trace = $P.toString()+';\n'
		this.probes = []
	}

	onProbe(node, lhs){
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
	}

	onAfterCompose(){
		this.code = this.parent
		this.code.onBeginFormatAST = this.onBeginFormatAST.bind(this)
		this.code.onProbe = this.onProbe.bind(this)
	}

	onDraw(){
		//alright so how are we going to select things
		this.beginBackground(this.viewGeom)
		this.drawButton(this.styles.playButton)
		// lets add a slider widget
		var probes = this.probes
		if(probes) for(let i = 0; i < probes.length; i++){
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
}