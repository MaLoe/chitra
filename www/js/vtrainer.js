/*
 * License TODO
 */
// TODO reset favs before first next or ensure that greeting isn't favorable or remove greeting
// console.log("███" + JSON.stringify(dir,null,4)); -> indented output of an object - console.dir doesn't work nice in adb

/*
 * hash function from StackOverflow by Jesse Shieh
 */
String.prototype.hashCode = function() {
	var hash = 0, i, chr, len;
	if (this.length == 0) return hash;
	for (i = 0, len = this.length; i < len; i++) {
		chr   = this.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};

var CONST_FAV_PROBABILITY = 0.25;
var standard_files = [
	{ url : "https://raw.githubusercontent.com/MaLoe/chitra/master/vocabulary/en_numbers.xml", checked : true, name : "numbers en" }
]

var vtrainer = {
	oCurrentHanzi: undefined,   // current hanzi
	oFavs: {},          // favorite hanzi
	aData: [],         // runtime storage of hanzi and their data
	aAudioBuffer: [],
	sAudioURL: "",
	bDoneSettingUpLoaders: false,
	fInitializeCallback: undefined,
	nToLoadFiles: 0,   // XML loading is based on events, so we can easily end up with some parallel functions waiting for FS while our program is allready at the point where it could try to get the next element. We have to wait until all loaders finish.
	// TODO minNextSteps / occsteps -> settings
	// TODO maxNextSteps -> settings

    // Application Constructor
    initialize: function(onSuccess) {
		this.fInitializeCallback = onSuccess;
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
	signalDoneLoading: function() {
		this.nToLoadFiles--;
		if (this.nToLoadFiles <= 0) {
			// save to local storage
			// TODO
			localStorage.setItem("data", JSON.stringify(this.aData));

			console.log("███ finished loading data");
			this.fInitializeCallback();
		}
	},
	// Reload Data 
	//
	// reload all data, favorites etc.
	reloadData: function() {
		this.bDoneSettingUpLoaders = false;
		var aFiles = JSON.parse(localStorage.getItem("files"));
		this.nToLoadFiles = aFiles.length;
		console.log("███ loading data, number of files: " + this.nToLoadFiles);
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
				} else if (url.match(/^https?:/)) {
					this.loadDataFromURL(aFiles[i].url);
				// something strange is in the base
				} else {
					console.log("█!█ scipping file, unreadable url: \"" + url + "\", left: " + (vtrainer.nToLoadFiles - 1));
					vtrainer.signalDoneLoading(); // because the signalDoneLoading depends on the count relative to all files, we also have to signal files which we skip
					//TODO: alert("corrupted data: unrecognized filetype: " + JSON.stringify(aFiles[i]);
				}
			} else {
				console.log("███ scipping unchecked file");
				vtrainer.signalDoneLoading(); // because the signalDoneLoading depends on the count relative to all files, we also have to signal files which we skip
			}
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
				vocable       : xmlEntries[j].getElementsByTagName("vocable")[0].childNodes[0].nodeValue,
				pronunciation : xmlEntries[j].getElementsByTagName("pronunciation")[0].childNodes[0].nodeValue,
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

	loadDataFromURL: function(sFileURL) {
		window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
			// get cache/data dir of our application directory
			// this has to be requested separately because this function failed to create "cache/data"
			fileSystem.root.getDirectory("cache", {create: true, exclusive: false}, function(dir) {
				dir.getDirectory("data", {create: true, exclusive: false}, function(subdir) {
					var sCachedFilePath = subdir.nativeURL + sFileURL.hashCode() + ".xml";

					console.log("███ loading file from url: " + sFileURL + "\n -> checking if cached ("+sCachedFilePath+")");
					// check if file is cached and open it, if not, download it
					// TODO: delete file if size == 0
					window.resolveLocalFileSystemURL(sCachedFilePath, function(fileEntry) {
						// file is cached
						console.log("███ is cached, opening");

						vtrainer.loadDataFromLocalFS(sCachedFilePath);
					}, function(fail) {
						// file not found, download it
						console.log("███ not cached, downloading " + sFileURL + " to " + sCachedFilePath);

						var fileTransfer = new FileTransfer();
						var uri = encodeURI(sFileURL);

						fileTransfer.download(
							uri,
							sCachedFilePath,
							function(entry) {
								console.log("download complete: " + entry.fullPath);
								vtrainer.loadDataFromLocalFS(sCachedFilePath);
							},
							function(error) {
								console.log("download error source " + error.source);
								console.log("download error target " + error.target);
								console.log("download error code " + error.code);
							},
							false,
							{
								headers: {
								}
							}
						);
					});
				}, function(e){vtrainer.onFail(e, "getDirectory(\"cache/data\") in loadDataFromURL(\"" + sFileURL + "\") failed")});
			}, function(e){vtrainer.onFail(e, "getDirectory(\"cache\") in loadDataFromURL(\"" + sFileURL + "\") failed")});
		}, function(e){vtrainer.onFail(e, "requestFileSystem in loadDataFromURL(\"" + sFileURL + "\") failed")});
	},

	loadDataFromLocalFS: function(sFileURL) {
		console.log("███ loading local file: " + sFileURL);
		// get file
        window.resolveLocalFileSystemURL(sFileURL, function(fileEntry) {
			fileEntry.file(function(file) {
				var freader = new FileReader();
				freader.onloadend = function(evt) {
					// got xml as string, parse it
					var parser = new DOMParser();
					var xmlDoc = parser.parseFromString(evt.target.result, "text/xml");
					vtrainer.loadXML(xmlDoc);
					// done loading, signal it
					vtrainer.signalDoneLoading();
					console.log("███ finished loading local file, left: " + vtrainer.nToLoadFiles);
				};
				freader.readAsText(file);
			}, function(e){vtrainer.onFail(e, "getting file in loadDataFromLocalFS(\"" + sFileURL + "\") failed")});
		}, function(e){vtrainer.onFail(e, "resolveLocalFileSystemURL in loadDataFromLocalFS(\"" + sFileURL + "\") failed")});
	},

	loadDataFromInternal: function(sFileURL) {
		console.log("███ loading internal file: " + sFileURL);
		// load DOM
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.open("GET", sFileURL, true);
		xmlhttp.setRequestHeader("Accept", "application/xml");
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4) {
				if (xmlhttp.status == 200) {
					var xmlDoc = xmlhttp.responseXML;
					vtrainer.loadXML(xmlDoc);
					// done loading, signal it
					vtrainer.signalDoneLoading();
					console.log("███ finished loading internal file, left: " + vtrainer.nToLoadFiles);
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

			// TODO update to appdir/cache
			this.downloadFile(url, "sdcard/chinese_vocabulary/audio/" + hanzi + ".mp3", function (url, out) {
				// audio loaded, cache and play it
				// TODO update to appdir/cache
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
	// TODO: print a custom message
	onFail: function(error, msg) {
		if (!msg)
			msg = "Error:";
		msg += " " + JSON.stringify(error);

		if (navigator.notification)
			navigator.notification.alert(msg, null, Error, 'OK');
		else
			alert(msg);
	}
};
