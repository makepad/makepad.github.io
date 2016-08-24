var Tree = require('views/tree')
module.exports=require('base/drawapp').extend({
	onCompose:function(){
		return Tree({
			w:50,
			h:'100%'
		})
	}
})

