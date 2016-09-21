var Parser = require('./jsstate').Parser

var pp = Parser.prototype
var tt = require('./jstokentype').types

pp.commentBegin = function(start){
	var comments = this.storeComments
	var above = ''
	for(var i = 0, l = comments.length; i < l; i++){
		var cm = comments[i]
		if(typeof cm === 'object'){
			comments.splice(0, i+1)
			break
		}
		if(cm === 1) above += '\n'
		else if(cm === 2) above += '\r'
		else above += cm
	}
	if(i === l) comments.length = 0
	return above
}

pp.commentEnd = function(node, above, tail, ignore){
	// add the prefix
	if(above.length) node.above = above

	var comments = this.storeComments
	for(var i = 0, l = comments.length; i < l; i++){
		var cm = comments[i]
		if(cm === tail){
			comments.splice(0, i)
			return
		} 
		if(typeof cm !== 'object') break
	}
	var side = ''
	for(; i < l; i++){
		var cm = comments[i]
		if(typeof cm === 'object' ){
			if(cm !== ignore){
				comments.splice(0, i)
				if(side.length) node.side = side
				return
			}
		}
		else if(cm === 1){
			side += '\n'
			comments.splice(0, i + 1)
			node.side = side
			return
		}
		else if(cm === 2){
			side += '\r'
			comments.splice(0, i + 1)
			node.side = side
			return
		}
		else {
			side += cm
		}
	}
	if(side.length) node.side = side
	comments.length = 0
}


pp.commentEndSplit = function(node, above, tail, split){
	// add the prefix
	if(above.length) node.above = above

	var comments = this.storeComments
	for(var i = 0, l = comments.length; i < l; i++){
		var cm = comments[i]
		if(cm === tail){
			comments.splice(0, i)
			return
		} 
		if(typeof cm !== 'object') break
	}
	var side = ''
	for(; i < l; i++){
		var cm = comments[i]
		if(typeof cm === 'object' ){
			if(cm !== split){
				comments.splice(0, i)
				if(side.length) node.side = side
				return
			}
		}
		else if(cm === 1){
			side += '\n'
			if(comments[i+1] !== split){
				comments.splice(0, i + 1)
				node.side = side
				return
			}
		}
		else if(cm === 2){
			side += '\r'
			comments.splice(0, i + 1)
			node.side = side
			return
		}
		else {
			side += cm
		}
	}
	if(side.length) node.side = side
	comments.length = 0
}



// called on the head of a block
pp.commentTop = function(node){
	var out = ''
	var comments = this.storeComments
	for(var i = 0, l = comments.length; i < l; i++){
		var item = comments[i]
		if(typeof item != 'object'){
			if(item === 1){
				out += '\n'
				comments.splice(0, i + 1)
				break
			}
			else if(item === 2){
				out += '\r'
				comments.splice(0, i + 1)
				break
			}
			out += item
		}
	}
	if(out.length){
	 	if(node) node.top = out
	 	return out
	 }
}

// this is called at a } we run to it then splice and leave that for the next layer up
pp.commentBottom2 = function(tail, node){
	var out = ''
	var comments = this.storeComments
	//console.log('tail',cmt.join(','))
	for(var i = 0, l = comments.length;i < l; i++){
		var item = comments[i]
		if(item === tail){
			comments.splice(0, i + 1)
			break
		}
		if(typeof item !== 'object'){
			if(item === 1){
				out += '\n'
			}
			else if(item === 2){
				out += '\r'
			}
			else out += item
		}
	}
	if(i==l){
		comments.splice(0, l - 1)
		//comments.length = 0
	}
	if(out.length && node)node.bottom = out
	return out
}

// this is called at a } we run to it then splice and leave that for the next layer up
pp.commentBottom = function(tail, node){
	var out = ''
	var comments = this.storeComments
	//console.log('tail',cmt.join(','))
	for(var i = 0, l = comments.length;i < l; i++){
		var item = comments[i]
		if(item === tail){
			comments.splice(0, i + 1)
			break
		}
		if(typeof item !== 'object'){
			if(item === 1){
				out += '\n'
			}
			else if(item === 2){
				out += '\r'
			}
			else out += item
		}
	}
	if(i==l){
		comments.splice(0, l - 1)
		//comments.length = 0
	}
	if(out.length && node)node.bottom = out
	return out
}


pp.commentsDump = function(){
	var out = []
	for(var i = 0; i < this.storeComments.length; i++){
		var item = this.storeComments[i]
		if(typeof item === 'object'){
			out.push(item.label)
		}
		else if(item === 1){
			out.push('#N')
		}
		else out.push('#' + item)
	}
	console.log(out)
}

pp.commentAround = function(node, token){
	var comments = this.storeComments
	if(token === tt._var) console.log(comments)
	for(var i = 0,l = comments.length;i < l; i++){
		if(comments[i] == token){
			var out = ''

			// scan backwards for the comments before
			for(var j = i - 1;j>=0;j--){
				var item = comments[j]
				if(typeof item === 'object') break
				if(item === 1) out = '\n' + out
				else if(item === 2) out = '\r' + out
				else{
					out = item + out
				}
			}
			if(out.length){
				node.around1 = out
				out = ''
			}
			// scan forward for the comments after
			for(var j = i + 1, l = comments.length; j < l; j++){
				var item = comments[j]
				if(typeof item === 'object') break
				if(item === 1) out += '\n'
				else if(item === 2) out += '\r'
				else out += item
			}
			if(out.length) node.around2 = out

			comments.splice(0, j)

			return
		}
	}
}

pp.commentAfter = function(token){

	var comments = this.storeComments
	//if(token === tt._var) console.log(comments)
	for(var i = 0,l = comments.length;i < l; i++){
		if(comments[i] == token){
			var out = ''
			// scan forward for the comments after
			for(var j = i + 1, l = comments.length; j < l; j++){
				var item = comments[j]
				if(typeof item === 'object') break
				if(item === 1) out += '\n'
				else if(item === 2) out += '\r'
				else out += item
			}

			comments.splice(0, j)

			return out
		}
	}
}