function httpGetPage(url, method, data, xpath, onDone) {
	var rInfo = {};

	rInfo.url = url;
	rInfo.data = data;
	rInfo.noCache = true;
	rInfo.noProxy = true;
	rInfo.method = method ? method : "GET";
	console.log(url);
	rInfo.onDone = function(result, xhr, respContent) { 
		console.log(url + " return:" + xhr.status);

		if(xhr.status !== 200) {
			onDone(null);
			return;
		}

		var div = document.createElement("div");
		div.innerHTML = respContent;

		try {
			var node = xpath ? div.querySelector(xpath) : div;	
			onDone(node);
		}
		catch(e) {
			console.log(e.message);
		}
		
		delete div;
	}

	httpDoRequest(rInfo);

	return;
}

function xml2json(jso, node) {
	var key = normalizeBugKey(node.tagName);

	if(node.children.length) {
		jso.children = [];

		for(var i = 0; i < node.children.length; i++) {
			var child = {};
			var iter = node.children[i];

			key = normalizeBugKey(iter.tagName);
			if(iter.children.length) {
				xml2json(child, iter);
				child.name = key;
				jso.children.push(child);
			}
			else {
				jso[key] = iter.textContent;
			}
		}
	}
	else {
		jso[key] = node.textContent;
	}

	return jso;
}
				
function normalizeBugKeys(keys) {
	for(var i = 0; i < keys.length; i++) {
		var k = keys[i].replace(/"/g, "");
		keys[i] = normalizeBugKey(k);
	}

	return keys;
}

function csv2json(arr, content) {				
	var lines = content.split("\n");
	var keys = lines[0].split(",");

	normalizeBugKeys(keys);
	for(var i = 1; i < lines.length; i++) {
		var obj = {};
		var iter = "[" + lines[i] + "]";
		iter = iter.replace(/\\/g, '\\\\');
		iter = iter.replace(/,"""/g, ',"\\"');
		iter = iter.replace(/""",/g, '\\"",');
		iter = iter.replace(/""/g, '\\"');
		
		try {
			var values = JSON.parse(iter);
			for(var k = 0; k < values.length; k++) {
				var key = keys[k];
				var value = values[k];
				obj[key] = value;
			}

			arr.push(obj);
		}
		catch(e) {
			console.log(e.message + ": " + iter);
		}
	}

	return arr;
}

function getOptionsFromSelect(select) {
	if(!select) {
		return null;
	}

	var options = [];

	for(var i = 0; i < select.children.length; i++) {
		var iter = select.children[i];
		var value = iter.getAttribute("value");
		var name = iter.textContent.trim();
		var opt = {};
		opt.name = name;
		opt.value = value ? value : name;
		
		options.push(opt);
	}

	return options;
}

function extractParamsFromURI(uri) {
	var obj = {};
	var str = uri.split("?")[1];
	var params = str.split("&");
	for(var i = 0; i < params.length; i++) {
		var arr = params[i].split("=");
		if(arr.length == 2) {
			obj[arr[0]] = arr[1];
		}
	}

	return obj;
}

function translateText(text) {
	return text;
}
