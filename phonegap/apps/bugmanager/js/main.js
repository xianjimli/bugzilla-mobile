var gDefaultAccounts = [
	{desc:"Apache Issues", server:"http://issues.apache.org/bugzilla/", username:"xianjimli@hotmail.com", password:""}
];

function WinAddAccountController(win) {
	var desc = win.findChildByName("ui-edit-desc", true);
	var server = win.findChildByName("ui-edit-server", true);
	var username = win.findChildByName("ui-edit-username", true);
	var password = win.findChildByName("ui-edit-password", true);

	this.init = function(initInfo) {
		var title = win.findChildByName("ui-label-title", true);
		if(initInfo) {
			title.setText("Edit Account");
			desc.setText(initInfo.desc);
			server.setText(initInfo.server);
			username.setText(initInfo.username);
			password.setText(initInfo.password);
		}
		else {
			title.setText("Add Account");
		}

		return;
	}

	this.onDone = function() {
		var retInfo = {};
		retInfo.desc = desc.getText();
		retInfo.server = server.getText();
		retInfo.username = username.getText();
		retInfo.password = password.getText();

		if(retInfo.desc && retInfo.server && retInfo.username) {
			win.closeWindow(retInfo);
		}

		return;
	}

	return;
}

function createWinAddAccountController(win) {
	win.controller = new WinAddAccountController(win);
	
	return win.controller;
}

function WinMainController(win) {
	var controller = this;
	var title = win.findChildByName("ui-label-title", true);

	title.setText(getBugClientDesc());

	this.loadAccounts = function() {
		var accounts = localStorage.bugAccounts ? JSON.parse(localStorage.bugAccounts) : [];

		return accounts;
	}

	this.saveAccounts = function(accounts) {
		localStorage.bugAccounts = JSON.stringify(accounts);

		return;
	}

	this.addAccount = function(account) {
		var accounts = this.loadAccounts();
		accounts.push(account);
		this.saveAccounts(accounts);

		return;
	}

	this.removeAccount = function(account) {
		var accounts = this.loadAccounts();

		for(var i = 0; i < accounts.length; i++) {
			var iter = accounts[i];
			if(iter.desc == account.desc) {
				accounts.remove(iter);
				break;
			}
		}

		this.saveAccounts(accounts);

		return;
	}

	this.init = function() {
		this.showAccounts();

		return;
	}

	this.showAccounts = function() {
		var data = {children:[]};
		var accounts = this.loadAccounts();
		var list = win.findChildByName("ui-list-view", true);

		var addAccountItem = {children:[]};
		addAccountItem.userData = "add";
		addAccountItem.children.push({textColor:"Gold", text: "Add Account"});
		data.children.push(addAccountItem);

		for(var i = 0; i < accounts.length; i++) {
			var iter = accounts[i];
			var item = {children:[]};
			item.userData = iter;
			item.children.push({textColor:"#888888", text: iter.desc});

			data.children.push(item);
		}
		
		for(var i = 0; i < gDefaultAccounts.length; i++) {
			var iter = gDefaultAccounts[i];
			var item = {children:[]};
			item.userData = iter;
			item.children.push({textColor:"#888888", text: iter.desc});

			data.children.push(item);
		}
		
		var aboutItem = {children:[]};
		aboutItem.userData = "about";
		aboutItem.children.push({textColor:"Green", text: "About"});
		data.children.push(aboutItem);

		list.bindData(data, null, true);
		win.postRedraw();

		return;
	}

	this.onGo = function(item, isLongPress) {
		if(item.userData == "add") {
			this.onAdd();
			return;
		}
		else if(item.userData == "about") {
			this.onAbout();
			return;
		}

		var account = item.userData;
		if(isLongPress) {
			this.editAccount(account);	
			return;
		}
		else if(!item.client) {
			item.client = createBugClient();
		}

		var client = item.client;

		if(client.isLogin()) {
			win.openWindow("win-project", 
				function (retCode) {console.log("window closed.");}, false, client);
		}
		else {
			win.openWindow("win-busy", 
				function (retCode) {console.log("window closed.");}, false, "Login...");
			client.login(account, function (result) {
				win.closeWindow(0);

				if(result) {
					win.openWindow("win-project", 
						function (retCode) {console.log("window closed.");}, false, client);
				}
				else {
					alert(translateText("Login Failed."));
				}
			});
		}

		return;
	}

	this.onAdd = function() {
		this.editAccount();

		return;
	}

	this.editAccount = function(accountInfo) {
		win.openWindow("win-add-account", 
			function (account) {
				if(account) {
					controller.removeAccount(account);
					controller.addAccount(account);
					controller.showAccounts();
				}
			}, false, accountInfo);
	   
	   return;
	}
	
	this.onAbout = function() {
		win.openWindow("win-about", function(ret) {}, false);

		return;
	}
	
	this.onRemove = function(item) {
		var account = item.userData;
		controller.removeAccount(account);

		return;
	}
}

