/************************************************************************************************************
	@fileoverview
	Floating window

	Copyright (C) 2006  Alf Magne Kalleland(post@dhtmlgoodies.com)

	This library is free software; you can redistribute it and/or
	modify it under the terms of the GNU Lesser General Public
	License as published by the Free Software Foundation; either
	version 2.1 of the License, or (at your option) any later version.

	This library is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
	Lesser General Public License for more details.

	You should have received a copy of the GNU Lesser General Public
	License along with this library; if not, write to the Free Software
	Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA


	www.dhtmlgoodies.com
	Alf Magne Kalleland


Update log:

	January 18th, 2006: Added feature that makes the window cover selectboxes(ref. problem with windowed and window less elements).
	January 29th, 2006: Fixed problem showing the windows in Opera
	Feb, 8th 2006:		Added support for creating new windows dynamically
	March,	11th, 2006: Added support for getting content from external files by use of Ajax


************************************************************************************************************/

	var readSizeFromCookie = false;	// Determines if size and position of windows should be set/retreved by use of cookie
	var windowMinSize = [80,30];	// Mininum width and height of windows.

	var moveCounter = -1;
	var startEventPos = new Array();
	var startPosWindow = new Array();
	var startWindowSize = new Array();
	var initResizeCounter = -1;
	var activeWindow = false;
	var activeWindowContent = false;
	var windowSizeArray = new Array();
	var windowPositionArray = new Array();
	var currentZIndex = 999;
	var windowStateArray = new Array();	// Minimized or maximized
	var activeWindowIframe = false;
	var divCounter = 0;
	var zIndexSet = false;
	var first = true;

	var MSIEWIN = (navigator.userAgent.indexOf('MSIE')>=0 && navigator.userAgent.indexOf('Win')>=0 && navigator.userAgent.toLowerCase().indexOf('opera')<0)?true:false;
	var opera = navigator.userAgent.toLowerCase().indexOf('opera')>=0?true:false;

	var ajaxObjects = new Array();



	/*
	These cookie functions are downloaded from
	http://www.mach5.com/support/analyzer/manual/html/General/CookiesJavaScript.htm
	*/
	function Get_Cookie(name) {
	   var start = document.cookie.indexOf(name+"=");
	   var len = start+name.length+1;
	   if ((!start) && (name != document.cookie.substring(0,name.length))) return null;
	   if (start == -1) return null;
	   var end = document.cookie.indexOf(";",len);
	   if (end == -1) end = document.cookie.length;
	   return unescape(document.cookie.substring(len,end));
	}
	// This function has been slightly modified
	function Set_Cookie(name,value,expires,path,domain,secure) {
		expires = expires * 60*60*24*1000;
		var today = new Date();
		var expires_date = new Date( today.getTime() + (expires) );
	    var cookieString = name + "=" +escape(value) +
	       ( (expires) ? ";expires=" + expires_date.toGMTString() : "") +
	       ( (path) ? ";path=" + path : "") +
	       ( (domain) ? ";domain=" + domain : "") +
	       ( (secure) ? ";secure" : "");
	    document.cookie = cookieString;
	}

	function cancelEvent()
	{
		return (moveCounter==-1 && initResizeCounter==-1)?true:false;
	}
	function initMove(e)
	{
		if(document.all)e = event;
		moveCounter = 0;
		switchElement(false,this);
		startEventPos = [e.clientX,e.clientY];
		startPosWindow = [activeWindow.offsetLeft,activeWindow.offsetTop];
		startMove();
		if(!MSIEWIN)return false;

	}

	function startMove()
	{
		if(moveCounter>=0 && moveCounter<=10){
			moveCounter++;
			setTimeout('startMove()',5);
		}
	}

	function stopMove(e)
	{
		if(document.all)e = event;
		moveCounter=-1;
		initResizeCounter=-1;
		if(!activeWindow || !activeWindowContent)return;
		var state = '0';
		if(windowStateArray[activeWindow.id.replace(/[^0-9]/g,'')])state = '1';

		Set_Cookie(activeWindow.id + '_attr',activeWindow.style.left.replace('px','') + ',' + activeWindow.style.top.replace('px','') + ',' + activeWindow.style.width.replace('px','') + ',' + activeWindowContent.style.height.replace('px','') + ',' + activeWindow.style.zIndex + ',' + state,50);
	}

	function moveWindow(e)
	{

		if(document.all)e = event;
		if(moveCounter>=10){
			activeWindow.style.left = startPosWindow[0] + e.clientX - startEventPos[0]  + 'px';
			activeWindow.style.top = startPosWindow[1] + e.clientY - startEventPos[1]  + 'px';

		}

		if(initResizeCounter>=10){
			var newWidth = Math.max(windowMinSize[0],startWindowSize[0] + e.clientX - startEventPos[0]);
			var newHeight = Math.max(windowMinSize[1],startWindowSize[1] + e.clientY - startEventPos[1]);
			activeWindow.style.width =  newWidth + 'px';
			activeWindowContent.style.height = newHeight  + 'px';

			if(MSIEWIN && activeWindowIframe){
				activeWindowIframe.style.width = (newWidth) + 'px';
				activeWindowIframe.style.height = (newHeight+20) + 'px';
			}


		}
		if(!document.all)return false;
	}


	function initResizeWindow(e)
	{
		if(document.all)e = event;
		initResizeCounter = 0;
		switchElement(false,document.getElementById('window_id' + this.id.replace(/[^\d]/g,'')));

		startWindowSize = [activeWindowContent.offsetWidth,activeWindowContent.offsetHeight];
		startEventPos = [e.clientX,e.clientY];

		if(MSIEWIN)activeWindowIframe = activeWindow.getElementsByTagName('IFRAME')[0];
		startResizeWindow();
		return false;

	}

	function startResizeWindow()
	{
		if(initResizeCounter>=0 && initResizeCounter<=10){
			initResizeCounter++;
			setTimeout('startResizeWindow()',5);
		}
	}

	function switchElement(e,inputElement)
	{
		if(!inputElement)inputElement = this;
		var numericId = inputElement.id.replace(/[^0-9]/g,'');
		var state = '0';
		if(windowStateArray[numericId])state = '1';

		if(activeWindow && activeWindowContent){
			Set_Cookie(activeWindow.id + '_attr',activeWindow.style.left.replace('px','') + ',' + activeWindow.style.top.replace('px','') + ',' + activeWindow.style.width.replace('px','') + ',' + activeWindowContent.style.height.replace('px','') + ',' + activeWindow.style.zIndex + ',' + state,50);

		}
		currentZIndex = currentZIndex/1 + 1;
		activeWindow = document.getElementById('window_id' + numericId);
		activeWindow.style.zIndex = currentZIndex;
		activeWindowContent = document.getElementById('windowContent' + numericId);

		Set_Cookie(activeWindow.id + '_attr',activeWindow.style.left.replace('px','') + ',' + activeWindow.style.top.replace('px','') + ',' + activeWindow.style.width.replace('px','') + ',' + activeWindowContent.style.height.replace('px','') + ',' + activeWindow.style.zIndex + ',' + state,50);
	}

	function hideWindow()
	{
		switchElement(false,document.getElementById('window_id' + this.id.replace(/[^\d]/g,'')));
		activeWindow.style.display='none';
	}

	function minimizeWindow(e,inputObj)
	{
		if(!inputObj)inputObj = this;
		var numericID = inputObj.id.replace(/[^0-9]/g,'');
		switchElement(false,document.getElementById('window_id' + numericID));
		var state;
		if(inputObj.src.indexOf('minimize')>=0){
			activeWindowContent.style.display='none';
			//line hid the image
			//document.getElementById('resizeImage'+numericID).style.display='none';
			inputObj.src = inputObj.src.replace('minimize','maximize');
			windowStateArray[numericID] = false;
			state = '0';
		}else{
			activeWindowContent.style.display='block';
			//document.getElementById('resizeImage'+numericID).style.display='';
			inputObj.src = inputObj.src.replace('maximize','minimize');
			windowStateArray[numericID] = true;
			state = '1';
		}

		Set_Cookie(activeWindow.id + '_attr',activeWindow.style.left.replace('px','') + ',' + activeWindow.style.top.replace('px','') + ',' + activeWindow.style.width.replace('px','') + ',' + activeWindowContent.style.height.replace('px','') + ',' + activeWindow.style.zIndex + ',' + state,50);

	}

	function initWindows(e,divObj)
	{
		if (first) {
			cursores();
			piada();
			first = false;
		}

		var divs = document.getElementsByTagName('DIV');

		if(divObj){
			var tmpDivs = divObj.getElementsByTagName('DIV');
			var divs = new Array();
			divs[divs.length] = divObj;

			for(var no=0;no<tmpDivs.length;no++){
				divs[divs.length] = tmpDivs[no];
			}
		}

		for(var no=0;no<divs.length;no++){

			if(divs[no].className=='window'){

				if(MSIEWIN){
					var iframe = document.createElement('IFRAME');
					iframe.style.border='0px';
					iframe.frameborder=0;
					iframe.style.position = 'absolute';
					iframe.style.backgroundColor = '#FFFFFF';
					iframe.style.top = '0px';
					iframe.style.left = '0px';
					iframe.style.zIndex = 100;


					var subDiv = divs[no].getElementsByTagName('DIV')[0];
					divs[no].insertBefore(iframe,subDiv);

				}
				if(divObj){
					divs[no].style.zIndex = currentZIndex;
					currentZIndex = currentZIndex /1 + 1;
				}

				divCounter = divCounter + 1;
				if(divCounter==1)activeWindow = divs[no];
				divs[no].id = 'window_id' + divCounter;
				divs[no].onmousedown = switchElement;
				if(readSizeFromCookie)var cookiePos = Get_Cookie(divs[no].id + '_attr') + '';	else cookiePos = '';
				if(divObj)cookiePos='';
				var cookieValues = new Array();


				if(cookiePos.indexOf(',')>0){
					cookieValues = cookiePos.split(',');
					if(!windowPositionArray[divCounter])windowPositionArray[divCounter] = new Array();
					windowPositionArray[divCounter][0] = Math.max(0,cookieValues[0]);
					windowPositionArray[divCounter][1] = Math.max(0,cookieValues[1]);
				}

				if(cookieValues.length==5 && !zIndexSet){
					divs[no].style.zIndex = cookieValues[4];
					if(cookieValues[4]/1 > currentZIndex)currentZIndex = cookieValues[4]/1;
				}
				if(windowPositionArray[divCounter]){
					divs[no].style.left = windowPositionArray[divCounter][0] + 'px';
					divs[no].style.top = windowPositionArray[divCounter][1] + 'px';
				}

				var subImages = divs[no].getElementsByTagName('IMG');
				for(var no2=0;no2<subImages.length;no2++){
					if(subImages[no2].className=='resizeImage'){
						subImages[no2].style.cursor = 'nw-resize';
						subImages[no2].onmousedown = initResizeWindow;
						subImages[no2].id = 'resizeImage' + divCounter;
						break;
					}
					if(subImages[no2].className=='closeButton'){
						subImages[no2].id = 'closeImage' + divCounter;
						subImages[no2].onclick = hideWindow;
					}
					if(subImages[no2].className=='minimizeButton'){
						subImages[no2].id = 'resizeImage' + divCounter;
						subImages[no2].onclick = minimizeWindow;
						if(cookieValues.length==6 && cookieValues[5]=='0'){
							setTimeout('minimizeWindow(false,document.getElementById("minimizeImage' + divCounter + '"))',10);
						}
						if(cookieValues.length==6 && cookieValues[5]=='1'){
							windowStateArray[divCounter] = 1;
						}


					}
				}
			}
			if(divs[no].className=='windowMiddle' || divs[no].className=='window_bottom'){
				divs[no].style.zIndex = 1000;

			}
			if(divs[no].className=='window_top'){
				divs[no].onmousedown = initMove;
				divs[no].id = 'top_bar'+divCounter;
				divs[no].style.zIndex = 1000;

			}

			if(divs[no].className=='windowContent'){
				divs[no].id = 'windowContent'+divCounter;
				divs[no].style.zIndex = 1000;
				if(cookieValues && cookieValues.length>3){
					if(!windowSizeArray[divCounter])windowSizeArray[divCounter] = new Array();
					windowSizeArray[divCounter][0] = cookieValues[2];
					windowSizeArray[divCounter][1] = cookieValues[3];
				}
				if(cookieValues && cookieValues.length==5){
					activeWindowContent = document.getElementById('windowContent' + divCounter);
				}
				if(windowSizeArray[divCounter]){
					divs[no].style.height = windowSizeArray[divCounter][1] + 'px';
					divs[no].parentNode.parentNode.style.width = windowSizeArray[divCounter][0] + 'px';

					if(MSIEWIN){
						iframe.style.width = (windowSizeArray[divCounter][0]) + 'px';
						iframe.style.height = (windowSizeArray[divCounter][1]+20) + 'px';
					}
				}
			}


		}

		if(!divObj){
			document.documentElement.onmouseup = stopMove;
			document.documentElement.onmousemove = moveWindow;
			document.documentElement.ondragstart = cancelEvent;
			document.documentElement.onselectstart = cancelEvent;
		}

		resizeBody();

		return divCounter;
	}

	function resizeBody()
	{
		if (window.location.href.includes('blog') || window.location.href.includes('skate'))
			document.body.style.height = document.getElementsByClassName('window')[0].offsetHeight + 100 + 'px';
	}

	function createNewWindow(width,height,left,top)
	{
		var div = document.createElement('DIV');
		div.className='window';
		document.body.appendChild(div);

		var topDiv = document.createElement('DIV');
		topDiv.className='window_top';
		div.appendChild(topDiv);

		var buttonDiv = document.createElement('DIV');
		buttonDiv.className='top_buttons';
		topDiv.appendChild(buttonDiv);

		var img = document.createElement('IMG');
		img.src = 'images/minimize.jpg';
		img.className='minimizeButton';
		buttonDiv.appendChild(img);

		var img = document.createElement('IMG');
		img.src = 'images/close.jpg';
		img.className='closeButton';
		buttonDiv.appendChild(img);

		var middleDiv = document.createElement('DIV');
		middleDiv.className='windowMiddle';
		div.appendChild(middleDiv);

		var contentDiv = document.createElement('DIV');
		contentDiv.className='windowContent';
		middleDiv.appendChild(contentDiv);

		var bottomDiv = document.createElement('DIV');
		bottomDiv.className='window_bottom';
		div.appendChild(bottomDiv);

		windowSizeArray[windowSizeArray.length] = [width,height];
		windowPositionArray[windowPositionArray.length] = [left,top];

		div.style.width =  width + 'px';
		contentDiv.style.height = height  + 'px';
		div.style.left =  left + 'px';
		div.style.top = top  + 'px';

		return initWindows(false,div);



	}

	function showAjaxContent(ajaxIndex,windowId)
	{
		document.getElementById('windowContent' + windowId).innerHTML = ajaxObjects[ajaxIndex].response;


	}

	function addContentFromUrl(url,windowId)
	{
		var ajaxIndex = ajaxObjects.length;
		ajaxObjects[ajaxIndex] = new sack();
		ajaxObjects[ajaxIndex].requestFile = url;	// Specifying which file to get
		ajaxObjects[ajaxIndex].onCompletion = function(){ showAjaxContent(ajaxIndex,windowId); };	// Specify function that will be executed after file has been found
		ajaxObjects[ajaxIndex].runAJAX();		// Execute AJAX function


	}

	/* This function illustrates how you can create a new custom window dynamically */

	function customFunctionCreateWindow(urlToExternalFile,width,height,left,top)
	{

		var divId = createNewWindow(width,height,left,top);
		document.getElementById('windowContent' + divId).innerHTML = 'Content of new window';
		if(urlToExternalFile)addContentFromUrl(urlToExternalFile,divId);	// Add content from external file


	}


	window.onload = initWindows;
