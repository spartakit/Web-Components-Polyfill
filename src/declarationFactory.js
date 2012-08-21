(function(scope) {

// NOTE: use attributes on the script tag for this file as directives

// noshadow=""			use custom content insertion algorithm instead of WebkitShadowDom
// clonemorph=""		morph nodes via cloning superclass node

// NOTE: uses 'window' and 'document' globals

scope = scope || {};

scope.declarationFactory = {
	createDeclaration: function(element) {
		// sugar
		var a = function(n) {
			return element.getAttribute(n);
		};
		// require a name
		var name = a('name');
		if (!name) {
			console.error('name attribute is required.');
			return;
		}
		//
		console.group("creating an", name, "declaration");
		//
		// instantiate a declaration
		var declaration = new scope.Declaration({
			name: name,
			tagName: a('extends') || 'div',
			resetStyleInheritance: a("reset-style-inheritance"),
			applyAuthorStyles: a("apply-author-styles"),
			template: this.normalizeTemplate($(element, 'template'))
		});
		// register the declaration so we can find it by name
		scope.declarationRegistry.register(name, declaration);
		// optionally install the constructor on the global object
		var ctor = a('constructor');
		if (ctor) {
			window[ctor] = declaration.archetype.generatedConstructor;
		}
		// fix css paths for inline style elements
		this.adjustTemplateCssPaths(element, declaration);
		// load component stylesheets
		this.sheets(element, declaration);
		// apply @host styles.
		this.applyHostStyles(declaration);
		// evaluate components scripts
		this.scripts(element, declaration);
		// expand components in our template
		if (declaration.template) {
			scope.declarationRegistry.morphAll(declaration.template.content);
		}
		// after scripts, our constructor should be ready
		declaration.finalize();
		//
		console.groupEnd();
	},
	normalizeTemplate: function(inTemplate) {
		if (inTemplate && !inTemplate.content) {
			var c = inTemplate.content = document.createDocumentFragment();
			while (inTemplate.childNodes.length) {
				c.appendChild(inTemplate.childNodes[0]);
			}
		}
		return inTemplate;
	},
	scripts: function(element, declaration) {
		// accumulate all script content from the element declaration
		var script = [];
		forEach($$(element, "script"), function(s) {
			script.push(s.textContent);
		});
		// if there is any code, inject it
		if (script.length) {
			scope.inject(script.join(';\n'), declaration.archetype, declaration.archetype.name);
		}
	},
	adjustTemplateCssPaths: function(element, declaration) {
		if (declaration.template) {
			var docUrl = scope.path.documentUrlFromNode(element);
			forEach($$(declaration.template.content, "style"), function(s) {
				s.innerHTML = scope.path.makeCssUrlsRelative(s.innerHTML, docUrl);
			});
		}
	},
	sheets: function(element, declaration) {
		var sheet = [];
		if (declaration.template) {
			console.group("sheets");
			forEach($$(element, "link[rel=stylesheet]"), function(s) {
				var styles = scope.componentLoader.fetch(s);
				styles = scope.path.makeCssUrlsRelative(styles, scope.path.nodeUrl(s));
				sheet.push(styles);
			});
			if (sheet.length) {
				console.log("sheets found (", sheet.length, "), injecting");
				var style = document.createElement("style");
				style.style.display = "none !important;";
				style.innerHTML = sheet.join('');
				declaration.template.content.appendChild(style);
			}
			console.groupEnd();
		}
	},
	hostRe:/(@host[^{]*)({[^{]*})/gim,
	applyHostStyles: function(declaration) {
		// strategy: apply a rule for each @host rule with @host replaced with the component name
		// into a stylesheet added at the top of head (so it's least specific)
		if (declaration.template) {
			forEach($$(declaration.template.content, "style"), function(s) {
				var matches, rule;
				while(matches = this.hostRe.exec(s.innerHTML)) {
					rule = this.convertHostRules(matches[1], declaration) + " " + matches[2];
					this.hostSheet.appendChild(document.createTextNode(rule));
				}
			}, this);
		}
	},
	// convert e.g. @host to x-foo, [is=x-foo]
	convertHostRules: function(selectors, declaration) {
		var o=[], parts = selectors.split(","), name = declaration.archetype.name;
		var h = "@host";
		parts.forEach(function(p) {
			if (p.indexOf(h) >= 0) {
				var r = p.trim();
				o.push(r.replace(h, name));
				o.push(r.replace(h, "[is=" + name + "]"));
			}
		});
		return o.join(", ");
	},
	// support for creating @host rules
	createHostSheet: function() {
		var s = document.createElement("style");
		var h = document.head;
		if (h.children.length) {
			h.insertBefore(s, h.children[0]);
		} else {
			h.appendChild(s);
		}
		this.hostSheet = s;
	}
};

})(window.__exported_components_polyfill_scope__);
