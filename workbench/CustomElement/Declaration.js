var nob = {};

flags = {
	realXTags: false
};

Declaration = function(inName, inExtendsName, inTemplate) {
	this.name = inName;
	this.extendsName = inExtendsName;
	this.template = inTemplate;
	this.lifecycle = nob;
};

Declaration.prototype = {
	imperatively: function(inClass, inLifecycle) {
		this.declClass = inClass,
		this.lifecycle = inLifecycle
		this.initialize();
		this.finalize();
	},
	initialize: function() {
		this.element = new HTMLElementElement(this.name, this.extendsName, this.setLifecycle.bind(this));
		//
		var ctor = this.generatedConstructor = this.generateConstructor();
		if (this.declClass) {
			ctor.prototype = new this.declClass();
		}
		//
		this.ancestor = declarationRegistry.declByName(this.extendsName) || nob;
		this.baseTag = this.ancestor.baseTag || this.extendsName || "div";
	},
	generateConstructor: function() {
		var decl = this;
		return function() {
			return decl.create();
		};
	},
	finalize: function() {
		var proto = this.generatedConstructor.prototype.__proto__;
		if (this.ancestor !== nob) {
			// non-dom inheritance
			proto.__proto__ = this.ancestor.generatedConstructor.prototype;
		} else {
			// DOM-based inheritance
			var base = this.createBaseInstance();
			if (!flags.realXTags) {
				base = base.__proto__;
			}
			proto.__proto__ = base;
		}
	},
	createBaseInstance: function() {
		return document.__proto__.createElement.call(document, this.baseTag);
	},
	setLifecycle: function(inLifecycle) {
		this.lifecycle = inLifecycle;
	},
	create: function(inNode) {
		var instance = inNode ? this.morph(inNode) : this.instance();
		instance.setAttribute("is", this.name);
		instance.render = function(){ this.render(instance); }.bind(this);
		this.created(instance, this.createShadowDom(instance, this));
		this.render(instance);
		return instance;
	},
	instance: function() {
		// if "realXTags", create an <x-[name]>, losing bindings (aka replaced elements won't work)
		// otherwise, create a <[baseTag]> with bindings intact
		var instance = document.__proto__.createElement.call(document, flags.realXTags ? this.name : this.baseTag);
		instance.__proto__ = this.generatedConstructor.prototype;
		return instance;
	},
	morph: function(inNode) {
		return inNode;
	},
	createShadowDom: function(inNode) {
		return shadowImpl.createShadow(inNode, this);
	},
	render: function(inNode) {
		shadowImpl.installDom(inNode, this);
	},
	invoke: function(inMethod, inInstance, inArgs) {
		return inMethod && inMethod.apply(inInstance, inArgs);
	},
	created: function(inInstance, inShadow) {
		this.key = this.invoke(this.lifecycle.created, inInstance,
			[inShadow, this.ancestor.lifecycle && this.ancestor.lifecycle.key]);
	},
	// TODO: find a way to discover if we are inserted
	inserted: function(inInstance) {
		this.invoke(this.lifecycle.created, inInstance);
	},
	// TODO: find a way to discover if we are removed
	removed: function(inInstance) {
		this.invoke(this.lifecycle.removed, inInstance);
	}
};

interfaceImpl = {
};