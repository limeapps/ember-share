"use strict";
function guid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0,
		v = c === 'x' ? r : r & 3 | 8;
		return v.toString(16);
	});
}

/*
* Software License Agreement (BSD License)
*
* Copyright (c) 2009-2011, Kevin Decker kpdecker@gmail.com
*
* Text diff implementation.
*
* This library supports the following APIS:
* JsDiff.diffChars: Character by character diff
* JsDiff.diffWords: Word (as defined by \b regex) diff which ignores whitespace
* JsDiff.diffLines: Line based diff
*
* JsDiff.diffCss: Diff targeted at CSS content
*
* These methods are based on the implementation proposed in
* "An O(ND) Difference Algorithm and its Variations" (Myers, 1986).
* http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.4.6927
* All rights reserved.
*/
function clonePath(path) {
	return { newPos: path.newPos, components: path.components.slice(0) };
}
var fbDiff = function(ignoreWhitespace) {
	this.ignoreWhitespace = ignoreWhitespace;
};
fbDiff.prototype = {
	diff: function(oldString, newString) {
		// Handle the identity case (this is due to unrolling editLength == 0
			if (newString === oldString) {
				return [{ value: newString }];
			}
			if (!newString) {
				return [{ value: oldString, removed: true }];
			}
			if (!oldString) {
				return [{ value: newString, added: true }];
			}

			newString = this.tokenize(newString);
			oldString = this.tokenize(oldString);

			var newLen = newString.length, oldLen = oldString.length;
			var maxEditLength = newLen + oldLen;
			var bestPath = [{ newPos: -1, components: [] }];

		// Seed editLength = 0
		var oldPos = this.extractCommon(bestPath[0], newString, oldString, 0);
		if (bestPath[0].newPos+1 >= newLen && oldPos+1 >= oldLen) {
			return bestPath[0].components;
		}

		for (var editLength = 1; editLength <= maxEditLength; editLength++) {
			for (var diagonalPath = -1*editLength; diagonalPath <= editLength; diagonalPath+=2) {
				var basePath;
				var addPath = bestPath[diagonalPath-1],
				removePath = bestPath[diagonalPath+1];
				oldPos = (removePath ? removePath.newPos : 0) - diagonalPath;
				if (addPath) {
					// No one else is going to attempt to use this value, clear it
					bestPath[diagonalPath-1] = undefined;
				}

				var canAdd = addPath && addPath.newPos+1 < newLen;
				var canRemove = removePath && 0 <= oldPos && oldPos < oldLen;
				if (!canAdd && !canRemove) {
					bestPath[diagonalPath] = undefined;
					continue;
				}

				// Select the diagonal that we want to branch from. We select the prior
				// path whose position in the new string is the farthest from the origin
				// and does not pass the bounds of the diff graph
				if (!canAdd || (canRemove && addPath.newPos < removePath.newPos)) {
					basePath = clonePath(removePath);
					this.pushComponent(basePath.components, oldString[oldPos], undefined, true);
				} else {
					basePath = clonePath(addPath);
					basePath.newPos++;
					this.pushComponent(basePath.components, newString[basePath.newPos], true, undefined);
				}

				oldPos = this.extractCommon(basePath, newString, oldString, diagonalPath);

				if (basePath.newPos+1 >= newLen && oldPos+1 >= oldLen) {
					return basePath.components;
				} else {
					bestPath[diagonalPath] = basePath;
				}
			}
		}
	},

	pushComponent: function(components, value, added, removed) {
		var last = components[components.length-1];
		if (last && last.added === added && last.removed === removed) {
			// We need to clone here as the component clone operation is just
			// as shallow array clone
			components[components.length-1] =
			{value: this.join(last.value, value), added: added, removed: removed };
		} else {
			components.push({value: value, added: added, removed: removed });
		}
	},
	extractCommon: function(basePath, newString, oldString, diagonalPath) {
		var newLen = newString.length,
		oldLen = oldString.length,
		newPos = basePath.newPos,
		oldPos = newPos - diagonalPath;
		while (newPos+1 < newLen && oldPos+1 < oldLen && this.equals(newString[newPos+1], oldString[oldPos+1])) {
			newPos++;
			oldPos++;

			this.pushComponent(basePath.components, newString[newPos], undefined, undefined);
		}
		basePath.newPos = newPos;
		return oldPos;
	},

	equals: function(left, right) {
		var reWhitespace = /\S/;
		if (this.ignoreWhitespace && !reWhitespace.test(left) && !reWhitespace.test(right)) {
			return true;
		} else {
			return left === right;
		}
	},
	join: function(left, right) {
		return left + right;
	},
	tokenize: function(value) {
		return value;
	}
};
// copied from https://github.com/Dignifiedquire/share-primus/blob/master/lib/client/share-primus.js
function patchShare() {
	// Map Primus ready states to ShareJS ready states.
	var STATES = {};
	STATES[window.Primus.CLOSED] = 'disconnected';
	STATES[window.Primus.OPENING] = 'connecting';
	STATES[window.Primus.OPEN] = 'connected';

	// Override Connection's bindToSocket method with an implementation
	// that understands Primus Stream.
	window.sharedb.Connection.prototype.bindToSocket = function(stream) {
		var connection = this;
		this.state = (stream.readyState === 0 || stream.readyState === 1) ? 'connecting' : 'disconnected';

		setState(Primus.OPENING);
		setState(stream.readyState);
		this.canSend = this.state === 'connected'; // Primus can't send in connecting state.

		// Tiny facade so Connection can still send() messages.
		this.socket = {
			send: function(msg) {
				stream.write(msg);
			}
		};

		stream.on('data', function(msg) {
			if(msg.a)
			{
				try {
					connection.handleMessage(msg);
				} catch (e) {
					connection.emit('error', e);
					throw e;
				}
			}
		});

		stream.on('readyStateChange', function() {
			// console.log(stream.readyState);
			setState(stream.readyState);
		});

		stream.on('reconnecting', function() {
			if(connection.state === "disconnected")
			{
				setState(Primus.OPENING);
				connection.canSend = false;
			}
		});

		function setState(readyState) {
			var shareState = STATES[readyState];
			connection._setState(shareState);
		}
    };
}
var isArray = Array.isArray || function (obj) {
	return obj instanceof Array;
};
var diff = new fbDiff(false);
exports.guid = guid;
exports.diff = diff;
exports.isArray = isArray;
exports.patchShare = patchShare;