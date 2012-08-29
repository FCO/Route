function Route(){
	if(Route.everyRoute === undefined)
		Route.everyRoute = [];

	Route.everyRoute.push(this);
}

Route.getRoot = function() {
	if(Route.root === undefined)
		Route.root = new Route();
	return Route.root;
}

Route.prototype = {
	_clone: function() {
		var clone = new Route();
		for(var key in this) {
			clone[key] = this[key];
		}
		return clone;
	},
	_read_templates_from_scripts: function() {
		var scripts = document.getElementsByTagName("script");
		for(var i = 0; i < scripts.length; i++) {
			if(scripts[i].type.toLowerCase() != "route/template") {
				continue;
			}
			var templateName    = scripts[i].id;
			var templateContent = scripts[i].innerHTML;
			var update          = scripts[i].getAttribute("update");
			var onSet           = scripts[i].getAttribute("onSet");
			var onSetList;
			var onChange        = scripts[i].getAttribute("onChange");
			var onChangeList;

			//console.log(onSetList);
			if(templateName == null)
				throw "You MUST give a name for the template";
			if(! templateContent.match(/^\s*$/))
				this.createTemplate(templateName, templateContent);
			if(onSet != null) {
				onSetList = onSet.split(/\s+/);
				for(var j = 0; j < onSetList.length; j++) {
					//console.log("this.onSet(" + onSetList[j] + ").render(" + templateName + ").update(" + (eval(update)) + ")");
					this.createVariable(onSetList[j]);
					this.onSet(onSetList[j]).render(templateName).update(eval(update));
				}
			}
			if(onChange != null) {
				onChangeList = onChange.split(/\s+/);
				if(onChangeList !== undefined)
					for(var j = 0; j < onChangeList.length; j++) {
						var change = onChangeList[j].split(/=/);
						if(change[1] !== undefined)
							this.createVariable(change[1]);
						this.onChange(eval(change[0]), change[1]).render(templateName).update(eval(update));
					}
			}
		}
		return this;
	},
	//_created:    {},
	__after_setter: function(varName) {
		for(var i = 0; i < this._onSetQueue[varName].length; i++)
			this._onSetQueue[varName][i].exec(this._realValues[varName]);
	},
	__after_getter: function(varName) {
		for(var i = 0; i < this._onGetQueue[varName].length; i++)
			this._onGetQueue[varName][i].exec(this._realValues[varName]);
	},
	_elementCounter: 0,
	render: function(template) {
		if(! this.templateExists(template))
			throw "Template '" + template + "' does not exist";
		return this._templates[template].render();
	},
	createTemplate: function(name, template) {
//console.log(this);
		if(this._templates == null)
			this._templates = {};
//console.log(this._templates);
		//this._templates[name] = template;
		if(typeof(template) == typeof("")) 
			this._templates[name] = new Template(template, this);
		else
			this._templates[name] = template;
	},
	templateExists: function(name) {
		return this._templates[name] != null
	},
	variableExists: function(varName) {
		return this._created[varName] != undefined;
	},
	createVariable: function(varName) {
		if(this._created === undefined)
			this._created = {};
		this._created[varName]    = true;
		if(this._realValues === undefined)
			this._realValues = {};
		if(this._onGetQueue === undefined)
			this._onGetQueue = {};
		if(this._onSetQueue === undefined)
			this._onSetQueue = {};

		this._onGetQueue[varName] = [];
		this._onSetQueue[varName] = [];

		this.__defineSetter__(varName, function(value){
			if(! this._created[varName]) return;
			this._realValues[varName] = value;
			//for(var i = 0; i < this._onSetQueue[varName].length; i++)
			//	this._onSetQueue[varName][i].exec(value);
			this.__after_setter(varName);
		});
		this.__defineGetter__(varName, function(){
			if(! this._created[varName]) return;
			//this.__after_getter(varName);
			//for(var i = 0; i < this._onGetQueue[varName].length; i++)
			//	this._onGetQueue[varName][i].exec(value);
			return this._realValues[varName];
		});
		return this;
	},
	onGet: function(varName) {
		return new RouteChange(varName, "_onGetQueue", this);
	},
	onSet: function(varName) {
		return new RouteChange(varName, "_onSetQueue", this);
	},
	onChange: function(element, varName) {
		if(typeof(element.get) == typeof(function(){})) 
			element = element.get(0);

		if(varName === undefined) {
			varName = "element_" + this._elementCounter++;
			this.createVariable(varName);
		}
		var _this = this;
		var my_func = function(){
			_this[varName] = this.value;
			//_this.__after_setter(varName);
		};

		if(! this.variableExists(varName))
			throw "Variable '" + varName + "' does not exist";

		if(element.tagName.toUpperCase() == "INPUT".toUpperCase()) {
			element.onkeyup = my_func;
		} else if(element.tagName.toUpperCase() == "SELECT".toUpperCase()) {
			element.onchange = my_func;
		} else throw "You can only use 'onChange' on elements of type INPUT or SELECT";

		return new RouteChange(varName, "_onSetQueue", this);
	},
};

