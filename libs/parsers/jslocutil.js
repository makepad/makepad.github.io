var lineBreakG = require('./jswhitespace').lineBreakG

// These are used when `options.locations` is on, for the
// `startLoc` and `endLoc` properties.


function Position(line, col) {
	this.line = line
	this.column = col
}
exports.Position = Position

Position.prototype.offset = function(n) {
	return new Position(this.line, this.column + n)
}

function SourceLocation(p, start, end) {
	this.start = start
	this.end = end
	if (p.sourceFile !== null) this.source = p.sourceFile
}

exports.SourceLocation = SourceLocation
// The `getLineInfo` function is mostly useful when the
// `locations` option is off (for performance reasons) and you
// want to find the line/column position for a given character
// offset. `input` should be the code string that the offset refers
// into.

exports.getLineInfo = function(input, offset) {
	for (var line = 1, cur = 0;;) {
		lineBreakG.lastIndex = cur
		var match = lineBreakG.exec(input)
		if (match && match.index < offset) {
			++line
			cur = match.index + match[0].length
		} else {
			return new Position(line, offset - cur)
		}
	}
}