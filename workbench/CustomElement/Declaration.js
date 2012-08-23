var nob = {};

flags = window.flags || {}

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
		if (this.ancestor !== nob) {
			// non-dom inheritance
			this.generatedConstructor.prototype.__proto__.__proto__ = this.ancestor.generatedConstructor.prototype;
		} else {
			return inheritanceImpl.inheritDom.call(this);
		}
	},
	createBaseElement: function() {
		return document.__proto__.createElement.call(document, this.baseTag);
	},
	createElement: function() {
		// if "realXTags", create an <x-[name]>, losing bindings (aka replaced elements won't work)
		// otherwise, create a <[baseTag]> with bindings intact
		return document.__proto__.createElement.call(document, flags.realXTags ? this.name : this.baseTag);
	},
	setLifecycle: function(inLifecycle) {
		this.lifecycle = inLifecycle;
	},
	create: function(inNode) {
		var instance = inNode ? this.morph(inNode) : this.instance();
		instance.setAttribute("is", this.name);
		this.created(instance, this.createShadowDom(instance, this));
		//this.render(instance);
		return instance;
	},
	instance: function() {
		return inheritanceImpl.instance.call(this);
	},
	morph: function(inNode) {
		return inNode;
	},
	createShadowDom: function(inNode) {
		return shadowImpl.createShadow(inNode, this);
	},
	invoke: function(inMethodName, inInstance, inArgs) {
		return inheritanceImpl.invoke.call(this, inMethodName, inInstance, inArgs);
	},
	created: function(inInstance, inShadow) {
		this.key = this.invoke("created", inInstance,
			[inShadow, this.ancestor.lifecycle && this.ancestor.lifecycle.key]);
	},
	// TODO: find a way to discover if we are inserted
	inserted: function(inInstance) {
		this.invoke("inserted", inInstance);
	},
	// TODO: find a way to discover if we are removed
	removed: function(inInstance) {
		this.invoke("removed", inInstance);
	}
};

publicInheritanceImpl = {
	instance: function() {
		var instance = this.createElement();
		instance.__proto__ = this.generatedConstructor.prototype;
		return instance;
	},
	inheritDom: function() {
		var proto = this.generatedConstructor.prototype.__proto__;
		// DOM-based inheritance
		var base = this.createBaseElement();
		if (!flags.realXTags) {
			base = base.__proto__;
		}
		proto.__proto__ = base;
	},
	invoke: function(inMethodName, inInstance, inArgs) {
		var fn = this.lifecycle[inMethodName];
		return fn && fn.apply(inInstance, inArgs || []);
	}
};

protectedInheritanceImpl = {
	instance: function() {
		var instance = this.createElement();
		this.generatedConstructor.prototype.bind(instance);
		return instance;
	},
	inheritDom: function() {
	},
	invoke: function(inMethodName, inInstance, inArgs) {
		var fn = inInstance[inMethodName];
		return fn && fn.apply(inInstance, inArgs);
	}
};

inheritanceImpl = flags.protect ? protectedInheritanceImpl : publicInheritanceImpl;