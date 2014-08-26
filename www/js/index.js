/*
 * License TODO
 */
// TODO maybe a setfav(true/false) function - update the background image
// TODO reset favs before first next or ensure that greeting isn't favorable or remove greeting
// TODO loading should always happen before the hello display and next should just display next charecter

var CONST_FAV_PROBABILITY = 0.25;
var standard_files = [
	//{ url : "data/ger_radicals_1.xml", checked : true },
	//{ url : "data/ger_radicals_2.xml", checked : true },
	//{ url : "data/ger_radicals_3.xml", checked : true },
	//{ url : "data/ger_radicals_4.xml", checked : true },
	//{ url : "data/ger_radicals_5.xml", checked : true },
	{ url : "data/en.xml", checked : true }
]

var app = {
	oCurrentHanzi: undefined,   // current hanzi
	oFavs: {},          // favorite hanzi
	aData: [],         // runtime storage of hanzi and their data
	aAudioBuffer: [],
	sAudioURL: "",
	nToLoadFiles: 0,   // XML loading is based on events, so we can easily end up with some parallel functions waiting for FS while our program is allready at the point where it could try to get the next element. We have to wait until all loaders finish.
	// TODO minNextSteps / occsteps -> settings
	// TODO maxNextSteps -> settings

    // Application Constructor
    initialize: function() {
		// load data
		/*if (localStorage != null) {
			this.aData = JSON.parse(localStorage.getItem("data"));
			// TODO test data structure?
		} else {
			aData = new Array();
		}*/
		if (!localStorage.getItem("files")) {
			localStorage.setItem("files", JSON.stringify(standard_files));
		}
		// bind events
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener("deviceready", this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
		console.log("███ device ready");
		document.addEventListener("menubutton", app.onMenuKeyDown, false);
    },
	// Callbacks for signaling that all Loaders are done
	signalStartedLoading: function() {
		if (isNaN(this.nToLoadFiles))
			this.nToLoadFiles = 1;
		else
			this.nToLoadFiles++;
	},
	signalDoneLoading: function() {
		this.nToLoadFiles--;
		if (this.nToLoadFiles <= 0) {
			console.log("███ finished loading data");
			// save to local storage
			// TODO
			localStorage.setItem("data", JSON.stringify(this.aData));

			// TODO display something when nothing was loaded
			// reset/load favorites
			//this.oFavs = new Object();
			this.oCurrentHanzi = this.aData[Math.floor(Math.random() * this.aData.length)];
			// set next_b to next() instead of reloaddata()
			document.getElementById("next_b").onclick = this.next;
			//Event.observe("next_b", "click", this.next);
			//$('next_b').observe('click', this.next);
			// TODO next should only display next element and reload is taken care of by initialize
			this.next();
		}
	},
	// Reload Data 
	//
	// reload all data, favorites etc.
	reloadData: function() {
		console.log("███ loading data");
		var aFiles = JSON.parse(localStorage.getItem("files"));
		// start up loaders for every checked file
		for (i = 0; i < aFiles.length; i++) {
			if (aFiles[i].checked) {
				var url = aFiles[i].url;
				// check if it's internal
				if (url.match(/^data\//)) {
					this.loadDataFromInternal(aFiles[i].url);
				// check if it's in local filesystem
				} else if (url.match(/^file:/)) {
					this.loadDataFromLocalFS(aFiles[i].url);
				// check if it's in the webz
				} else if (url.match(/^http:/)) {
					console.log("███ TODO web loading");
				} else {
					console.log("███ TODO corrupted stuff");
					//alert("corrupted data: unrecognized filetype: " + JSON.stringify(aFiles[i]);
				}
			}
		}
		// we can only continue here if all files got loaded
		// that's why here is no code, look at signalDoneLoading()
	},
	// Favorite Toggle
	//
	// toggles for current element the favorite state (also changes button icon)
	toggleFav: function() {
		var curHZ = document.getElementById("text_hanzi").innerHTML;
		if(curHZ in this.oFavs) {
			// unfavorite current element and update button
			document.getElementById("fav_b").style.backgroundImage = "url('img/star_nofav.png')";
			delete this.oFavs[curHZ];
		}
		else {
			// set current element to favorite and update button
			document.getElementById("fav_b").style.backgroundImage = "url('img/star_fav.png')";
			this.oFavs[curHZ] = this.oCurrentHanzi;
		}
	},
	// Load XML
	//
	// loads all data from specified XML and pushes them into the array containing all data
	loadXML: function(xmlDoc) {
		var xmlEntries = xmlDoc.getElementsByTagName("entry");
		// go through every element of this DOM and push them into the array
		for (j = 0; j < xmlEntries.length; j++) {
			// comment might be absent, handle this
			var xmlElementComment = xmlEntries[j].getElementsByTagName("comment");
			if (xmlElementComment.length < 1)
				var temp_comment = "";
			else
				var temp_comment = xmlElementComment[0].childNodes[0].nodeValue;
			var element = {
				hanzi       : xmlEntries[j].getElementsByTagName("hanzi")[0].childNodes[0].nodeValue,
				pinyin      : xmlEntries[j].getElementsByTagName("pinyin")[0].childNodes[0].nodeValue,
				translation : xmlEntries[j].getElementsByTagName("translation")[0].childNodes[0].nodeValue,
				comment     : temp_comment,
				occurance 	: 0,
				favorite 	: false
			}
			this.aData.push(element);
		}
		console.log("███ parsed XML, entries: " + xmlEntries.length);
	},

	loadDataFromLocalFS: function(sFileURL) {
		this.signalStartedLoading();
		console.log("███ loading file: " + sFileURL);
		// get file
        window.resolveLocalFileSystemURL(sFileURL, function(fileEntry) {
			fileEntry.file(function(file) {
				var freader = new FileReader();
				freader.onloadend = function(evt) {
					// got xml as string, parse it
					var parser = new DOMParser();
					var xmlDoc = parser.parseFromString(evt.target.result, "text/xml");
					app.loadXML(xmlDoc);
					// done loading, signal it
					app.signalDoneLoading();
				};
				freader.readAsText(file);
			}, this.onFail);
		}, this.onFail);
	},

	loadDataFromInternal: function(file) {
		this.signalStartedLoading();
		console.log("███ loading file: " + file);
		// load DOM
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.open("GET", file, false);
		xmlhttp.setRequestHeader("Content-Type", "text/xml");
		xmlhttp.send("");
		// TODO test if file is present
		// TODO event based loading?
		if (xmlhttp.status != 200) {
			console.log("███ couldn't open file: " + file + " - XMLHttpRequest.status=" + xmlhttp.status);
			return false;
		}
		var xmlDoc = xmlhttp.responseXML;
		this.loadXML(xmlDoc);
		// done loading, signal it
		this.signalDoneLoading();
	},
	// Show Details
	//
	// shows the invisible details of current element
	show: function() {
		// show current element
		document.getElementById("text_hanzi").style.visibility = "visible";
		document.getElementById("text_pinyin").style.visibility = "visible";
		document.getElementById("text_translation").style.visibility = "visible";
		document.getElementById("text_comment").style.visibility = "visible";
	},
	// Next Element
	//
	// picks a random element either normal or from favorites
	next: function() {
		// hide everything
		document.getElementById("text_hanzi").style.visibility = "hidden";
		document.getElementById("text_pinyin").style.visibility = "hidden";
		document.getElementById("text_translation").style.visibility = "hidden";
		document.getElementById("text_comment").style.visibility = "hidden";

		// get a new (different than current) element
		var tempElement = null;
		var maxSteps = 100; // this is used to catch anything like only one element or elements with the same id
		var occSteps = 10;
		var currentStep = 0;

		do {
			var favsArray = Object.keys(app.oFavs);
			// TODO correct random probability
			if ((favsArray.length > 0) && (Math.floor(Math.random() / CONST_FAV_PROBABILITY) < 1) || app.aData.length <= favsArray.length) {
				// if there are favorites and we got a corresponding random or when all data are favorites
				// get a random favorite
				var randomIndex = Math.floor(Math.random() * favsArray.length);
				var i = 0;
				while (app.aData[i].hanzi != favsArray[randomIndex])
					i++;
				tempElement = app.aData[i];
			} else {
				// get a random element (which also could be a favorite)
				// (try to get the one with lowest # of occs)
				for (i = 0; i < occSteps; i++) {
					var randomIndex = Math.floor(Math.random() * app.aData.length);
					if (!tempElement || tempElement.occurance > app.aData[randomIndex].occurance)
						tempElement = app.aData[randomIndex];
				}
			}
			// now test if it's the same element as the current displayed
			currentStep++;
		} while (app.oCurrentHanzi.hanzi == tempElement.hanzi && currentStep < maxSteps)
		app.oCurrentHanzi = tempElement;

		//console.log(tempElement.occurance + " occs");
		tempElement.occurance++;
		
		// update favorite button
		if(app.oCurrentHanzi.hanzi in app.oFavs)
			document.getElementById("fav_b").style.backgroundImage = "url('img/star_fav.png')";
		else
			document.getElementById("fav_b").style.backgroundImage = "url('img/star_nofav.png')";
		// update data
		document.getElementById("text_hanzi").innerHTML = app.oCurrentHanzi.hanzi;
		document.getElementById("text_pinyin").innerHTML = app.oCurrentHanzi.pinyin;
		document.getElementById("text_translation").innerHTML = app.oCurrentHanzi.translation;
		document.getElementById("text_comment").innerHTML = app.oCurrentHanzi.comment;
		// show stuff according to current mode TODO
		document.getElementById("text_hanzi").style.visibility = "visible";
	},
	// TTS for current element
	playAudio: function() {
		var hanzi = app.oCurrentHanzi.hanzi;
		if (!app.aAudioBuffer[hanzi]) {
			// load the audio
			console.log("loading audio...");
			var url = app.sAudioURL + hanzi;
			//var audio = new Audio(url);

			//audio.load(); // TODO: doesn't seem to store the audio in memory
			//app.aAudioBuffer[hanzi] = audio;

			app.downloadFile(url, "sdcard/chinese_vocabulary/audio/" + hanzi + ".mp3");
			audio = new Media("chinese_vocabulary/audio/" + hanzi + ".mp3");
			app.aAudioBuffer[hanzi] = audio;
		}
		// play the audio
		app.aAudioBuffer[hanzi].play();
	},
	// download the file from url to outPath
	downloadFile: function(url, outPath) {
		var fileTransfer = new FileTransfer();

		fileTransfer.download(
			url,
			outPath,
			function(entry) {
				console.log("download complete: " + entry.fullPath);
			},
			function(error) {
				console.log("download error source " + error.source);
				console.log("download error target " + error.target);
				console.log("upload error code" + error.code);
			},
			false
		);
	},
	// switch to settings on menu key
	onMenuKeyDown: function() {
		window.open("settings.html", "_self");
	},
	// fail function which displaces an alert
	onFail: function(error) {
		console.log("███ fail :(");
		alert("Fail: " + error.code);
	},
	// getter
	getFontSize: function() {
		// TODO if isset
		return "16px";
	}
};