function createWinMainController(win) {
	win.controller = new WinMainController(win);

	return win.controller;
}

function WinProjectController(win, client) {
	var title = win.findChildByName("ui-label-title", true);

	title.setText(client.getAccountName());

	var v = client.isFeatureSupported("cross-product-search");
	var names = ["ui-list-item-saved-searches", "ui-button-quicksearch", "ui-list-item-quicksearch"];
	for(var i = 0; i < names.length; i++) {
		var el = win.findChildByName(names[i], true);
		el.setVisible(v);
	}

	this.showProducts = function() {
		var products = client.getProducts();
		if(products) {
			win.openWindow("win-product-list", 
				function (retCode) {console.log("window closed.");}, false, client);
		}
		else {
			win.openWindow("win-busy", 
				function (retCode) {console.log("window closed.");}, false, "Fetching Product List...");
			client.getProducts(function (products) {
				win.closeWindow(0);
				win.openWindow("win-product-list", 
					function (retCode) {console.log("window closed.");}, false, client);
			});
		}
	}

	this.search = function() {
		var info = {};
		info.client = client;
		info.product = null;

		win.openWindow("win-quick-search", 
			function (retCode) {console.log("window closed.");}, false, info);
	}

	this.showSavedSearches = function() {
		var info = {};
		info.client = client;
		
		var searches = client.getSavedSearches();
		if(searches) {
			info.searches = searches;
			win.openWindow("win-saved-searches", 
				function (retCode) {console.log("window closed.");}, false, info);
		}
		else {
			win.openWindow("win-busy", 
				function (retCode) {console.log("window closed.");}, false, "Fetching Saved Searches...");
			client.getSavedSearches(function(searches) {
				win.closeWindow(0);
				info.searches = searches;
				win.openWindow("win-saved-searches", 
					function (retCode) {console.log("window closed.");}, false, info);
			});
		}

		return;
	}

	return;
}

function createWinProjectController(win, client) {
	win.controller = new WinProjectController(win, client);

	return win.controller;
}

function WinProductController(win, client) {
	var title = win.findChildByName("ui-label-title", true);

	title.setText(client.getAccountName());
	this.showProductsList = function() {
		var data = {children:[]};
		var products = client.getProducts();
		var list = win.findChildByName("ui-list-view", true);

		for(var i = 0; i < products.length; i++) {
			var iter = products[i];
			var item = {children:[]};
			item.userData = iter;
			item.children.push({text: iter.name});

			data.children.push(item);
		}
		
		list.bindData(data, null, true);
		win.postRedraw();

		return;
	}

	this.showComponents = function(product) {
		var info = {};
		info.client = client;
		info.product = product;

		var components = client.getComponents(product);
		if(components) {
			win.openWindow("win-components-list", 
				function (retCode) {console.log("window closed.");}, false, info);
		}
		else {
			win.openWindow("win-busy", 
				function (retCode) {console.log("window closed.");}, false, "Fetching Component List...");
			client.getComponents(product, function (product, components) {
				win.closeWindow(0);
				win.openWindow("win-components-list", 
					function (retCode) {console.log("window closed.");}, false, info);
			});
		}
	}
}

