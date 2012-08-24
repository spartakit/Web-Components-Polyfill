(function(scope) {

scope = scope || {};

var declarationRegistry = {
	registry: {},
	// inOptions includes: extendsName, template, lifecycle
	register: function(inName, inClass, inOptions) {
		var opts = inOptions || nob;
		opts.name = inName;
		opts.declClass = inClass;
		opts.lifecycle = opts.lifecycle || nob;
		return new Declaration(opts).generatedConstructor;
	},
	add: function(inDeclaration) {
		declarationRegistry.registry[inDeclaration.name] = inDeclaration;
	},
	declByName: function(inName) {
		return declarationRegistry.registry[inName];
	},
	registered: function(inName) {
		return Boolean(declarationRegistry.declByName(inName));
	},
	create: function(inName) {
		return declarationRegistry.declByName(inName).create();
	},
	forEach: function(inFunc, inScope) {
		for (var n in this.registry) {
			inFunc.call(inScope, this.registry[n]);
		}
	}
};

scope.declarationRegistry = declarationRegistry;

document.register = declarationRegistry.register;

document.createElement = function(inName) {
	return declarationRegistry.registered(inName) ? declarationRegistry.create(inName)
		: document.__proto__.createElement.call(document, inName);
};

})(window.__exported_components_polyfill_scope__);
