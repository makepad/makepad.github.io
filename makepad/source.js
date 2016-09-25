
var storage=require('services/storage')

module.exports=class Source extends require('base/view'){
	
	prototype(){
		this.name='Source'
		this.props={
		text:{inward:'Edit',prop:'text',value:''}
			}
		this.tools={
		Code:class extends require('views/code'){
				prototype(){
					this.name='Edit'
					this.drawPadding=[0,0,0,4]
					this.wrap=true
					this.padding=[0,0,0,0]
					}
				onKeyS(e){
					if(!e.meta&&!e.ctrl)return true
					this.parent.onSave(this.serializeWithFormatting())
					}
				onParsed(){
					this.parent.onParsed(this.text,this.trace)
					}
				},
			Probes:require('./probes')
			}
		}
	
	onSave(text){
		storage.save(this.resource.path,text)
		this.dirty=false
		this.app.processTabTitles()
		}
	
	onParsed(text,trace){
		var resource=this.resource
		if(!resource)return
		// update our resource
		if(this.typeChanged){
			this.dirty=true
			this.app.processTabTitles()
			}
		this.typeChanged=true
		resource.data=text
		resource.trace=trace
		this.app.codeChange(resource)
		}
	
	onCompose(){
		return [
		new this.Code({
			y:'28',
				w:'100%'
				//h:'100%-40'
				}),
			new this.Probes({
			x:'0',
				w:'100%',
				///y:'100%-this.h',
				//h:'40',
				onAfterCompose:function(){
					this.code=this.parent.find('Edit')
					this.code.onBeginFormatAST=this.onBeginFormatAST.bind(this)
					this.code.onProbe=this.onProbe.bind(this)
					}
				})
			]
		}
	}