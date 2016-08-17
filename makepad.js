// the makepad App
module.exports = require('app').extend(function(proto){

	var Code = require('views/codeview')
	//var Splitter = require('views/splitter')
	var UserCode = require('views/drawview').extend({
		tools:require('shaders/backgroundshader').extend({
			color:'#333'
		}),
		onDraw:function(){
			this.drawBackground(this.viewGeom)
		}
	})

	proto.onCompose = function(){
		return [
			//Splitter({
			//	kind:'vertical'
			//	w:'100%',
			//	h:'100%'
			//},
			Code({
				text:require.module(require('tests/codetestinput')).source,
				Text:{
					color:'white',
					font:require('fonts/ubuntu_monospace_256.sdffont'),
				},
				w:'50%',
				h:'100%'
			}),
			UserCode({
				w:'50%',
				h:'100%'
			})
		]
	}
})