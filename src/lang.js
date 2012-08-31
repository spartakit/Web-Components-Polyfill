// handy

function nop() {};

var nob = {};

// missing DOM/JS API

var forEach = function(inArrayish, inFunc, inScope) {
	Array.prototype.forEach.call(inArrayish, inFunc, inScope);
};

var $ = function(inElement, inSelector) {
	if (arguments.length == 1) {
		inSelector = inElement;
		inElement = document;
	}
	return inElement.querySelector(inSelector);
};

var $$ = function(inElement, inSelector) {
	if (arguments.length == 1) {
		inSelector = inElement;
		inElement = document;
	}
	var nodes = inElement.querySelectorAll(inSelector);
	nodes.forEach = function(inFunc, inScope) {
		forEach(nodes, inFunc, inScope);
	}
	return nodes;
};

// bind shim for iOs

if (!Function.prototype.bind) {
	Function.prototype.bind = function(scope) {
		var _this = this;
		return function() {
			return _this.apply(scope, arguments);
		};
	};
}