function RouteChange(varName, type, owner){
	this._varName = varName;
	this._type    = type;
	this._owner   = owner;
	this._templates = owner._templates;
}

RouteChange.prototype = {
	_type: "",
	_transforms: [],
	clear: function(element) {
		return this.transform(function(value){
			if(element === undefined)
				element = document.body;
			if(typeof(element.get) == typeof(function(){})) 
				element = element.get(0);
			element.innerHTML = "";
			return value
		});
	},
	filter:    function(filter) { return this.transform(function(value){if(! (filter(value)) ) return null; return value}); },
	filter_gt: function(number) { return this.transform(function(value){if(! (value > number) ) return null; return value}); },
	filter_lt: function(number) { return this.transform(function(value){if(! (value < number) ) return null; return value}); },
	filter_ge: function(number) { return this.transform(function(value){if(! (value >= number) ) return null; return value}); },
	filter_le: function(number) { return this.transform(function(value){if(! (value <= number) ) return null; return value}); },
	filter_eq: function(number) { return this.transform(function(value){if(! (value == number) ) return null; return value}); },
	filter_ne: function(number) { return this.transform(function(value){if(! (value != number) ) return null; return value}); },
	filter_regex: function(regex) { return this.transform(function(value) {if(value !== undefined &&   value.toString().match(regex) ) return null; return value}); },
	filter_nregex: function(regex) { return this.transform(function(value){if(value !== undefined && ! value.toString().match(regex) ) return null; return value}); },
	transform: function(trans) {
		var newRoute = this._owner._clone();
		newRoute.createVariable("transformated");
		newRoute._templates = this._owner._templates;
		
		this._owner[this._type][this._varName].push({exec: function(value){newRoute.transformated = trans(value)}});
		return newRoute.onSet("transformated");
	},
	each: function(varName) {
		if(varName == null)
			varName = "loop";
		var newRoute = this._owner;
		//var newRoute = this._owner._clone();
		newRoute.createVariable(varName);
		this._owner[this._type][this._varName].push({exec: function(value){
			if(typeof(value) == typeof([]))
				for(var i = 0; i < value.length; i++) {
					newRoute[varName] = value[i];
				}
			else newRoute[varName] = trans(varName);
		}});
		return newRoute.onSet(varName);
	},
	log: function() {
		this._owner[this._type][this._varName].push({exec: function(value){console.log(value)}});
		return this;
	},
	'alert': function() {
		this._owner[this._type][this._varName].push({exec: function(value){alert(value)}});
		return this;
	},
	run: function(callback) {
		this._owner[this._type][this._varName].push({exec: function(value){callback(value)}});
		return this;
	},
	prepend: function(element) {
		this._owner[this._type][this._varName].push({
			exec: function(value) {
				if(element === undefined)
					element = document.body;
				if(typeof(element.get) == typeof(function(){})) 
					element = element.get(0);
				element.innerHTML = value + element.innerHTML;
			}});
		return this;
	},
	append: function(element) {
		this._owner[this._type][this._varName].push({
			exec: function(value) {
				if(element === undefined)
					element = document.body;
				if(typeof(element.get) == typeof(function(){})) 
					element = element.get(0);
				element.innerHTML += value;
			}});
		return this;
	},
	update: function(element) {
		this._owner[this._type][this._varName].push({
			exec: function(value) {
				if(element === undefined)
					element = document.body;
				if(typeof(element.get) == typeof(function(){})) 
					element = element.get(0);
				element.innerHTML = value;
			}});
		return this;
	},
	render: function(template) {
//console.log("<<<<<-------");
//console.log(this._owner);
		_this = this;
		if(! this._owner.templateExists(template))
			throw "Template '" + template + "' does not exist";
		return this.transform(function() {
			return _this._owner.render(template)
		});
	},
	setAfter: function(varName) {
		var _this = this;
		if(! this._owner.variableExists(varName))
			throw "Variable '" + varName + "' does not exist";
		//this.run(function(value){_this._owner[varName] += value; _this._owner.__after_setter(varName)})
		this.run(function(value){_this._owner[varName] += value;})
	},
	setBefore: function(varName) {
		var _this = this;
		if(! this._owner.variableExists(varName))
			throw "Variable '" + varName + "' does not exist";
		//this.run(function(value){_this._owner[varName] = value + _this._owner[varName]; _this._owner.__after_setter(varName)})
		this.run(function(value){_this._owner[varName] = value + _this._owner[varName];})
	},
	set: function(varName) {
		var _this = this;
		if(! this._owner.variableExists(varName))
			throw "Variable '" + varName + "' does not exist";
		//this.run(function(value){_this._owner[varName] = value; _this._owner.__after_setter(varName)})
		this.run(function(value){_this._owner[varName] = value;})
	},
};

