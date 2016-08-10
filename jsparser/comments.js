var Parser = require('./state').Parser

const pp = Parser.prototype

pp.commentBegin = function(){
	var comments = this.storeComments
	var above = ''
	for(var i = 0, l = comments.length; i < l; i++){
		var cm = comments[i]
		if(typeof cm === 'object'){
			comments.splice(0, i+1)
			break
		}
		if(cm === 1) above += '\n'
		else above += cm
	}
	if(i === l) comments.length = 0
	return above
}

pp.commentEnd = function(node, above, tail){
	// add the prefix
	if(above.length) node.above = above

	var comments = this.storeComments
	for(var i = 0, l = comments.length; i < l; i++){
		var cm = comments[i]
		if(cm === tail) break
		if(typeof cm !== 'object') break
	}
	var side = ''
	for(; i < l; i++){
		var cm = comments[i]
		if(typeof cm === 'object'){
			comments.splice(0, i)
			if(side.length) node.side = side
			return
		}
		if(cm === 1){
			side += '\n'
			comments.splice(0, i + 1)
			node.side = side
			return
		}
		else{
			side += cm
		}
	}
	if(side.length) node.side = side
	comments.length = 0
}