function createWinProductController(win, client) {
	win.controller = new WinProductController(win, client);

	return win.controller;
}

function WinComponentController(win, product, client) {
	var title = win.findChildByName("ui-label-title", true);

	title.setText(product.name);
	this.showComponentsList = function() {
		var data = {children:[]};
		var components = client.getComponents(product);
		var list = win.findChildByName("ui-list-view", true);

		for(var i = 0; i < components.length; i++) {
			var iter = components[i];
			var item = {children:[]};
			item.userData = iter;
			item.children.push({text: iter.name});

			data.children.push(item);
		}
		
		list.bindData(data, null, true);
		win.postRedraw();

		return;
	}

	this.showProductOverview = function(component) {
		win.openWindow("win-busy", 
			function (retCode) {console.log("window closed.");}, false, "Fetching Overview Infomation...");

		client.getOverviewInfo(product, function (product, info) {
			win.closeWindow(0);
			
			win.openWindow("win-overview", 
				function (retCode) {console.log("window closed.");}, false, info);
		});

		return;
	}

	this.showBugsList = function(component) {
		var info = {};
		info.client = client;
		info.title = component.name;
		info.component = component;

		if(component.id == "overview") {
			this.showProductOverview(component);

			return;
		}

		var bugs = client.getAllBugs(product, component);
		if(bugs) {
			info.bugs = bugs;
			win.openWindow("win-bugs-list", 
				function (retCode) {console.log("window closed.");}, false, info);
		}
		else {
			win.openWindow("win-busy", 
				function (retCode) {console.log("window closed.");}, false, "Fetching Bug List...");
			client.getAllBugs(product, component, function (product, component, bugs) {
				win.closeWindow(0);
				
				info.bugs = bugs;
				win.openWindow("win-bugs-list", 
					function (retCode) {console.log("window closed.");}, false, info);
			});
		}
	}

	this.createBug = function() {
		var info = {};
		info.client = client;
		info.product = product;

		win.openWindow("win-busy", 
			function (retCode) {console.log("window closed.");}, false, "Preparing For New Bug...");

		client.getNewBugFieldsOptions(product, function (product, fieldsOptions) {
			win.closeWindow(0);
			
			console.log("Get Fields Options Done");
			info.fieldsOptions = fieldsOptions;
			win.openWindow("win-new-bug", 
				function (retCode) {console.log("window closed.");}, false, info);
		});
	}
	
	this.search = function() {
		var info = {};
		info.client = client;
		info.product = product;

		win.openWindow("win-quick-search", 
			function (retCode) {console.log("window closed.");}, false, info);
	}
}

function createWinComponentController(win, initData) {
	var client = initData.client;
	var product = initData.product;

	win.controller = new WinComponentController(win, product, client);

	return win.controller;
}

function WinBugsController(win, title, bugs, client) {
	win.setValueOf("ui-label-title", title);
	win.setValueOf("ui-label-bugs", bugs.length + " Bugs");

	this.showBugsList = function() {
		var data = {children:[]};
		var list = win.findChildByName("ui-list-view", true);

		for(var i = 0; i < bugs.length; i++) {
			var iter = bugs[i];
			var item = {children:[]};
			var id = iter["id"];
			var summary = iter.summary;

			if(i > 500) {
				console.log("Bugs are too much, show first 500.");
				break;
			}

			item.userData = iter;
			item.children.push({text: id});
			item.children.push({text: summary});

			data.children.push(item);
		}
		
		list.bindData(data, null, true);
		win.postRedraw();

		return;
	}

	this.showBug = function(bug) {
		var info = {};
		info.bug = bug;
		info.client = client;

		win.openWindow("win-bug-detail", 
				function (retCode) {console.log("window closed.");}, false, info);
	}
}

