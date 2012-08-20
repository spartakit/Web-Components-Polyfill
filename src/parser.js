(function(scope) {

// NOTE: uses 'window' and 'document' globals

scope = scope || {};

scope.parser = {
	parseDocument: function(inDocument) {
		console.group(inDocument.name || inDocument.URL);
		this.parseExternalScripts(inDocument);
		this.parseLinkedDocuments(inDocument);
		this.parseElements(inDocument);
		console.groupEnd();
	},
	parseLinkedDocuments: function(inDocument) {
		this.parseDocuments(this.fetchDocuments($$(inDocument, 'link[rel=components]')));
	},
	fetchDocuments: function(inLinks) {
		var docs = [];
		forEach(inLinks, function(link) {
			docs.push(scope.componentLoader.fetch(link));
		});
		return docs;
	},
	parseDocuments: function(inDocs) {
		forEach(inDocs, this.parseDocument, this);
	},
	parseExternalScripts: function(inDocument) {
		if (inDocument != document) {
			$$(inDocument, 'script[src]').forEach(this.injectScriptElement);
		}
	},
	// FIXME: only here so it can be stubbed for testing
	// Instead, expose a 'utils' object on 'scope' for such things
	injectScriptElement: function(inScript) {
		var ss = document.createElement("script");
		ss.textContent = scope.componentLoader.fetch(inScript);
		document.body.appendChild(ss);
	},
	parseElements: function(inDocument) {
		$$(inDocument, 'element').forEach(function(element) {
			this.parseElement(element);
		}, this);
	},
	parseElement: function(inElement) {
		scope.declarationFactory.createDeclaration(inElement);
	}
};

})(window.__exported_components_polyfill_scope__);