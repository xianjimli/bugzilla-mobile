var gApp = null;
window.onload = function() 
{
	var loading = document.getElementById("loading");
	loading.style.display = "none";
	
	dappModifyViewPort();
	window.setTimeout(function(){	
		if(!gApp)
		{
			gApp= webappRunWithDeviceData(gDeviceData);
		}
	}, 50);

	return;
};

