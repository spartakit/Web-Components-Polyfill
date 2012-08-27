var registry = {
};

var register = function(inName, inOptions) {
	if (!inName) {
		throw("name required");
	}
	var prototype = inOptions.prototype;
	if (!prototype) {
		prototype = HTMLSpanElement.prototype;
	}
	if (!(prototype instanceof HTMLElement)) {
		throw "TypeMismatchError:  element prototype must inherit from HTMLElement";
	}
	var ctor = function() {
		var instance = document.createElement("div");
		instance.prototype = ctor.prototype;
		return instance;
	};
	ctor.prototype = inOptions.prototype;
	ctor.template = inOptions.template;
	registry[inName] = ctor;
	return ctor;
};
