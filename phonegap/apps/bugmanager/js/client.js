/**
 * Desc: BugZilla JS Client.
 * Email: xianjimli@hotmail.com
 */

function BugZillaClient() {
	this.bugs = {};
	this.products = null;
	this.components = {};
	this.bugFieldOptions = {};

	this.getAccountName = function() {
		return this.account ? this.account.desc : "";
	}

	this.isLogin = function() {
		return !!this.account;
	}
	
	this.isFeatureSupported = function(feature) {
		var supportedFeatures = ["cross-product-search", "platform-field", "severity-field", "os-field", "resolution-field"];
		
		return supportedFeatures.indexOf(feature) >= 0;
	}

	this.login = function(account, onDone) {
		var me = this;
		var data = new FormData();
		var url = account.server + "/index.cgi";

		data.append("Bugzilla_login", account.username);
		data.append("Bugzilla_password", account.password);
		data.append("GoAheadAndLogIn", "Log in");
		
		httpGetPage(url, "POST", data, '#bugzilla-body', function (node) {
			var commonActions = node ? node.getElementsByClassName("bz_common_actions") : null;

			if(commonActions) {
				me.account = account;
				onDone(true);
			}
			else {
				onDone(false);
			}
		});

		return;
	}

	this.getProducts = function(onDone) {
		if(!onDone) {
			return this.products;
		}

		var me = this;
		var account = this.account;
		var url = account.server + "/describecomponents.cgi";
		
		httpGetPage(url, "GET", null, '#bugzilla-body', function (node) {
			var links = node ? node.querySelectorAll("a") : null;

			if(links) {
				me.products = [];
				for(var i = 0; i < links.length; i++) {
					var iter = links[i];
					var href = iter.getAttribute("href");
					if(href.indexOf("describecomponents.cgi?product=") >= 0) {
						var name = href.substr(href.indexOf("=") + 1);
						var product = {};
						product.name = decodeURI(name);
						product.href = name;
						product.id = name;
						var found = false;
						for(var k = 0; k < me.products.length; k++) {
							if(me.products[k].id == product.id) {
								found = true;
							}
						}

						if(!found) {
							me.products.push(product);	
						}
					}
					else if(href.indexOf("buglist.cgi") >= 0) {
						var params = extractParamsFromURI(href);
						if(params.product) {
							var name = params.product;
							var product = {};
							product.name = decodeURI(name);
							product.href = name;
							product.id = name;
							me.products.push(product);
						}
					}
				}

				onDone(me.products);
			}
			else {
				onDone(null);
			}
		});

		return;
	}

	this.getComponents = function(product, onDone) {
		if(!onDone) {
			return this.components[product.name];
		}

		var me = this;
		var account = this.account;
		var url = account.server + "/describecomponents.cgi?product=" + product.id;
		
		httpGetPage(url, "GET", null, '#bugzilla-body', function (node) {
			var links = node ? node.querySelectorAll("a") : null;

			if(links) {
				var components = [];
				for(var i = 0; i < links.length; i++) {
					var iter = links[i];
					var href = iter.getAttribute("href");
					if(href.indexOf("component=") >= 0) {
						var name = iter.textContent;
						var component = {};
						component.name = decodeURI(name);
						component.href = name;
						component.id = name;

						components.push(component);
					}
				}

				me.components[product.name] = components;
				onDone(product, components);
			}
			else {
				onDone(product, components);
			}
		});

		return;
	}

	this.runSearch = function(search, onDone) {
		var me = this;
		var rInfo = {};
		var account = this.account;
		var url = account.server + "/" + search + "&ctype=csv";
		
		rInfo.url = url;
		rInfo.noCache = true;
		rInfo.noProxy = !configIsProxyEnabled();
		rInfo.method = "GET";
		
		var bugs = [];
		rInfo.onDone = function(result, xhr, respContent) { 
			if(xhr.status === 200) {
				csv2json(bugs, respContent);
				onDone(search, bugs);
			}
			else {
				onDone(search, null);
			}
			return;
		}

		httpDoRequest(rInfo);
	
		return;
	}
	
	this.getAllBugs = function(product, component, onDone) {
		var productComponent = product.name + "-" + component.name;

		if(!onDone) {
			return this.bugs[productComponent];
		}

		var me = this;
		var rInfo = {};
		var account = this.account;
		var columnlist = "&columnlist=product%2Ccomponent%2Cassigned_to%2Cbug_status%2Cresolution%2Cshort_desc%2Cchangeddate%2Cpriority%2Creporter%2Cbug_severity%2Copendate%2Cop_sys%2Cversion";
		var query = "component=" + component.id + "&product=" + product.id;
		var url = account.server + "/buglist.cgi?" + query + columnlist + "&ctype=csv";
		
		rInfo.url = url;
		rInfo.noCache = true;
		rInfo.noProxy = !configIsProxyEnabled();
		rInfo.method = "GET";
		
		var bugs = [];
		rInfo.onDone = function(result, xhr, respContent) { 
			if(xhr.status === 200) {
				csv2json(bugs, respContent);
				onDone(product, component, bugs);
				me.bugs[productComponent] = bugs;
			}
			else {
				onDone(product, component, null);
			}
			return;
		}

		httpDoRequest(rInfo);
	
		return;
	}
	
	this.queryBug = function(id, onDone) {
		if(!onDone) {
			return null;
		}

		var me = this;
		var account = this.account;
		var url = account.server + "/show_bug.cgi?id="+id+"&ctype=xml";
		
		httpGetPage(url, "GET", null, "bug", function (node) {
			if(node) {
				var bug = {};
				xml2json(bug, node);
				onDone(bug);
			}
			else {
				onDone(null);
			}
		});
	}
	
	this.search = function(key, product, onDone) {
		var me = this;
		var rInfo = {};
		var account = this.account;
		var url = account.server + "/buglist.cgi?quicksearch="+key+"&ctype=csv";
		
		rInfo.url = url;
		rInfo.noCache = true;
		rInfo.noProxy = !configIsProxyEnabled();
		rInfo.method = "GET";
		
		var bugs = [];
		rInfo.onDone = function(result, xhr, respContent) { 
			if(xhr.status === 200) {
				csv2json(bugs, respContent);
				onDone(key, bugs);
			}
			else {
				onDone(key, bugs);
			}
			return;
		}

		httpDoRequest(rInfo);

		return;
	}

	this.getSavedSearches = function(onDone) {
		if(!onDone) {
			return this.savedSearches;
		}

		var me = this;
		var account = this.account;
		var url = account.server + "/userprefs.cgi?tab=saved-searches";

		var searches = [];
		httpGetPage(url, "GET", null, '#bugzilla-body', function (node) {
			if(!node) {
				onDone(searches);

				return;
			}
			
			var trs = node.querySelectorAll("tr");
			for(var t = 0; t < trs.length; t++) {
				var tr = trs[t];
				var a = tr.querySelector("a");

				if(!a) {
					continue;
				}

				var href = a.getAttribute("href");
				if(href.indexOf("buglist.cgi") >= 0) {
					var search = {};
					var td = tr.children[0];
					search.name = td.textContent;
					search.url = href;

					searches.push(search);
				}
			}

			me.savedSearches = searches;
			onDone(searches);
		});

		return;
	}

	function parseBugFieldsOptions(node) {
		var fieldsOptions = {};
		var component = node.querySelector("#component");
		fieldsOptions.component = getOptionsFromSelect(component);
		
		var version  = node.querySelector("#version");
		fieldsOptions.version = getOptionsFromSelect(version);

		var severity = node.querySelector("#bug_severity");
		fieldsOptions.severity = getOptionsFromSelect(severity);

		var platform = node.querySelector("#rep_platform");
		fieldsOptions.platform = getOptionsFromSelect(platform);

		var os = node.querySelector("#op_sys");
		fieldsOptions.os = getOptionsFromSelect(os);
		
		var status = node.querySelector("#bug_status");
		if(status) {
			fieldsOptions.status = getOptionsFromSelect(status);
		}
		
		var resolution = node.querySelector("#resolution");
		if(resolution) {
			fieldsOptions.resolution = getOptionsFromSelect(resolution);
		}
		
		var priority = node.querySelector("#priority");
		if(priority) {
			fieldsOptions.priority = getOptionsFromSelect(priority);
		}

		var token = node.querySelector('input[name="token"]');
		if(token) {
			fieldsOptions.token = token.getAttribute("value");
		}
		var delta_ts = node.querySelector('input[name="delta_ts"]');
		if(delta_ts) {
			fieldsOptions.delta_ts = delta_ts.getAttribute("value");
		}

		return fieldsOptions;
	}

	this.getNewBugFieldsOptions = function(product, onDone) {
		var me = this;
		var account = this.account;
		var url = account.server + "/enter_bug.cgi?product=" + product.id;

		var fieldsOptions = {};
		httpGetPage(url, "GET", null, '#bugzilla-body', function (node) {
			if(!node) {
				onDone(product, fieldsOptions);

				return;
			}

			fieldsOptions = parseBugFieldsOptions(node);
			onDone(product, fieldsOptions);
		});

		return;
	}
	
	this.getOldBugFieldsOptions = function(bug, onDone) {
		var id = bug.id;
		var product = bug.product;

		if(!onDone) {
			return this.bugFieldOptions[product];
		}

		var me = this;
		var account = this.account;
		var url = account.server + "/show_bug.cgi?id=" + id;

		var fieldsOptions = {};
		httpGetPage(url, "GET", null, '#bugzilla-body', function (node) {
			if(!node) {
				onDone(bug, fieldsOptions);

				return;
			}

			fieldsOptions = parseBugFieldsOptions(node);
			me.bugFieldOptions[product] = fieldsOptions;

			onDone(bug, fieldsOptions);
		});

		return;
	}

	this.submitBug = function(bug, onDone) {
		var data = new FormData();
		var productComponent = bug.product + "-" + bug.component;
		if(this.bugs[productComponent]) {
			this.bugs[productComponent].clear();
			this.bugs[productComponent] = null;
		}

		data.append("token", bug.token);
		data.append("product", bug.product);
		data.append("version", bug.version);
		data.append("component", bug.component);
		data.append("bug_severity", bug.severity);
		data.append("rep_platform", bug.platform);
		data.append("op_sys", bug.os);
		data.append("short_desc", bug.summary);
		data.append("comment", bug.comment);
		data.append("form_name", "enter_bug");
		if(bug.file) {
			data.append("data", bug.file);
			data.append("description", bug.file_desc);
			data.append("contenttypemethod", "autodetect");
			data.append("contenttypeselection", "text/plain");
		}
	
		var account = this.account;
		var url = account.server + "/post_bug.cgi";
		httpGetPage(url, "POST", data, 'title', function (node) {
			if(node) {	
				var message = node.textContent;	
				message = message.replace(/\n/, " ");
				onDone(bug, message);
			}
			else {
				onDone(bug, "Server Error.");
			}
		});
	}
	
	this.saveBug = function(bug, onDone) {
		var data = new FormData();

		data.append("id", bug.id);
		data.append("token", bug.token);
		data.append("delta_ts", bug.delta_ts);
		data.append("product", bug.product);
		data.append("version", bug.version);
		data.append("component", bug.component);
		data.append("rep_platform", bug.platform);
		data.append("op_sys", bug.os);
		data.append("bug_severity", bug.severity);
		data.append("assigned_to", bug.assigned_to);
		data.append("bug_status", bug.status);
		data.append("resolution", bug.resolution);
		data.append("short_desc", bug.summary);
		data.append("comment", bug.comment);
	
		var account = this.account;
		var url = account.server + "/process_bug.cgi";

		httpGetPage(url, "POST", data, 'title', function (node) {
			if(node) {	
				var message = node.textContent;	
				message = message.replace(/\n/, " ");

				onDone(bug, message);
			}
			else {
				onDone(bug, "Server Error.");
			}
		});
	}
	
	this.getAttachment = function(id, bug, onDone) {
		var me = this;
		var rInfo = {};
		var account = this.account;
		var url = account.server + "/attachment.cgi?id=" + id;
		
		rInfo.url = url;
		rInfo.noCache = true;
		rInfo.noProxy = !configIsProxyEnabled();
		rInfo.method = "GET";
		
		var bugs = [];
		rInfo.onDone = function(result, xhr, respContent) { 
			if(xhr.status === 200) {
				csv2json(bugs, respContent);
				onDone(id, respContent);
			}
			else {
				onDone(id, null);
			}
			return;
		}

		httpDoRequest(rInfo);

		return;
	}

	return this;
}

function normalizeBugKey(key) {
	key = key.toLowerCase();

	key = key.replace(/bug_/, "");
	switch(key) {
		case "short_desc": {
			key = "summary";
			break;
		}
		case "long_desc": {
			key = "comment";
			break;
		}
		case "op_sys": {
			key = "os";
			break;
		}
		case "rep_platform": {
			key = "platform";
			break;
		}
		case "creation_ts": {
			key = "date";
			break;
		}
	}

	return key;
}

//////////////////////////////////////////////////

function getDefaultServerName() {
	if(window.location.protocol.indexOf("http") >= 0 && window.location.host.indexOf("drawapp8") < 0) {
		var href = window.location.href;
		var server = href.substr(0, href.lastIndexOf("/")+1);

		return server;
	}
	
	return "";
}

function getBugClientDesc() {
	return "BugZilla Client";
}

function createBugClient() {
	var client = new BugZillaClient();

	return client;
}

