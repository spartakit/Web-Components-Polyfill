declarationRegistry = {
	registry: {},
	register: function(inName, inClass, inOptions) {
		var opts = inOptions || nob;
		// options: extendsName, template, lifecycle
		var decl = new Declaration(inName, opts.extendsName, opts.template);
		decl.imperatively(inClass, opts.lifecycle);
		declarationRegistry.registry[inName] = decl;
		return decl.generatedConstructor;
	},
	declByName: function(inName) {
		return declarationRegistry.registry[inName];
	},
	registered: function(inName) {
		return Boolean(declarationRegistry.declByName(inName));
	},
	create: function(inName) {
		return declarationRegistry.declByName(inName).create();
	}
};

document.register = declarationRegistry.register;
document.createElement = function(inName) {
	return declarationRegistry.registered(inName) ? declarationRegistry.create(inName) 
		: document.__proto__.createElement.call(document, inName);
};