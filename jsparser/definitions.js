// All acorn definition structures
// 0: value
// 1: node
// 2: Array
// 3: Object keys

module.exports = {
	// main structures
	Program:{ body:2 },
	EmptyStatement:{}
	ExpressionStatement:{expression:1},
	BlockStatement:{body:2},
	SequenceExpression:{expressions:2}
	ParenthesizedExpression:{expression:1}

	// returning / throwing
	ReturnStatement:{argument:1},
	YieldExpression:{argument:1, delegate:0}

	// exceptions
	ThrowStatement:{argument:1},
	TryStatement:{block:1, handler:1, finalizer:1},
	CatchClause:{param:1, body:1},

	// simple bits
	Identifier:{name:0},
	Literal:{raw:0, value:0},
	ThisExpression:{},
	Super:{},

	// await
	AwaitExpression:{argument:1},

	// new and call
	MetaProperty:{meta:1, property:1},
	NewExpression:{callee:1, arguments:2},
	CallExpression:{callee:1, arguments:2},

	// Objects and arrays
	ArrayExpression:{elements:2},
	ObjectExpression:{properties:3},
	ObjectPattern:{properties:3},
	MemberExpression:{object:1, property:1, computed:0},

	// functions
	FunctionExpression:{id:1, params:2, generator:0, expression:0, body:1},
	ArrowFunctionExpression:{params:2, expression:0, body:1},
	FunctionDeclaration: {id:1, params:2, expression:0, body:1},

	// variable declarations
	VariableDeclaration:{declarations:2, kind:0},
	VariableDeclarator:{id:1, init:1},

	// a+b
	LogicalExpression:{left:1, right:1, operator:0},
	BinaryExpression:{left:1, right:1, operator:0},
	AssignmentExpression: {left:1, right:1},
	ConditionalExpression:{test:1, consequent:1, alternate:1},
	UpdateExpression:{operator:0, prefix:0, argument:1},
	UnaryExpression:{operator:0, prefix:0, argument:1},

	// if and for
	IfStatement:{test:1, consequent:1, alternate:1},
	ForStatement:{init:1, test:1, update:1, body:1},
	ForInStatement:{left:1, right:1, body:1},
	ForOfStatement:{left:1, right:1, body:1},
	WhileStatement:{body:1, test:1},
	DoWhileStatement:{body:1, test:1},
	BreakStatement:{label:1},
	ContinueStatement:{label:1},

	// switch
	SwitchStatement:{discriminant:1, cases:2},
	SwitchCase:{test:1, consequent:2},

	// templates
	TaggedTemplateExpression:{tag:1, quasi:1},
	TemplateElement:{tail:0, value:0},
	TemplateLiteral:{expressions:2, quasis:2},

	// classes
	ClassDeclaration:{id:1,superClass:1},
	ClassExpression:{id:1,superClass:1},
	ClassBody:{body:2},
	MethodDefinition:{value:1, kind:0, static:0},


	// modules
	ExportAllDeclaration:{source:1},
	ExportDefaultDeclaration:{declaration:1},
	ExportNamedDeclaration:{declaration:1, source:1, specifiers:2},
	ExportSpecifier:{local:1, exported:1},
	ImportDeclaration:{specifiers:2, source:1},
	ImportDefaultSpecifier:{local:1},
	ImportNamespaceSpecifier:{local:1},
	ImportSpecifier:{imported:1, local:1},

	// other
	DebuggerStatement:{},
	SpreadElement:{argument:1},
	LabeledStatement:{label:1, body:1},
	WithStatement:{object:1, body:1}
}