function createWinBugsController(win, initData) {
	var client = initData.client;
	var title = initData.title;
	var bugs = initData.bugs;

	win.controller = new WinBugsController(win, title, bugs, client);

	return win.controller;
}

function WinBugDetailController(win, bug, client) {
	var controller = this;
	var title = win.findChildByName("ui-label-title", true);
	var waitbox = win.findChildByName("ui-wait-box", true);
	var pageViewer = win.findChildByName("ui-view-pager", true);
	pageViewer.setCurrent(0);

	title.setText(bug.id);
	
	waitbox.start();
	waitbox.setVisible(true);
	
	var v = client.isFeatureSupported("platform-field");
	var el = win.findChildByName("ui-list-item-platform", true);
	el.setVisible(v);
	
	v = client.isFeatureSupported("severity-field");
	el = win.findChildByName("ui-list-item-severity", true);
	el.setVisible(v);
	
	v = client.isFeatureSupported("os-field");
	el = win.findChildByName("ui-list-item-os", true);
	el.setVisible(v);
	
	v = client.isFeatureSupported("resolution-field");
	el = win.findChildByName("ui-list-item-resolution", true);
	el.setVisible(v);

	client.queryBug(bug.id, function(bugDetail) {
		
		waitbox.stop();
		waitbox.setVisible(false);

		controller.showBugDetail(bugDetail);
	});

	var fieldsOptions = {};
	client.getOldBugFieldsOptions(bug, function(bug, fields) {
		fieldsOptions = fields;
		console.log("Get Fields Options Done");
	});

	this.showBugComments = function(bugDetail) {
		var bug = bugDetail;
		var list = win.findChildByName("ui-list-view-comment", true);

		var data = {children:[]};
		for(var i = 0; i < bug.children.length; i++) {
			var iter = bug.children[i];
			if(iter.name == "comment") {
				var item = {children:[]};
				
				item.userData = {};
				item.userData.bug = bug;
				item.userData.comment = iter;

				item.children.push({text: iter.who});
				item.children.push({text: iter.when});
				item.children.push({text: iter.thetext});
				if(!iter.attachid) {
					item.children.push({image:"none"});
				}
				data.children.push(item);
			}
		}
		
		list.bindData(data, null, true);

		return;
	}

	this.showBugDetail = function(bugDetail) {
		var bug = bugDetail;

		var list = win.findChildByName("ui-list-view-general", true);
		list.setValueOf("ui-label-product", bug.product);
		list.setValueOf("ui-label-component", bug.component);
		list.setValueOf("ui-button-os", bug.os);
		list.setValueOf("ui-button-platform", bug.platform);
		list.setValueOf("ui-label-version", bug.version);
		list.setValueOf("ui-button-severity", bug.severity);
		list.setValueOf("ui-button-status", bug.status);
		list.setValueOf("ui-button-resolution", bug.resolution);

		list.setValueOf("ui-edit-assignee", bug.assigned_to);
		list.setValueOf("ui-label-change-date", bug.date);
		list.setValueOf("ui-label-summary", bug.summary);
		
		this.showBugComments(bug);

		win.postRedraw();
	}

	this.showBugGeneral = function() {
		var list = win.findChildByName("ui-list-view-general", true);

		list.setValueOf("ui-label-product", bug.product);
		list.setValueOf("ui-label-component", bug.component);
		list.setValueOf("ui-label-assignee", bug.assigned_to);
		list.setValueOf("ui-button-status", bug.status);
		list.setValueOf("ui-button-resolution", bug.resolution);
		list.setValueOf("ui-label-change-date", bug.changeddate);
		list.setValueOf("ui-label-summary", bug.summary);
	
		win.postRedraw();

		return;
	}
	
	this.showBugComment = function(info) {
		info.client = client;
		win.openWindow("win-comment", 
			function (retCode) {console.log("window closed.");}, false, info);
	}

	this.showPicker = function(button, options) {
		if(bug.readonly) {
			console.log("This bug is readonly.");
			return;
		}

		var info = {};
		info.options = options;
		info.defaultOption = button.getText();

		if(!options) {
			return;
		}

		win.openWindow("win-picker", 
			function (option) {
				if(option) {
					button.setText(option);
				}
			}, false, info);

		return;
	}
	
	this.showComponentPicker = function() {
		var button = win.findChildByName("ui-button-component", true);
		this.showPicker(button, fieldsOptions.component);

		return;
	}
	
	this.showVersionPicker = function() {
		var button = win.findChildByName("ui-button-version", true);
		this.showPicker(button, fieldsOptions.version);

		return;
	}
	
	this.showSeverityPicker = function() {
		var button = win.findChildByName("ui-button-severity", true);
		this.showPicker(button, fieldsOptions.severity);

		return;
	}
	
	this.showPlatformPicker = function() {
		var button = win.findChildByName("ui-button-platform", true);
		this.showPicker(button, fieldsOptions.platform);

		return;
	}
	
	this.showOsPicker = function() {
		var button = win.findChildByName("ui-button-os", true);
		this.showPicker(button, fieldsOptions.os);

		return;
	}
	
	this.showStatusPicker = function() {
		var button = win.findChildByName("ui-button-status", true);
		this.showPicker(button, fieldsOptions.status);

		return;
	}
	
	this.showResolutionPicker = function() {
		var button = win.findChildByName("ui-button-resolution", true);
		this.showPicker(button, fieldsOptions.resolution);

		return;
	}
	
	this.getValueOf = function(options, name) {
		if(!options) {
			return name;
		}

		for(var i = 0; i < options.length; i++) {
			var iter = options[i];
			if(iter.name == name) {
				return iter.value;
			}
		}

		return name;
	}

	this.saveBug = function() {
		if(bug.readonly) {
			alert(translateText("You Cann't Modify This Bug!"));
			return;
		}

		var newBug = {};
		var list = win.findChildByName("ui-list-view-general", true);
		
		newBug.id = bug.id;
		newBug.token = fieldsOptions.token;
		newBug.delta_ts = fieldsOptions.delta_ts;
		newBug.product = list.getValueOf("ui-label-product");
		newBug.component = list.getValueOf("ui-label-component");
		newBug.version = list.getValueOf("ui-label-version");
		newBug.platform = list.getValueOf("ui-button-platform");
		newBug.os = list.getValueOf("ui-button-os");
		newBug.severity = list.getValueOf("ui-button-severity");

		newBug.assigned_to = list.getValueOf("ui-edit-assignee");
		newBug.status = list.getValueOf("ui-button-status");
		newBug.resolution = list.getValueOf("ui-button-resolution");
		
		newBug.component = this.getValueOf(fieldsOptions.component, newBug.component);
		newBug.version = this.getValueOf(fieldsOptions.version, newBug.version);
		newBug.platform = this.getValueOf(fieldsOptions.platform, newBug.platform);
		newBug.os = this.getValueOf(fieldsOptions.os, newBug.os);
		newBug.assigned_to = this.getValueOf(fieldsOptions.assigned_to, newBug.assigned_to);
		newBug.status = this.getValueOf(fieldsOptions.status, newBug.status);

		var info = {};
		info.oldBug = bug;
		info.newBug = newBug;
		info.client = client;

		win.openWindow("win-save-bug", 
			function (retCode) {console.log("window closed.");}, false, info);

		return;
	}

	return this;
}

