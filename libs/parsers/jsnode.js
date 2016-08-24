var Parser = require('./jsstate').Parser

function Node(pos) {
	this.type = ""
	this.start = pos
	this.end = 0
}

// Start an AST node, attaching a start offset.
exports.Node = Node

const pp = Parser.prototype

pp.startNode = function() {
	return new Node(this.start)
}

pp.startNodeAt = function(pos) {
	return new Node(pos)
}

// Finish an AST node, adding `type` and `end` properties.

function finishNodeAt(node, type, pos) {
	node.type = type
	node.end = pos
	return node
}

pp.finishNode = function(node, type) {
	node.type = type
	node.end = this.lastTokEnd
	return node
}

// Finish node at given position
pp.finishNodeAt = function(node, type, pos, loc) {
	node.type = type
	node.pos = pos
	return node
}
