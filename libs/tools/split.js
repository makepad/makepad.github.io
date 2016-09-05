module.exports = require('base/stamp').extend(function Split(proto){

	proto.props = {
		offset:0,
		settings:0,
		vertical:1,
		buttonClick:{value:{}}
	}
	proto.inPlace = 1

	proto.tools = {
		Button:require('tools/button').extend({
			w:25,
			h:25,
			onClick:function(){
				this.view.onSplitButtonClick()
			},
			Bg:{
				align:[.5,.5],
				padding:0
			}
		}),
		Bg:require('tools/quad').extend({
			align:[.5,.5],
			props:{
				vertical:1,
				settings:0,
				setWidth:26,
				borderWidth:0.,
				boxSize:120.,
				bgColor:'gray',
				borderColor:'black'
			},
			vertexStyle:function(){
				this.dv = this.settings*this.setWidth*.5
				this.ds = this.settings*this.setWidth
				// our width is X
				// now our width is less
				this.ow = this.w
				this.oh = this.h
				if(this.vertical>.5){
					this.w = this.ds
					if(this.w>this.ow){
						this.x -= this.dv-this.ow*.5
					}
					else this.w = this.ow, this.dv = this.ow*.5
				}
				else{
					this.h = this.ds
					if(this.h>this.oh){
						this.y -= this.dv-this.oh*.5
					}
					else this.h = this.oh, this.dv = this.oh*.5
				}
				this.p = this.mesh.xy*vec2(this.w, this.h)
			},
			pixel:function(){
				var p = this.p
				var aa = this.antialias(p)

				var lineField = 0.
				var blobField = 0.
				if(this.vertical > .5){
					lineField = this.boxField(
						p, 
						this.dv-this.ow*.5, 
						0., 
						this.ow, 
						this.h, 
						1.
					)
					blobField = this.boxField(
						p, 
						0, 
						this.h*.5-.5*this.boxSize, 
						this.w, 
						this.boxSize, 
						8.
					)
				}
				else{
					lineField = this.boxField(
						p, 
						0., 
						this.dv-this.oh*.5, 
						this.w, 
						this.oh, 
						1.
					)
					blobField = this.boxField(
						p, 
						this.w*0.5-.5*this.boxSize, 
						0., 
						this.boxSize, 
						this.h, 
						8.
					)
				}
				var field = this.blendField(lineField,blobField, .5)

				return this.colorBorderField(aa, field, this.borderWidth, this.bgColor, this.borderColor )
			}
		})
	}

	proto.styles = {
		$duration:0.3,
		$tween:2,
		$ease:[0,10,0,0],
		default:{
			settings:0.,
			Button:{
				$fontSize:0,
				w:0,h:0,
				Bg:{},
				Text:{},
				Icon:{}
			},
			Bg:{}
		},
		settings:{
			settings:1,
			Button:{
				w:22,h:22,
				Bg:{
					
				},
				$fontSize:14,
				Text:{},
				Icon:{}
			},
			Bg:{
				//borderWidth:.5,
				//borderColor:'black'
			}
		},
		default_noAnim$default:{
			$duration:0.
		},
		settings_noAnim$settings:{
			$duration:0.
		},
		default_drag$default:{
			$duration:0.,
		},
		settings_drag$settings:{
			$duration:0.
		}
	}

	proto.onFingerDown = function(e){
		this.xStart = e.x + this.offset
		this.yStart = e.y + this.offset
		this.stateExt = '_drag'
		if(this.settings>0.){
			this.state = this.styles.settings_drag
		}
		else{
			this.state = this.styles.default_drag 
		}
	}

	proto.onFingerMove = function(e){
		if(this.view.onSplitMove){
			e.xSplit = e.xView - this.xStart
			e.ySplit = e.yView - this.yStart
			this.view.onSplitMove(e)
		}
	}

	proto.onFingerUp = function(){ 
		this.stateExt = ''
		if(this.settings>0.){
			this.state = this.styles.settings
		}
		else{
			this.state = this.styles.default 
		}
	}
	//proto.onFingerOver = function(){ this.state = this.states.over }
	//proto.onFingerOut = function(){ this.state = this.states.default }

	proto.onDraw = function(){
		this.beginBg(this)
		this.drawButton({
			text:'%',
			index:0
		}, this.buttonClick)
		this.drawButton({
			icon:'lock',
			index:1
		}, this.buttonClick)
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