function createWinBugDetailController(win, initData) {
	var client = initData.client;
	var bug = initData.bug;

	win.controller = new WinBugDetailController(win, bug, client);

	return win.controller;
}

function WinSaveBugController(win, oldBug, newBug, client) {
	this.save = function() {
		newBug.comment = win.getValueOf("ui-mledit-comment", true);

		win.openWindow("win-busy", 
			function (retCode) {console.log("window closed.");}, false, "Saving Bug...");
		client.saveBug(newBug, function(newBug, message) {
			win.closeWindow(0);
			alert(message);
			win.closeWindow(0);
		});
	}

	return;
}

function createWinSaveBugController (win, initData) {
	var client = initData.client;
	var oldBug = initData.oldBug;
	var newBug = initData.newBug;

	win.controller = new WinSaveBugController(win, oldBug, newBug, client);

	return win.controller;
}

function WinBugCommentController(win, bug, comment, client) {
	var controller = this;
	var title =  comment.who + "\n" + comment.when;
	var pageViewer = win.findChildByName("ui-view-pager", true);

	pageViewer.setCurrent(0);
	win.setValueOf("ui-label-title", title);

	this.showComment = function() {
		var text = comment.thetext;
		if(comment.thehtml) {
			text = comment.thehtml;
		}
		else {
			text = text.replace(/\n/g, "\n<p>");
		}
		win.setValueOf("ui-simple-html", text);

		var attachments = [];
		if(comment.attachid) {
			for(var i = 0; i < bug.children.length; i++) {
				var iter = bug.children[i];
				if(iter.name == "attachment" && iter.attachid == comment.attachid) {
					attachments.push(iter);
				}
			}
		}
		
		var list = win.findChildByName("ui-list-view", true);
		var data = {children:[]};
		for(var i = 0; i < attachments.length; i++) {
			var iter = attachments[i];
			var item = {children:[]};
			item.userData = iter;
			item.children.push({text: iter.filename});
			item.children.push({text: iter.type});
			item.children.push({text: iter.size});
			item.children.push({text: iter.desc});

			data.children.push(item);
		}

		list.bindData(data, null, true);
		win.postRedraw();
		
		return;
	}
	
	this.showAttachment = function(attachment) {
		var info = {};

		info.bug = bug;
		info.client = client;
		info.comment = comment;
		info.attachment = attachment;

		win.openWindow("win-attachment", 
			function (retCode) {console.log("window closed.");}, false, info);

		return;
	}

	return this;
}

