module.exports = class Split extends require('base/stamp'){

	defaultStyle(style){
		style.to = {
			styles:{
				base:{
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
							Bg:{},
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
			}
		}
	}

	prototype(){

		this.props = {
			offset:0,
			settings:0,
			vertical:1,
			buttonClick:{value:{}}
		}
		this.inPlace = 1
	
		this.verbs = {
			draw:function(overload){
				this.$STYLESTAMP(overload)
				this.$DRAWSTAMP()

				return $stamp
			}
		}

		this.tools = {
			Button:require('stamps/button').extend({
				w:25,
				h:25,
				onClick:function(){
					this.view.onSplitButtonClick()
				},
				styles:{
					default:{
						Bg:{color:'#3c30'}
					},
					defaultOver:{
						Bg:{color:'#ccc7'}
					},
					clicked:{
						Bg:{color:'#3f37'}
					},
					clickedOver:{
						Bg:{color:'#7f77'}
					}
				},
				Bg:{
					pickAlpha:-1,
					align:[.5,.5],
					padding:0
				}
			}),
			Bg:require('shaders/quad').extend({
				align:[.5,.5],
				props:{
					vertical:1,
					settings:0,
					setWidth:26,
					borderWidth:0.,
					boxSize:120.,
					bgColor:'#1',
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
				pixel:function(){$
					var p = this.p
					var aa = this.antialias(p)

					var lineDist = 0.
					var blobDist = 0.
					if(this.vertical > .5){
						lineDist = this.boxDistance(
							p, 
							this.dv-this.ow*.5, 
							0., 
							this.ow, 
							this.h, 
							1.
						)
						blobDist = this.boxDistance(
							p, 
							0., 
							this.h*.5-.5*this.boxSize, 
							this.w, 
							this.boxSize, 
							8.
						)
					}
					else{
						lineDist = this.boxDistance(
							p, 
							0., 
							this.dv-this.oh*.5, 
							this.w, 
							this.oh, 
							1.
						)
						blobDist = this.boxDistance(
							p, 
							this.w*0.5-.5*this.boxSize, 
							0., 
							this.boxSize, 
							this.h, 
							8.
						)
					}
					var dist = this.blendDistance(lineDist,blobDist, .5)

					return this.colorBorderDistance(aa, dist, this.borderWidth, this.bgColor, this.borderColor )
				}
			})
		}
	
		// determining the style, default way
		this.onStyle = function(){
			var styles = this.styles
			this.states = styles[this.id] || styles.base
			this._state = this.states.default
		}
	}

	onFingerDown(e){
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

	onFingerMove(e){
		if(this.view.onSplitMove){
			e.xSplit = e.xView - this.xStart
			e.ySplit = e.yView - this.yStart
			this.view.onSplitMove(e)
		}
	}

	onFingerUp(){ 
		this.stateExt = ''
		if(this.settings>0.){
			this.state = this.styles.settings
		}
		else{
			this.state = this.styles.default 
		}
	}
	//onFingerOver(){ this.state = this.states.over }
	//onFingerOut(){ this.state = this.states.default }

	onDraw(){
		this.beginBg(this)
		/*
		this.drawButton({
			text:'%',
			index:0
		}, this.buttonClick)
		this.drawButton({
			icon:'eye-slash',
			index:1
		}, this.buttonClick)*/
		this.endBg()
	}
}