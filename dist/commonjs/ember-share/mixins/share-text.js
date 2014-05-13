"use strict";
/*
* Share-text mixin, this mixin sends text operations instead of the default
* behaviour which is to replace the entire string. to utilize the mixin add
* the text property names to the textKeys array
*/
var isArray = require("../utils").isArray;
var diff = require("../utils").diff;
exports["default"] = Ember.Mixin.create({
	textKeys : [],
	triggerEvents : false,
	textEvents : function(){
		var that = this;
		this._textContexts = new Array(this.textKeys.length);

		// to hold the listners and remove them on destory
		this._handlers = new Array(this._textContexts.length * 2);
		for (var i = 0; i < this.textKeys.length; i++) {
			var key = this.textKeys[i];
			var subCtx = this._context.createContextAt([key]);
			this._handlers[key] = new Array(2);

			// server changes -> local
			this._handlers[key].push(subCtx.on('insert',Ember.run.bind(this,this.handleInsert,key)));
			this._handlers[key].push(subCtx.on('delete',Ember.run.bind(this,this.handleDelete,key)));
			this._textContexts[key] = subCtx;
		}
	}.on('init'),
	setUnknownProperty: function (key, value) {
		if(this.textKeys.indexOf(key) >= 0)
		{
			// local changes -> server
			this.textOp(key,value);
		}
		else 
		{
			this._super(key,value);
		}
	},
	textOp : function(key,value){

		// when the object was removed but has a lingering binding
		// propably an assertion is better
		if(this._context.get() === undefined)
		{
			return;
		}
		this.propertyWillChange(key);
		var components = diff.diff(this._cache[key] || "", value.replace(/\r\n/g, '\n'));
		this._cache[key] = value.replace(/\r\n/g, '\n');
		var changePosition = 0;
		for (var i = 0; i < components.length; i++) {
			if(components[i].added)
			{
				this._context.insert([key,changePosition],components[i].value);
			}
			else if(components[i].removed)
			{
				this._context.remove([key,changePosition],components[i].value.length);
			}
			changePosition += components[i].value.length;
		}
		this.propertyDidChange(key);
	},
	handleInsert : function (key, position, data) {
		this.propertyWillChange(key);
		if(this._cache[key] === undefined)
		{
			// force caching
			this.get(key);
		}
		var updatedText = this._cache[key].slice(0,position) + data + this._cache[key].slice(position);
		this._cache[key] = updatedText;
		// use trigger to update the view when in DOM
		if(this.triggerEvents)
		{
			this.trigger('textInsert',position,data);
		}
		this.propertyDidChange(key);
	},
	handleDelete : function (key, position, data) {
		if(this._cache[key] === undefined)
		{
			// force caching
			this.get(key);
		}
		this.propertyWillChange(key);
		var length = data.length;
		var updatedText = this._cache[key].slice(0,position) + this._cache[key].slice(position+length);
		this._cache[key] = updatedText;
		// use trigger to update the view when in DOM
		if(this.triggerEvents)
		{
			this.trigger('textDelete',position,data);
		}
		this.propertyDidChange(key);
	},
	willDestroy : function(){
		// remove the listners
		for (var key in this._textContexts)
		{
			this._textContexts[key].removeListener(this._handlers[key][0]);
			this._textContexts[key].removeListener(this._handlers[key][1]);
			this._textContexts[key].destroy();
		}
		this._super();
	}
});