/*
 * License TODO
 */
// TODO reset favs before first next or ensure that greeting isn't favorable or remove greeting

var CONST_FAV_PROBABILITY = 0.25;
var standard_files = [
	//{ url : "data/ger_radicals_1.xml", checked : true },
	//{ url : "data/ger_radicals_2.xml", checked : true },
	//{ url : "data/ger_radicals_3.xml", checked : true },
	//{ url : "data/ger_radicals_4.xml", checked : true },
	//{ url : "data/ger_radicals_5.xml", checked : true },
	{ url : "data/en_numbers.xml", checked : true }
]

var vtrainer = {
	oCurrentHanzi: undefined,   // current hanzi
	oFavs: {},          // favorite hanzi
	aData: [],         // runtime storage of hanzi and their data
	aAudioBuffer: [],
	sAudioURL: "",
	bDoneSettingUpLoaders: false,
	nToLoadFiles: 0,   // XML loading is based on events, so we can easily end up with some parallel functions waiting for FS while our program is allready at the point where it could try to get the next element. We have to wait until all loaders finish.
	// TODO minNextSteps / occsteps -> settings
	// TODO maxNextSteps -> settings

    // Application Constructor
    initialize: function(onSuccess) {
		this.onSuccess = onSuccess;
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
		this.reloadData();
    },
	// ███████████████ data loading etc. ██████████████████████████████████████████████████████████████████
	// Callbacks for signaling that all Loaders are done
	signalStartedLoading: function() {
		if (isNaN(this.nToLoadFiles))
			this.nToLoadFiles = 1;
		else
			this.nToLoadFiles++;
	},
	signalDoneLoading: function() {
		this.nToLoadFiles--;
		if (this.nToLoadFiles <= 0 && this.bDoneSettingUpLoaders) {
			// save to local storage
			// TODO
			localStorage.setItem("data", JSON.stringify(this.aData));

			console.log("███ finished loading data");
			this.onSuccess();
		}
	},
	// Reload Data 
	//
	// reload all data, favorites etc.
	reloadData: function() {
		this.bDoneSettingUpLoaders = false;
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
					this.loadDataFromLocalFS(aFiles[i].url, on);
				// check if it's in the webz
				} else if (url.match(/^http:/)) {
					console.log("███ TODO web loading");
				} else {
					console.log("███ TODO corrupted stuff");
					//alert("corrupted data: unrecognized filetype: " + JSON.stringify(aFiles[i]);
				}
			}
		}
		// Done setting up loaders: if all async loaders are finished, someone calls onSuccess
		this.bDoneSettingUpLoaders = true;
		this.signalDoneLoading(); // just in case something was really fast and bDoneSettingUpLoaders was false
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
				vocable       : xmlEntries[j].getElementsByTagName("hanzi")[0].childNodes[0].nodeValue,
				pronunciation : xmlEntries[j].getElementsByTagName("pinyin")[0].childNodes[0].nodeValue,
				translation   : xmlEntries[j].getElementsByTagName("translation")[0].childNodes[0].nodeValue,
				comment       : temp_comment,
				occurrences   : 0,
				shown         : 0,
				favorite 	  : false
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
					this.loadXML(xmlDoc);
					// done loading, signal it
					this.signalDoneLoading();
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
		xmlhttp.open("GET", file, true);
		xmlhttp.setRequestHeader("Accept", "application/xml");
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4) {
				if (xmlhttp.status == 200) {
					var xmlDoc = xmlhttp.responseXML;
					vtrainer.loadXML(xmlDoc);
					// done loading, signal it
					vtrainer.signalDoneLoading();
				}
			}
		}
		xmlhttp.send(null);
	},

	// ███████████████ main functions █████████████████████████████████████████████████████████████████████

	// Favorite Toggle
	//
	// Toggles for current element the favorite state. Returns true if the current vocable was turned into
	// a favorite.
	toggleFav: function(vocable) {
		if(vocable in this.oFavs) {
			delete this.oFavs[vocable];
			return false;
		}
		else {
			this.oFavs[vocable] = this.oCurrentHanzi;
			return true;
		}
	},
	// Next Element
	//
	// picks a random element either normal or from favorites
	next: function() {
		// get a new (different than current) element
		var tempElement = null;
		var maxSteps = 100; // this is used to catch anything like only one element or elements with the same id
		var occSteps = 10;
		var currentStep = 0;

		if (!this.oCurrentHanzi) {
			tempElement = this.aData[Math.floor(Math.random() * this.aData.length)];
		} else {
			do {
				var favsArray = Object.keys(this.oFavs);
				// TODO correct random probability
				if ((favsArray.length > 0) && (Math.floor(Math.random() / CONST_FAV_PROBABILITY) < 1) || this.aData.length <= favsArray.length) {
					// if there are favorites and we got a corresponding random or when all data are favorites
					// get a random favorite
					var randomIndex = Math.floor(Math.random() * favsArray.length);
					var i = 0;
					while (this.aData[i].vocable != favsArray[randomIndex])
						i++;
					tempElement = this.aData[i];
				} else {
					// get a random element (which also could be a favorite)
					// (try to get the one with lowest # of occs)
					for (i = 0; i < occSteps; i++) {
						var randomIndex = Math.floor(Math.random() * this.aData.length);
						if (!tempElement || (tempElement.occurrences-tempElement.shown) > (this.aData[randomIndex].occurrences-this.aData[randomIndex].shown))
							tempElement = this.aData[randomIndex];
					}
				}
				// now test if it's the same element as the current displayed
				currentStep++;
			} while (this.oCurrentHanzi.vocable == tempElement.vocable && currentStep < maxSteps)
		}
		this.oCurrentHanzi = tempElement;

		tempElement.occurrences++;
	},

	show: function() {
		this.oCurrentHanzi.shown++;
	},

	// ███████████████ helper functions ███████████████████████████████████████████████████████████████████

	// getters
	getCurrentPronunciation: function() {
		return this.oCurrentHanzi.pronunciation;
	},
	getCurrentTranslation: function() {
		return this.oCurrentHanzi.translation;
	},
	getCurrentComment: function() {
		return this.oCurrentHanzi.comment;
	},
	getCurrentVocable: function() {
		return this.oCurrentHanzi.vocable;
	},
	getLoadedVocables: function() {
		return this.aData;
	},
	isFavorite: function(vocable) {
		return (vocable in this.oFavs)
	},

	// TTS for current element
	playAudio: function() {
		var hanzi = this.oCurrentHanzi.vocable;
		if (!this.aAudioBuffer[hanzi]) {
			// load the audio
			console.log("loading audio...");
			var url = this.sAudioURL + hanzi;

			this.downloadFile(url, "sdcard/chinese_vocabulary/audio/" + hanzi + ".mp3", function (url, out) {
				// audio loaded, cache and play it
				audio = new Media("chinese_vocabulary/audio/" + hanzi + ".mp3");
				this.aAudioBuffer[hanzi] = audio;
				audio.play();
			});
		} else {
			// play the audio
			this.aAudioBuffer[hanzi].play();
		}
	},
	// download the file from url to outPath
	downloadFile: function(url, outPath, onSuccess) {
		var fileTransfer = new FileTransfer();

		fileTransfer.download(
			url,
			outPath,
			function(entry) {
				console.log("███ download complete: " + entry.fullPath);
				onSuccess(url, outPath);
			},
			this.onFail,
			false
		);
	},
	// fail function which displays an alert
	onFail: function(error) {
		if (navigator.notification) {
			navigator.notification.alert("Fail: " + error.code, null, Error, 'OK');
		} else {
			alert("Fail: " + error.code);
		}
	}
};
