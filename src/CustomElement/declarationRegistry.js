(function(scope) {

scope = scope || {};

declarationRegistry = {
	registry: {},
	register: function(inName, inClass, inOptions) {
		var opts = inOptions || nob;
		// options: extendsName, template, lifecycle
		var decl = new Declaration(inName, opts.extendsName, opts.template);
		decl.imperatively(inClass, opts.lifecycle);
		declarationRegistry.add(inName, decl);
		return decl.generatedConstructor;
	},
	add: function(inName, inDeclaration) {
		declarationRegistry.registry[inName] = inDeclaration;
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
