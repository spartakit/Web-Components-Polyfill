(function(scope) {

scope = scope || {};

// NOTE: uses 'window' and 'document' globals

scope.webComponentsReady = function() {
	var e = document.createEvent('Event');
	e.initEvent('WebComponentsReady', true, true);
	window.document.body.dispatchEvent(e);
};

scope.ready = function() {
	scope.declarationFactory.createHostSheet();
	scope.componentLoader.preload(document, function() {
		scope.parser.parseDocument(document);
		scope.declarationRegistry.morphAll(document);
		scope.webComponentsReady();
	});
};

scope.run = function() {
	document.addEventListener('DOMContentLoaded', scope.ready);
};

if (!scope.runManually) {
	scope.run();
}

})(window.__exported_components_polyfill_scope__);
