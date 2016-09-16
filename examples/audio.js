var audio=require('services/audio')
var wav = require('parsers/wav')

module.exports=require('base/drawapp').extend({
	tools:{
		Button:require('tools/button').extend({
			
		}),
		Rect:{
			color:'white',
			borderWidth:1,
			borderColor:'gray',
			borderRadius:[0,6,6,0],
		}
	},
	onInit:function(){
		audio.reset()
		this.recording=[]
		this.samples=0
		// ok we dont deal in individual nodes we deal in whole flows.
		this.recFlow=audio.Flow({
			gain1:{
				to:'output',
				gain:.0,
			},
			recorder1:{
				to:'gain1',
				chunk:512,
				onData:function(data){
					this.redraw()
					this.recording.push(data)
					this.samples+=data[0].length
					this.scopeData=data
				}.bind(this)
			},
			input1:{
				to:'recorder1',
				device:'Microphone'
			}
		})
		
		//var out = wav.parse(require('./audio.wav'))
		
		//this.recording.push(out.data)
		//this.samples=out.data[0].length
		this.playFlow=audio.Flow({
			buffer1:{
				to:'output',
				rate:44100,
				loop:false,
				start:0
			}
		})
	},
	onDraw:function(){
		this.drawButton({
			text:this.recFlow.running?"Stop":"Rec",
			onClick:function(){
				if(this.recFlow.running)this.recFlow.stop()
				else {
					this.recording.length=0
					this.samples=0
					this.recFlow.start()
				}
				this.redraw()
			}.bind(this)
		})
		this.drawButton({
			text:this.playFlow.running?"Stop":"Play",
			onClick:function(){
				if(this.playFlow.running){
					this.playFlow.stop()
					this.redraw()
					return
				}
				// lets combine all the recording buffers
				var out=new Float32Array(this.samples)
				var o=0
				for(var c=0;c<this.recording.length;c++){
					var left=this.recording[c][0]
					for(var i=0;i<left.length;i++)out[o++]=left[i]
				}
				
				this.playFlow.start({
					buffer1:{
						data:[out,out]
					}
				})
				this.redraw()
			}.bind(this)
		})
		
		// lets draw the recording
		if(this.recording){
			var scale=250
			var t=0
			var minv=0,maxv=0.
			for(var c=0;c<this.recording.length;c++){
				var left=this.recording[c][0]
				//console.log(left, this.recording.length)
				for(var i=0;i<left.length;i++){
					var v=left[i]
					if(v<minv)minv=v
					if(v>maxv)maxv=v
					if(!(t++%scale)){
						this.drawRect({
							x:t/scale,
							y:minv*100+300,
							w:6,//t / scale,
							h:(maxv-minv)*100+1.//+300
						})
						minv=0
						maxv=0
					}
				}
				if(t>1000*scale)break
			}
		}
		
		// lets draw the scope 
		if(this.scopeData){
			var left=this.scopeData[0]
			this.drawLine({sx:0,sy:100})
			for(var i=0;i<left.length;i++){
				this.drawLine({
					x:i,
					y:left[i]*100+100
				})
			}
		}
	}
})