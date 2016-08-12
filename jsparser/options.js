var has = require('./util').has
var isArray = require('./util').isArray

// A second optional argument can be given to further configure
// the parser process. These options are recognized:

var defaultOptions = exports.defaultOptions = {
	// `ecmaVersion` indicates the ECMAScript version to parse. Must
	// be either 3, or 5, or 6. This influences support for strict
	// mode, the set of reserved words, support for getters and
	// setters and other features. The default is 6.
	ecmaVersion: 6,
	// Source type ("script" or "module") for different semantics
	sourceType: "script",
	// `onInsertedSemicolon` can be a callback that will be called
	// when a semicolon is automatically inserted. It will be passed
	// th position of the comma as an offset, and if `locations` is
	// enabled, it is given the location as a `{line, column}` object
	// as second argument.
	onInsertedSemicolon: null,
	// `onTrailingComma` is similar to `onInsertedSemicolon`, but for
	// trailing commas.
	onTrailingComma: null,
	// By default, reserved words are only enforced if ecmaVersion >= 5.
	// Set `allowReserved` to a boolean value to explicitly turn this on
	// an off. When this option has the value "never", reserved words
	// and keywords can also not be used as property names.
	allowReserved: null,
	// When enabled, a return at the top level is not considered an
	// error.
	allowReturnOutsideFunction: false,
	// When enabled, import/export statements are not constrained to
	// appearing at the top of the program.
	allowImportExportEverywhere: false,
	// When enabled, hashbang directive in the beginning of file
	// is allowed and treated as a line comment.
	allowHashBang: false,
	// A function can be passed as `onToken` option, which will
	// cause Acorn to call that function with object in the same
	// format as tokens returned from `tokenizer().getToken()`. Note
	// that you are not allowed to call the parser from the
	// callback—that will corrupt its internal state.
	onToken: null,
	// A function can be passed as `onComment` option, which will
	// cause Acorn to call that function with `(block, text, start,
	// end)` parameters whenever a comment is skipped. `block` is a
	// boolean indicating whether this is a block (`/* */`) comment,
	// `text` is the content of the comment, and `start` and `end` are
	// character offsets that denote the start and end of the comment.
	// When the `locations` option is on, two more parameters are
	// passed, the full `{line, column}` locations of the start and
	// end of the comments. Note that you are not allowed to call the
	// parser from the callback—that will corrupt its internal state.
	onComment: null,
	// It is possible to parse multiple files into a single AST by
	// passing the tree produced by parsing the first file as
	// `program` option in subsequent parses. This will add the
	// toplevel forms of the parsed file to the `Program` (top) node
	// of an existing parse tree.
	program: null,
	// When `locations` is on, you can pass this to record the source
	// file in every node's `loc` object.
	sourceFile: null,
	// This value, if given, is stored in every node, whether
	// `locations` is on or off.
	directSourceFile: null,
	// keep track of the stored comments using this array
	storeComments:null,
	// token/comment/newline debugstream
	debugStream:null,
	// When enabled, parenthesized expressions are represented by
	// (non-standard) ParenthesizedExpression nodes
	preserveParens: true,
	insertCommas: true,
	plugins: {}
}

// Interpret and default an options object

exports.getOptions = function(opts) {
	var options = {}
	for (var opt in defaultOptions)
		options[opt] = opts && has(opts, opt) ? opts[opt] : defaultOptions[opt]
	if (options.allowReserved == null)
		options.allowReserved = options.ecmaVersion < 5

	//if (isArray(options.onToken)) {
	//	var tokens = options.onToken
	//	options.onToken = function(token){
	//		tokens.push(token)
	//	}
	//}
	//if (isArray(options.onComment))
	//	options.onComment = pushComment(options, options.onComment)

	return options
}

exports.pushComment = function(options, array) {
	return function (block, text, start, end) {
		var comment = {
			type: block ? 'Block' : 'Line',
			value: text,
			start: start,
			end: end
		}
		array.push(comment)
	}
}

