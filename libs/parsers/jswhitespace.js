// Matches a whole line break (where CRLF is considered a single
// line break). Used to count lines.

exports.lineBreak = /\r\n?|\n|\u2028|\u2029/

exports.lineBreakG = new RegExp(exports.lineBreak.source, "g")

exports.isNewLine = function(code) {
	return code === 10 || code === 13 || code === 0x2028 || code == 0x2029
}

exports.nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/

exports.skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g