function createWinBugCommentController(win, initData) {
	var client = initData.client;
	var bug = initData.bug;
	var comment = initData.comment;

	win.controller = new WinBugCommentController(win, bug, comment, client);

	return win.controller;
}

function WinAttachmentController(win, client, bug, comment, attachment) {
	win.setValueOf("ui-label-title", attachment.filename);

	this.showAttachment = function() {
		var pageViewer = win.findChildByName("ui-view-pager", true);

		if(attachment.type.indexOf("text/") >= 0) {
			var data = attachment.data.replace(/ |\n|\r|\t/g, "");
			var text = atob(data);
			text = text.replace(/\n/g, "<p>");
		
			var htmlview = win.findChildByName("ui-simple-html", true);
			htmlview.setText(text);

			pageViewer.setCurrent(0);
		}
		else if(attachment.type.indexOf("image/") >= 0) {
			var src = "data:" + attachment.type + ";base64," + attachment.data;

			var image = win.findChildByName("ui-image", true);
			image.setImageSrc(src);
			pageViewer.setCurrent(1);
		}

		return;
	}

	this.download = function() {
	}

	return this;
}

function createWinAttachmentController(win, initData) {
	var bug = initData.bug;
	var client = initData.client;
	var comment = initData.comment;
	var attachment = initData.attachment;

	win.controller = new WinAttachmentController(win, client, bug, comment, attachment);

	return win.controller;
}

