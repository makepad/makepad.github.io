var audio=require('services/audio')
//var sequencer = require('services/sequencer')

function load(buffer){
	var i16=new Int16Array(buffer)
	var u16=new Uint16Array(buffer)
	if(u16[0]!==0x4952)return false
	if(u16[1]!==0x4646)return false
	var size=(u16[3]<<16)|u16[2]
	// size is byteLength - 8
	if(u16[4]!==0x4157)return false
	if(u16[5]!==0x4556)return false
	if(u16[6]!==0x6d66)return false
	if(u16[7]!==0x2074)return false
	var fmtChunkSize=u16[8]
	var formatTag=u16[10]
	if(formatTag!==1)return false
	var channels=u16[11]
	var sampleRate=(u16[13]<<16)|u16[12]
	var bps=(u16[15]<<16)|u16[14]
	var blockAlign=u16[16]
	var bitsPerSample=u16[17]
	var cbSize=u16[18]
	// we should now see 'data'
	if(u16[(fmtChunkSize>>1)+21]!==0x6164)return false
	if(u16[20]!==0x6174)return false
	
}

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
		
		//load(require('./audio.wav'))
		
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