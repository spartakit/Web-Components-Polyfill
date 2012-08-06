module('Declaration');

test('.evalScript must attempt to evaluate script, wrapped in a shim', function() {
	var mockDeclaration = {
		archetype: {
			name: "test",
			evalOk: false
		}
	};
	// FIXME: registry is shared
	polyfill.declarationRegistry.register("test", mockDeclaration);
	polyfill.Declaration.prototype.evalScript.call(mockDeclaration, 'this.evalOk = true;');
	ok(mockDeclaration.archetype.evalOk);
	// FIXME: clean up registry
	polyfill.declarationRegistry.registry = {};
});

test('.morph must swizzle prototype of an existing object', 4, function() {
	var element = {};
	polyfill.Declaration.prototype.morph.call({
		archetype: {
			generatedConstructor: function() {},
			extendsTagName: 'div'
		},
		createShadowRoot: function(e) {
			equal(e.tagName, 'DIV');
			strictEqual(e, element);
			return 'foo';
		},
		created: function(shadowRoot) {
			strictEqual(this, element);
			equal(shadowRoot, 'foo');
		}
	}, element);
});

test('.createShadowRoot must exit early if there is no this.template', function() {
	var result = polyfill.Declaration.prototype.createShadowRoot.call({});
	ok(!result);
});

test('.createShadowRoot must create a WebKitShadowRoot instance', function() {
	var host = document.createElement('div');
	var result = polyfill.Declaration.prototype.createShadowRoot.call({
		template: {
			childNodes: []
		}
	}, host);
	equal(result.__proto__.constructor, WebKitShadowRoot);
});

test('.createShadowRoot must clone template child nodes into the newly created WebKitShadowRoot instance', function() {
	var host = document.createElement('div');
	var span = host.appendChild(document.createElement('span'));
	var b = host.appendChild(document.createElement('b'));
	equal(host.childNodes.length, 2);
	var result = polyfill.Declaration.prototype.createShadowRoot.call({
		template: {
			childNodes: [ span, b ]
		}
	}, host);
	equal(result.firstChild.tagName, 'SPAN');
	equal(result.lastChild.tagName, 'B');
	equal(host.childNodes.length, 2);
});

test('.prototypeFromTagName must return correct HTML element prototype', function() {
	equal(polyfill.Declaration.prototype.prototypeFromTagName.call({}, 'div').constructor, HTMLDivElement);
	equal(polyfill.Declaration.prototype.prototypeFromTagName.call({}, 'span').constructor, HTMLSpanElement);
	equal(polyfill.Declaration.prototype.prototypeFromTagName.call({}, 'table').constructor, HTMLTableElement);
});

test('constructor must correctly initialize instance members', function() {
	var declaration = new polyfill.Declaration({
		name: "scones",
		tagName: "div",
		template: "foo",
		resetStyleInheritance: true,
		applyAuthorStyles: true
	});
	equal(declaration.archetype.name, 'scones');
	equal(declaration.archetype.extendsTagName, 'div');
	equal(declaration.template, "foo");
	ok(declaration.resetStyleInheritance);
	ok(declaration.applyAuthorStyles);
	ok(Boolean(declaration.archetype.generatedConstructor));
});