function WinQuickSearchController(win, client, product) {	
	this.search = function() {
		var text = win.getValueOf("ui-edit");
		if(!text) {
			return;
		}

		var id = parseInt(text);
		win.openWindow("win-busy", function (retCode) {console.log("window closed.");}, false, "Searching...");

		if(isNaN(id)) {
			client.search(text, product, function (key, bugs) {
				win.closeWindow(0);
				
				var info = {};
				info.bugs = bugs;
				info.client = client;
				info.title = "Search Result";

				win.openWindow("win-bugs-list", 
					function (retCode) {console.log("window closed.");}, true, info);
			});
		}
		else {
			client.queryBug(id, function(bugDetail) {
				win.closeWindow(0);
				var info = {};
				info.bug = bugDetail;
				info.client = client;

				if(info.bug.summary) {
					win.openWindow("win-bug-detail", 
							function (retCode) {console.log("window closed.");}, true, info);
				}
				else {
					alert(translateText("Not Found: ") + text);
				}
			});
		}
	}

	return;
}

function createWinQuickSearchController(win, initData) {	
	var client = initData.client;
	var product = initData.product;

	win.controller = new WinQuickSearchController(win, client, product);

	return win.controller;
}

function WinNewBugController(win, client, product, fieldsOptions) {	
	win.setValueOf("ui-label-product", product.name);
	
	if(fieldsOptions.component) {
		win.setValueOf("ui-button-component", fieldsOptions.component[0].name);
	}
	
	if(fieldsOptions.version) {
		win.setValueOf("ui-button-version", fieldsOptions.version[0].name);
	}
	
	if(fieldsOptions.severity) {
		win.setValueOf("ui-button-severity", fieldsOptions.severity[0].name);
	}
	
	var v = client.isFeatureSupported("platform-field");
	var el = win.findChildByName("ui-list-item-platform", true);
	el.setVisible(v);
	
	v = client.isFeatureSupported("severity-field");
	if(!v) {
		win.setValueOf("ui-label-severity", "Priority");
	}
	
	v = client.isFeatureSupported("os-field");
	el = win.findChildByName("ui-list-item-os", true);
	el.setVisible(v);

	v = client.isFeatureSupported("new-and-assigned-to");
	el = win.findChildByName("ui-list-item-assigned-to", true);
	el.setVisible(v);

	this.showPicker = function(button, options) {
		var info = {};
		info.options = options;
		info.defaultOption = button.getText();
		
		if(!options) {
			return;
		}

		win.openWindow("win-picker", 
			function (option) {
				if(option) {
					button.setText(option);
				}
			}, false, info);

		return;
	}

	this.getValueOf = function(options, name) {
		if(!options) {
			return name;
		}

		for(var i = 0; i < options.length; i++) {
			var iter = options[i];
			if(iter.name == name) {
				return iter.value;
			}
		}

		return name;
	}

	this.showComponentPicker = function() {
		var button = win.findChildByName("ui-button-component", true);
		this.showPicker(button, fieldsOptions.component);

		return;
	}
	
	this.showVersionPicker = function() {
		var button = win.findChildByName("ui-button-version", true);
		this.showPicker(button, fieldsOptions.version);

		return;
	}
	
	this.showSeverityPicker = function() {
		var button = win.findChildByName("ui-button-severity", true);
		if(client.isFeatureSupported("severity-field")) {
			this.showPicker(button, fieldsOptions.severity);
		}
		else {
			this.showPicker(button, fieldsOptions.priority);
		}

		return;
	}
	
	this.showPlatformPicker = function() {
		var button = win.findChildByName("ui-button-platform", true);
		this.showPicker(button, fieldsOptions.platform);

		return;
	}
	
	this.showOsPicker = function() {
		var button = win.findChildByName("ui-button-os", true);
		this.showPicker(button, fieldsOptions.os);

		return;
	}
	
	this.showAssignedTo = function() {
		var button = win.findChildByName("ui-button-assigned-to", true);
		this.showPicker(button, fieldsOptions.assigned_to);

		return;
	}
	
	this.pickAttachment = function(button) {
	}
	
	this.submitBug = function() {
		var bug = {};

		if(fieldsOptions.token) {
			bug.token = fieldsOptions.token;
		}

		bug.product = win.getValueOf("ui-label-product");
		bug.component = win.getValueOf("ui-button-component");
		bug.version = win.getValueOf("ui-button-version");
		bug.severity = win.getValueOf("ui-button-severity");
		bug.platform = win.getValueOf("ui-button-platform");
		bug.assigned_to = win.getValueOf("ui-button-assigned-to");
		bug.os = win.getValueOf("ui-button-os");
		bug.summary = win.getValueOf("ui-edit-summary");
		bug.comment = win.getValueOf("ui-mledit-comment");

		bug.product = product.id;
		bug.component = this.getValueOf(fieldsOptions.component, bug.component);
		bug.version = this.getValueOf(fieldsOptions.version, bug.version);
		bug.platform = this.getValueOf(fieldsOptions.platform, bug.platform);
		bug.os = this.getValueOf(fieldsOptions.os, bug.os);
	
		if(client.isFeatureSupported("new-and-assigned-to")) {
			bug.assigned_to = this.getValueOf(fieldsOptions.assigned_to, bug.assigned_to);
		}

		if(!client.isFeatureSupported("severity-field")) {
			bug.priority = this.getValueOf(fieldsOptions.priority, bug.severity);
		}
		else {
			bug.severity = this.getValueOf(fieldsOptions.severity, bug.severity);
		}
		
		client.submitBug(bug, function(bug, message) {
			if(message) {
				alert(message);
			}
		});
	}

	return;
}

