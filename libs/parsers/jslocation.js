var Parser = require('./jsstate').Parser
var Position = require('./jslocutil').Position
var getLineInfo = require('./jslocutil').getLineInfo

var pp = Parser.prototype

// This function is used to raise exceptions on parse errors. It
// takes an offset integer (into the current `input`) to indicate
// the location of the error, attaches the position to the end
// of the error message, and then raises a `SyntaxError` with that
// message.

pp.raise = function(pos, message) {

	var loc = getLineInfo(this.input, pos)
	///var outmsg = message + " (" + loc.line + ":" + loc.column + ")"
	//var err = new SyntaxError(message)
	var err = module.worker.decodeException(new Error())
	err.path = null
	err.message = message
	err.line = loc.line
	err.column = loc.column
	err.pos = pos
	//err.pos = pos; 
	//err.loc = loc; 
	//err.raisedAt = this.pos
	throw err
}

pp.raiseRecoverable = pp.raise

pp.curPosition = function() {
	if (this.options.locations) {
	return new Position(this.curLine, this.pos - this.lineStart)
	}
}
