(function(scope) {

// NOTE: uses 'window' and 'document' globals

scope = scope || {};

parser = {
	parsed: [],
	parse: function(inDocument, inOnElement) {
		this.onElement = inOnElement;
		this.parseDocument(inDocument);
	},
	parseDocument: function(inDocument) {
		var id = inDocument.name || inDocument.URL;
		if (this.parsed[id]) {
			console.warn("ignoring duplicate document: ", id)
		} else {
			console.group(id);
			this.parseExternalScripts(inDocument);
			this.parseLinkedDocuments(inDocument);
			this.parseElements(inDocument);
			console.groupEnd();
		}
	},
	parseLinkedDocuments: function(inDocument) {
		this.parseDocuments(this.fetchDocuments($$(inDocument, 'link[rel=components]')));
	},
	fetchDocuments: function(inLinks) {
		var docs = [];
		forEach(inLinks, function(link) {
			docs.push(scope.componentLoader.fetch(link));
		}, this);
		return docs;
	},
	parseDocuments: function(inDocs) {
		forEach(inDocs, this.parseDocument, this);
	},
	parseExternalScripts: function(inDocument) {
		if (inDocument != document) {
			$$(inDocument, 'script[src]').forEach(this.injectScriptElement, this);
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
		this.onElement(inElement);
		//scope.declarationFactory.createDeclaration(inElement);
	}
};

scope.parser = parser;

})(window.__exported_components_polyfill_scope__);