function createWinNewBugController(win, initData) {	
	var client = initData.client;
	var product = initData.product;
	var fieldsOptions = initData.fieldsOptions;

	win.controller = new WinNewBugController(win, client, product, fieldsOptions);

	return win.controller;
}

function WinPickerController(win, defaultOption, options) {	
	var str = "";
	var select = win.findChildByName("ui-select", true);
	for(var i = 0; i < options.length; i++) {
		str += options[i].name + "\n";
	}

	select.setText(str);
	this.onOK = function() {
		var value = win.getValueOf("ui-select");

		win.closeWindow(value);
	}

	return;
}

function createWinPickerController(win, initData) {	
	win.controller = new WinPickerController(win, initData.defaultOption, initData.options);

	return win.controller;
}

function WinSavedSearchesController(win, client, searches) {	
	this.showSavedSearches = function() {
		var data = {children:[]};
		var list = win.findChildByName("ui-list-view", true);

		for(var i = 0; i < searches.length; i++) {
			var iter = searches[i];
			var item = {children:[]};
			item.userData = iter;
			item.children.push({text: iter.name});

			data.children.push(item);
		}

		list.bindData(data, null, true);
		win.postRedraw();

		return;
	}

	this.showSavedSearch = function(search) {
		var info = {};
		info.client = client;
		info.title = search.name;

		win.openWindow("win-busy", 
			function (retCode) {console.log("window closed.");}, false, "Searching Bugs...");
		client.runSearch(search.url, function(url, bugs) {
			win.closeWindow(0);
			
			info.bugs = bugs;
			win.openWindow("win-bugs-list", 
				function (retCode) {console.log("window closed.");}, false, info);
		});

		return;
	}

	return;
}

function createWinSavedSearchesController(win, initData) {	
	var client = initData.client;
	var searches = initData.searches;

	win.controller = new WinSavedSearchesController(win, client, searches);

	return win.controller;
}

function WinOverviewController(win, info) {	
	if(info) {
		win.setValueOf("ui-label-all-bugs", info.allBugs); 
		win.setValueOf("ui-label-unfixed-bugs", info.unfixedBugs); 
		win.setValueOf("ui-label-pending-bugs", info.pendingBugs); 
		win.setValueOf("ui-label-resolved-bugs", info.resolvedBugs); 
	}

	return;
}


function createWinOverviewController(win, initData) {
	win.controller = new WinOverviewController(win, initData);

	return win.controller;
}

