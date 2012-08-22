var isTemplate = function(inNode) {
	return inNode.tagName == "TEMPLATE";
};

shadowImpl = {
	createShadow: function(inInstance, inDecl) {
		inInstance.lightdom = inInstance.cloneNode(true);
		inInstance.lightdom.host = inInstance;
	},
	installDom: function(inInstance, inDecl) {
		// create a source we can extract nodes from
		var source = inInstance.lightdom.cloneNode(true);
		// create a mutable dom from template
		var dom = inDecl.template && inDecl.template.content.cloneNode(true);
		// target for installation
		var target = inInstance;
		// build a immutable list of template <content> elements
		var c$ = [];
		if (dom) {
			$$(dom, "content").forEach(function(content) {
				c$.push(content)
			});
		} else {
			var dom = document.createDocumentFragment();
			while (source.childNodes[0]) {
				dom.appendChild(source.childNodes[0]);
			}
		}
		// replace each <content> element with matching content
		c$.forEach(function(content) {
			// build a fragment to contain selected nodes
			var frag = document.createDocumentFragment();
			// find selected 'light dom' nodes
			var n$ = [];
			var slctr = content.getAttribute("select");
			var nodes = slctr ? $$(source, slctr) : source.childNodes;
			for (var i=0, n; (n=nodes[i]);) {
				if (isTemplate(n)) {
					i++;
				} else {
					frag.appendChild(n);
				}
			}
			// replace the content node with the fragment
			content.parentNode.replaceChild(frag, content);
		});
		// install constructed dom
		target.textContent = '';
		target.appendChild(dom);
	}
};
