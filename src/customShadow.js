(function(scope) {

// NOTE: uses 'window' and 'document' globals

scope = scope || {};

customShadowImpl = {
	createShadowRoot: function(element) {
		return element.host = element;
	},
	installDom: function(inComponent) {
		// create a source we can extract nodes from
		var source = inComponent.lightdom.cloneNode(true);
		// create a mutable template
		var template = inComponent.template && inComponent.template.content.cloneNode(true);
		// target for installation
		var target = inComponent.node;
		// recursively calculate replacements for <shadow> nodes, if any
		if (template) {
			this.renderShadows(template, inComponent.__proto__);
		}
		// build a immutable list of template <content> elements
		var c$ = [];
		if (template) {
			$$(template, "content").forEach(function(content) {
				c$.push(content)
			});
		}
		// replace each <content> element with matching content
		c$.forEach(function(content) {
			// build list of 'light dom' nodes that we will distribute
			var n$ = [];
			var slctr = content.getAttribute("select");
			var nodes = slctr ? $$(source, slctr) : source.childNodes;
			forEach(nodes, function(n) {
				// simulate shadow dom
				n.logicalParent = n.parentNode;
				// filter out template nodes
				if (!isTemplate(n)) {
					n$.push(n);
				}
			});
			// build a fragment from the selected nodes
			var frag = document.createDocumentFragment();
			n$.forEach(function(n) {
				frag.appendChild(n);
			});
			// replace the content node with the fragment
			content.parentNode.replaceChild(frag, content);
		});
		// if there is any unselected content, send it to the bit bucket
		target.textContent = '';
		// the transformed dom
		target.appendChild(template);
	},
	renderShadows: function(inTemplate, inPrototype) {
		// if this template has a <shadow> node
		var shadow = $(inTemplate, "shadow");
		if (shadow) {
			// fetch the shadow dom that would be rendered
			// by my ancestors (recusively)
			var srcShadow = customShadowImpl.fetchShadow(inPrototype);
			if (srcShadow) {
				shadow.parentNode.replaceChild(srcShadow, shadow);
			}
		}
		return inTemplate;
	},
	fetchShadow: function(inPrototype) {
		// find ancestor template
		var p = inPrototype.__proto__;
		while (p && !p.hasOwnProperty("template")) {
			p = p.__proto__;
		}
		if (p) {
			// now render any ancestor shadow DOM (recurse)
			return customShadowImpl.renderShadows(p.template.content.cloneNode(true), p);
		}
	}
};

var isTemplate = function(inNode) {
	return inNode.tagName == "TEMPLATE";
};
		
// exports

scope.customShadowImpl = customShadowImpl;

})(window.__exported_components_polyfill_scope__);