(function(scope) {

scope = scope || {};

var isTemplate = function(inNode) {
	//return (inNode.tagName == "TEMPLATE") && (inNode.hasAttribute("instantiate") || inNode.hasAttribute("iterate"));
	return (inNode.tagName == "TEMPLATE");
};

shadowImpl = {
	createShadow: function(inInstance, inDecl) {
		inInstance.lightdom = inInstance.cloneNode(true);
		inInstance.lightdom.model = inInstance.model;
		inInstance.lightdom.host = inInstance;
		shadowImpl.installDom(inInstance, inDecl);
		shadowImpl.observe(inInstance, inDecl);
		inInstance.render = function() {
			shadowImpl.installDom(inInstance, inDecl);
		};
	},
	installDom: function(inInstance, inDecl) {
		// create a source we can extract nodes from
		var source = inInstance.lightdom.cloneNode(true);
		// create a mutable dom from template
		var dom = inDecl.template && inDecl.template.content.cloneNode(true);
		// target for installation
		var target = inInstance;
		if (dom) {
			// build a immutable list of template <content> elements
			var c$ = [];
			$$(dom, "content").forEach(function(content) {
				c$.push(content)
			});
			// replace each <content> element with matching content
			c$.forEach(function(content) {
				// build a fragment to contain selected nodes
				var frag = document.createDocumentFragment();
				// find selected 'light dom' nodes
				var n$ = [];
				var slctr = content.getAttribute("select");
				var nodes = slctr ? $$(source, slctr) : source.childNodes;
				for (var i=0, n; (n=nodes[i]);) {
					if (isTemplate(n) || (n.parentNode != source)) {
						i++;
					} else {
						frag.appendChild(n);
					}
				}
				// replace the content node with the fragment
				content.parentNode.replaceChild(frag, content);
			});
		} else {
			dom = document.createDocumentFragment();
			while (source.childNodes[0]) {
				dom.appendChild(source.childNodes[0]);
			}
		}
		// install constructed dom
		target.textContent = '';
		target.appendChild(dom);
	},
	observe: function(inInstance, inDecl) {
		var contentChanges = function() {
			shadowImpl.installDom(inInstance, inDecl);
		};
		var observer = new WebKitMutationObserver(contentChanges);
		observer.observe(inInstance.lightdom, {
			characterData: true,
			childList: true,
			subtree: true
		});
	}
};

scope.shadowImpl = shadowImpl;

})(window.__exported_components_polyfill_scope__);