var types = require('base/types')
module.exports = class extends require('base/view'){
	prototype(){
		this.tools = {
			Button: require('stamps/button').extend({
				order:4,
			}),
			Slider:require('stamps/slider').extend({
				vertical:true,
				range:[1,0],
				w:10,
				h:'100%'
			}),
			Bg:require('shaders/quad').extend({
				w:'100%',
				padding:[0,5,0,5],
				wrap:false,
				color:module.style.colors.bgNormal
			})
		}
		this.props = {
			w:'100%',
			h:'100%',
			tail:true,
			resource:null,
		}
	}

	constructor(...args){
		super(...args)
	}

	onCursorMove(editor){
		this.editor = editor
		this.redraw()
	}

	onColorSlide(sld){
		var ar = this.colorArray
		ar[sld.id] = sld.value
		// now modify the node
		var s = "'#"+
		('00'+(ar[0]*255|0).toString(16)).slice(-2)+
		('00'+(ar[1]*255|0).toString(16)).slice(-2)+
		('00'+(ar[2]*255|0).toString(16)).slice(-2)+
		('00'+(ar[3]*255|0).toString(16)).slice(-2)+
		"'"
		this.astNode.raw = s
		this.editor.$textClean = null
		this.editor.redraw()
	}

	onDraw(){
		// lets find the AST node we are on
		// and manipulate that
		if(!this.editor) return

		// ok so lets find the ast node belonging to 'cursor'
		var scan = this.editor.cs.cursors[0].end
		// lets scan for it
		var nodes = this.editor.$nodeRanges
		if(!nodes) return
		for(var i = 0; i < nodes.length; i+=2){
			// check if we are in range
			var node = nodes[i+1]
			var pos = nodes[i]
			if(node.type === 'Literal' && scan >= pos-node.raw.length && scan <= pos){
				// maybe color?
				var ar =  []
				if(node.kind === 'string' && types.colorFromString(node.raw.slice(1,-1),1,ar,0)){
					// lets parse a color
					this.astNode = node
					this.colorArray = []
					// lets draw 3 sliders
					// lets make a bunch of slides w live coded 
					// example code that 'survives' reload!
					this.drawSlider({
						id:0,
						value:ar[0],
						onSlide:this.onColorSlide
					})
					this.drawSlider({
						id:1,
						value:ar[1],
						onSlide:this.onColorSlide
					})
					this.drawSlider({
						id:2,
						value:ar[2],
						onSlide:this.onColorSlide
					})
					this.drawSlider({
						id:3,
						value:ar[3],
						onSlide:this.onColorSlide
					})
				}
				// maybe 
				break
			}
		}

		/*
		this.beginBg({
		})
		
		this.drawButton({
			id:'play',
			icon:'trash-o',
			align:[1,0],
			onClick:this.onTrash
		})

		this.drawButton({
			id:'close',
			align:[1,0],
			icon:'level-down',
			margin:[2,10,0,0],
			toggle:true,
			toggled:this.tail,
			onClick:this.onTailToggle
		})
		this.endBg()
		*/
		//this.lineBreak()
		//this.log.draw(this,{x:0,y:0,tail:this.tail})
	}
}