function Template(str, router) {
	this.template_str = str;
	this.router       = router;
	this.data         = [];
	this.compile();
}

Template.prototype = {
	compile: function() {
		var temp_arr = this.template_str.split(/<%|%>/);
		for(var i = 0; i < temp_arr.length; i++) {
			if(temp_arr[i] != null) {
				if(i % 2 == 0) {
					this.data.push(temp_arr[i]);
				} else {
					var tmp = temp_arr[i];
					var blk = this.parseBlock(temp_arr, i);
					var cmd = this.parse(tmp, blk);
					this.data.push({'cmd': cmd, block: blk});
				}
			}
		}
	},
	parseBlock: function(array, index) {
		var block      = 0;
		var actual = array.splice(index, 1).toString();
		var orig;
		var str_blk = "";
		var sep = ["<%", "%>"];
		var counter = 0;
		var initial = 1;
		
		while(initial == 1 || block != 0) {
			initial = 0;
			for(var i = 0; i < actual.length; i++) {
				if(actual[i] == "{") {
					block++;
					continue;
				}
				if(actual[i] == "}") {
					block--;
					if(block == 0) break;
				}
				if(block > 0) {
					str_blk += actual[i];
					actual[i] = "";
				}
				if(block == 0) {
					orig += actual[i];
				}
			}
			if(block != 0){
				if(counter++ != 0) str_blk += sep[counter % 2];
				actual = array.splice(index, 1).toString();
			}
		}
		array.unshift(orig);

		return str_blk.replace(/<%\s*$/m, "");
	},
	parse: function(code, block) {
		var ret = {};
		var transformed = code.replace(/^\s+|\s+$/g, "");
		if(transformed.match(/^=/)) {
			ret = {'return': this.parseCmds(transformed.replace(/^=\s*/, ""), block)};
		} else {
			ret = {'nreturn': this.parseCmds(transformed, block)};
		}
		return ret;
	},
	parseCmds: function(code, block) {
		var ret = {};
		var transformed = code.replace(/^\s+|\s+$/g, "");
		var match;
//console.log(transformed);
		//if(transformed.match(/^=/)) {
		//	ret = {'return': this.parse(transformed.replace(/^=\s*/, ""))};
		//} else
		if(transformed.match(/\|$/)) {
			ret = {'noundef': this.parse("=" + transformed.replace(/\s*\|$/, ""))};
		} else if(match = transformed.match(/^\s*FOR\s+(\w+)\s+IN\s+(\w+)\s*\{?\s*$/m)) {
			// Vai ser o For!
			console.log("for parse block: " + (block));
			this.router.createTemplate("bla", block);
			//ret = {'for': {for_var: match[1], for_list: match[2]}};
			ret = {'none': ''};
		} else if(transformed.match(/^\w+$/)) {
			ret = {'var': transformed};
		} else {
			//throw "Command not recognized";
			ret = {none: ""};
		}
		return ret;
	},
	'none': function(){},
	'for': function(data, block) {
		//console.log("for data: "  + JSON.stringify(data))
		//console.log("for block: " + JSON.stringify(block))
	},
	'var': function(varName) {
		return this.router[varName];
	},
	'noundef': function(data) {
		var ret = this.execute(data);
		return (ret == undefined ? "" : ret);
	},
	'return': function(data) {
		return this.execute(data);
	},
	'nreturn': function(data) {
		this.execute(data);
	},
	render: function() {
		var content = "";
		var _this = this;
		this.data.forEach(function(data){
			if(typeof(data) == typeof({})) {
				var cmd = data.cmd;
				content += _this.execute(cmd);
			} else content += data;
		});
		return content;
	},
	execute: function(data) {
		var ret = "";
//console.log("data: " + JSON.stringify(data));
		var blk = delete data['__BLK__'];
		for(var cmd in data) {
			ret = this[cmd](data[cmd], blk);
		}
		return ret;
	},
		
};













