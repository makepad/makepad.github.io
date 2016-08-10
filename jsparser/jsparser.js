// Acorn is a tiny, fast JavaScript parser written in JavaScript.
//
// Acorn was written by Marijn Haverbeke, Ingvar Stepanyan, and
// various contributors and released under an MIT license.
//
// Git repositories for Acorn are available at
//
//     http://marijnhaverbeke.nl/git/acorn
//     https://github.com/ternjs/acorn.git
//
// Please use the [github bug tracker][ghbt] to report issues.
//
// [ghbt]: https://github.com/ternjs/acorn/issues
//
// This file defines the main parser interface. The library also comes
// with a [error-tolerant parser][dammit] and an
// [abstract syntax tree walker][walk], defined in other files.
//
// [dammit]: acorn_loose.js
// [walk]: util/walk.js

var Parser = require('./state').Parser

// mixin the other files onto parser
require('./parseutil')
require('./statement')
require('./comments')
require('./lval')
require('./expression')
require('./location')

exports.Parser = require('./state').Parser
exports.plugins = require('./state').plugins
exports.defaultOptions = require('./options').defaultOptions
exports.Node = require('./node')
exports.TokenType = require('./tokentype').TokenType
exports.tokTypes = require('./tokentype').types
exports.TokContect = require('./tokencontext').TokContext
exports.tokContexts = require('./tokencontext')
exports.isIdentifierChar = require('./identifier').isIdentifierChar
exports.isIdentifierStart = require('./identifier').isIdentifierStart
exports.Token = require('./tokenize').Token
exports.isNewLine = require('./whitespace').isNewLine
exports.lineBreak = require('./whitespace').lineBreak
exports.lineBreakG = require('./whitespace').lineBreakG
exports.version = "3.1.0"
// The main exported interface (under `self.acorn` when in the
// browser) is a `parse` function that takes a code string and
// returns an abstract syntax tree as specified by [Mozilla parser
// API][api].
//
// [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

exports.parse = function parse(input, options) {
	return new Parser(options, input).parse()
}

// This function tries to parse a single expression at a given
// offset in a string. Useful for parsing mixed-language formats
// that embed JavaScript expressions.

exports.parseExpressionAt = function parseExpressionAt(input, pos, options) {
	var p = new Parser(options, input, pos)
	p.nextToken()
	return p.parseExpression()
}

// Acorn is organized as a tokenizer and a recursive-descent parser.
// The `tokenizer` export provides an interface to the tokenizer.

exports.tokenize = function tokenizer(input, options) {
	return new Parser(options, input)
}
