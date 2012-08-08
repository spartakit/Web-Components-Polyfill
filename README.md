# Changes in Kill Kenny

## important

* Inject component script into main document body so that it's debuggable.
* *extends* now supports custom components and shadow dom.
* Support `<link rel="stylesheet">` in `<element>`
* Support `<link rel="components">` in component documents
* Partial *@host* support via host file sheet injection
* Fire *WebComponentsReady* event on body when component parsing is complete
* *Instance-of-base* morphing strategy:
	* If an x-foo is a div, the created element is a div with x-foo decoration, instead of the other way around. 
	* Supports replaced-elements with shadow dom (e.g. Image)
	* Resulting objects have the tagName of the underlying dom node, so are tagged with is attribute (`<x-foo>` becomes `<div is="x-foo">`)

## esoteric

* Implemented *declarationRegistry*
* Made document load synchronous for ease of implementation (**todo**: make async)
* Support both `<x-foo>` and `<tag is="x-foo">` syntaxes
* Renamed *element* property of Declaration to *archetype*.
* Removed *elementPrototype* and useless initialization of *generatedConstructor.prototype* in *generateConstructor*.
* Refactored implementation of *lifecycle* clarifying that those methods install on *Declaration*.
* Renamed *nil* to *nop*
* Component constructors are implemented in terms of *morph*, *document.createElement* support implemented via constructor
* Refactor *parser*, *loader*, and *factory* objects into singletons



