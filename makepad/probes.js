function $P(id, arg){
	if(!$P.onMessage){
		function onMessage(){
			$P.onMessage = false
			return [{
				fn:'onProbe',
				msg:block
			},[block]]
		}
		module.worker.batchMessage({
			$:'worker1',
			msg:{onMessage:onMessage}
		})
		$P.onMessage = true
	}
	// lets serialize arg into our typed array

	console.log(arg)
	return arg
}

module.exports = class Probes extends require('base/view'){
	prototype(){
		this.cursor ='pointer'
		this.name = 'Probes'
		this.props = {
		}
		this.padding = [0,0,0,0]
		this.tools = {
			Text:require('tools/text').extend({
				font:require('fonts/ubuntu_monospace_256.font'),
				margin:[5,0,0,5],
				fontSize:14,
				wrapping:'line',
				color:'#f'
			}),
			Background:require('tools/quad').extend({
				color:'#000f',
				wrap:1,
			}),
			Button:require('tools/button').extend({
				cursor:'default',
				Bg:{
					padding:[6,10,6,10]
				}
			}),
			Item:require('tools/button').extend({
				h:'100%',
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

	onPlay(){
		// ask which code file has focus
		this.app.addProcessTab(this.parent.resource)
	}

	onStop(){

	}

	onBeginFormatAST(){
		this.code.trace = ''
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
		this.redraw()
		return this.probes.push({
			node:node,
			name:name
		}) - 1
	}

	onEndFormatAST(){
		this.code.trace += '\n'+$P.toString()
	}

	onFingerDown(e){
		if(this.code.error && this.code.error.file){
			var res = this.app.resources[this.code.error.file]
			if(res) this.app.addSourceTab(res)
		}
	}

	onDraw(){
		//alright so how are we going to select things
		this.beginBackground(this.viewGeom)

		this.drawButton(this.styles.playButton)

		if(this.code.error){
			this.drawText({
				text:this.code.error.message
			})
		}
		else{
			// lets add a slider widget
			var probes = this.probes
			if(probes) for(let i = 0; i < probes.length; i++){
				var probe = probes[i]
				this.drawItem({
					text:probe.name
				})
			}
		}
		this.endBackground()
	}
}