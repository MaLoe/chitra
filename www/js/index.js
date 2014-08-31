/*
 * License TODO
 */

function initialize () {
    // Bind any events that are required on startup. Common events are:
	document.addEventListener("deviceready", onDeviceReady, false);
}

// deviceready Event Handler
function onDeviceReady () {
	document.addEventListener("menubutton", onMenuKeyDown, false);
	// Initialize vocable trainer
	vtrainer.initialize();
}

function toggleFav () {
	var vocable = document.getElementById("text_vocable").innerHTML;
	if(vtrainer.toggleFav(vocable)) {
		// the current vocable was set to favorite
		document.getElementById("fav_b").style.backgroundImage = "url('img/star_fav.png')";
	}
	else {
		// the current vocable was unfavored
		document.getElementById("fav_b").style.backgroundImage = "url('img/star_nofav.png')";
	}
}

function show () {
	vtrainer.show();
	// show current element
	document.getElementById("text_vocable").style.visibility = "visible";
	document.getElementById("text_pronunciation").style.visibility = "visible";
	document.getElementById("text_translation").style.visibility = "visible";
	document.getElementById("text_comment").style.visibility = "visible";
}

function next () {
	// hide everything
	document.getElementById("text_vocable").style.visibility = "hidden";
	document.getElementById("text_pronunciation").style.visibility = "hidden";
	document.getElementById("text_translation").style.visibility = "hidden";
	document.getElementById("text_comment").style.visibility = "hidden";

	// get a new (different than current) element
	vtrainer.next();
	
	// update favorite button
	if(vtrainer.isFavorite(vtrainer.getCurrentVocable()))
		document.getElementById("fav_b").style.backgroundImage = "url('img/star_fav.png')";
	else
		document.getElementById("fav_b").style.backgroundImage = "url('img/star_nofav.png')";

	// update data
	document.getElementById("text_vocable").innerHTML = vtrainer.getCurrentVocable();
	document.getElementById("text_pronunciation").innerHTML = vtrainer.getCurrentPronunciation();
	document.getElementById("text_translation").innerHTML = vtrainer.getCurrentTranslation();
	document.getElementById("text_comment").innerHTML = vtrainer.getCurrentComment();
	// show stuff according to current mode TODO
	document.getElementById("text_vocable").style.visibility = "visible";
}

function playAudio () {
	vtrainer.playAudio();
}

// switch to settings on menu key
function onMenuKeyDown () {
	window.open("settings.html", "_self");
}

// fail function which displaces an alert
function onFail (error) {
	if (navigator.notification) {
		navigator.notification.alert("Fail: " + error.code, null, Error, 'OK');
	} else {
		alert("Fail: " + error.code);
	}
}
