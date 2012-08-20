// missing DOM/JS API

var forEach = function(inArrayish, inFunc, inScope) {
	Array.prototype.forEach.call(inArrayish, inFunc, inScope);
};

var $ = function(inElement, inSelector) {
	return inElement.querySelector(inSelector);
};

var $$ = function(inElement, inSelector) {
	var nodes = inElement.querySelectorAll(inSelector);
	nodes.forEach = function(inFunc, inScope) {
		forEach(nodes, inFunc, inScope);
	}
	return nodes;
};

function nop() {};

// bind shim for iOs

if (!Function.prototype.bind) {
	console.warn("patching 'bind'");
	Function.prototype.bind = function(scope) {
		var _this = this;
		return function() {
			return _this.apply(scope, arguments);
		}
	}
};
