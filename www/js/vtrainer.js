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

var vtrainer = {
	oCurrentHanzi: undefined, /** current hanzi */
	oFavs: {},                /** favorite hanzi */
	oData: {},                /** runtime storage of vocables and their data - Map<FileURL, Collection<Vocable>> */
	aAudioBuffer: [],
	bDoneSettingUpLoaders: false,
	fInitializeCallback: undefined,
	nToLoadFiles: 0,   /** XML loading is based on events, so we can easily end up with some parallel functions waiting for FS while our program is allready at the point where it could try to get the next element. We have to wait until all loaders finish. */

	oSettings: {},

    // Application Constructor
    initialize: function(onSuccess) {
		// load data
		// TODO test data structure?
		if (localStorage.getItem("data"))
			this.oData = JSON.parse(localStorage.getItem("data"));
		if (localStorage.getItem("favs"))
			this.oFavs = JSON.parse(localStorage.getItem("favs"));

		this.loadSettings(function() {
			vtrainer.reloadData(onSuccess); // check if the data in oData is the one for the current files and load/remove if necessary
		});
    },
	// ███████████████ data loading etc. ██████████████████████████████████████████████████████████████████
	// Callbacks for signaling that all Loaders are done
	signalDoneLoading: function() {
		this.nToLoadFiles--;
		if (this.nToLoadFiles <= 0) {
			// save to local storage
			if (this.oData)
				localStorage.setItem("data", JSON.stringify(this.oData));

			console.log("███ finished loading data");
			this.fInitializeCallback();
		}
	},
	// Reload Data 
	//
	// reload all data, favorites etc.
	reloadData: function(onSuccess) {
		this.fInitializeCallback = onSuccess; // we are working with callbacks and that's why we have to remember this function and call it later
		this.bDoneSettingUpLoaders = false;
		var aURLs = Object.keys(this.oSettings.oFiles);
		this.nToLoadFiles = aURLs.length;
		console.log("███ loading data, number of files: " + this.nToLoadFiles);
		// iterate over files in oData and check if they are still selected, remove if necessary
		for (var sFileURL in this.oData) {
			if (this.oData.hasOwnProperty(sFileURL)) {
				var unchecked = null;
				for (var sURL in this.oSettings.oFiles) {
					if (sFileURL == sURL) {
						unchecked = !this.oSettings.oFiles[sURL].checked;
						break;
					}
				}

				if (unchecked)
					delete this.oData[sFileURL]; // remove this data because the file is unchecked
			}
		}
		// start up loaders for every checked file
		for (var sURL in this.oSettings.oFiles) {
			if (this.oSettings.oFiles.hasOwnProperty(sURL)
					&& this.oSettings.oFiles[sURL].checked
					&& !this.oData.hasOwnProperty(sURL)) {
				// check if it's internal
				if (sURL.match(/^data\//)) {
					this.loadDataFromInternal(sURL, sURL);
				// check if it's in local filesystem
				} else if (sURL.match(/^file:/)) {
					this.loadDataFromLocalFS(sURL, sURL);
				// check if it's in the webz
				} else if (sURL.match(/^https?:/)) {
					this.loadDataFromURL(sURL, sURL);
				// something strange is in the base
				} else {
					console.log("█!█ skipping file, unreadable url: \"" + sURL + "\", left: " + (vtrainer.nToLoadFiles - 1));
					vtrainer.signalDoneLoading(); // because the signalDoneLoading depends on the count relative to all files, we also have to signal files which we skip
					//TODO: alert("corrupted data: unrecognized filetype: " + JSON.stringify(this.oSettings.oFiles[sURL]);
				}
			} else {
				console.log("███ skipping unchecked or already loaded file");
				vtrainer.signalDoneLoading(); // because the signalDoneLoading depends on the count relative to all files, we also have to signal files which we skip
			}
		}
	},
	// Load XML
	//
	// loads all data from specified XML and pushes them into the array containing all data
	loadXML: function(sKey, xmlDoc) {
		console.log("███ parsing XML: " + sKey);
		var aVocabulary = [];
		try {
			var xmlEntries = xmlDoc.getElementsByTagName("entry");
			// go through every element of this DOM and push them into the array
			for (var i = 0; i < xmlEntries.length; i++) {
				// comment might be absent, handle this
				var xmlElementComment = xmlEntries[i].getElementsByTagName("comment");
				if (xmlElementComment.length < 1)
					var temp_comment = "";
				else
					var temp_comment = xmlElementComment[0].childNodes[0].nodeValue;

				var element = {
					vocable       : xmlEntries[i].getElementsByTagName("vocable")[0].childNodes[0].nodeValue,
					pronunciation : xmlEntries[i].getElementsByTagName("pronunciation")[0].childNodes[0].nodeValue,
					translation   : xmlEntries[i].getElementsByTagName("translation")[0].childNodes[0].nodeValue,
					comment       : temp_comment,
					occurrences   : 0,
					shown         : 0,
					favorite      : false
				}
				aVocabulary.push(element);
			}
			console.log("███ parsed XML, entries: " + xmlEntries.length);
		} catch (e) {
			vtrainer.onFail("couldn't parse XML \"" + sKey + "\":\n" + e);
		}
		this.oData[sKey] = aVocabulary;
	},

	//! load data from URL. This is a callback, no return value possible.
	/*!
	 * @param sKey the key, under which it should be saved in data
	 * @param sFileURL URL of a file, from which the data should be loaded
	 */
	loadDataFromURL: function(sKey, sFileURL) {
		window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
			// get cache/data dir of our application directory
			// this has to be requested separately because this function failed to create "cache/data"
			// TODO: after updating phonegap to 3.7.0 the filehandling seems to have changed
			fileSystem.root.getDirectory("cache", {create: true, exclusive: false}, function(dir) {
				dir.getDirectory("data", {create: true, exclusive: false}, function(subdir) {
					var sCachedFilePath = subdir.nativeURL + sFileURL.hashCode() + ".xml";

					console.log("███ loading file from url: " + sFileURL + "\n -> checking if cached ("+sCachedFilePath+")");
					// check if file is cached and open it, if not, download it
					// TODO: delete file if size == 0 or redownload or something
					window.resolveLocalFileSystemURL(sCachedFilePath, function(fileEntry) {
						// file is cached
						console.log("███ is cached, opening");

						vtrainer.loadDataFromLocalFS(sKey, sCachedFilePath);
					}, function(fail) {
						// file not found, download it
						console.log("███ not cached, downloading " + sFileURL + " to " + sCachedFilePath);
						vtrainer.downloadFile(sFileURL, sCachedFilePath, function (url, out) {
							vtrainer.loadDataFromLocalFS(sKey, sCachedFilePath);
						}, function(e){
							vtrainer.onFail(
								e, "couldn't download \"" + e.source + "\":\nerror code: " + e.code
								+ "\nhttp status: " + e.http_status
							);
						});
					});
				}, function(e){vtrainer.onFail(e, "getDirectory(\"cache/data\") in loadDataFromURL(\"" + sFileURL + "\") failed")});
			}, function(e){vtrainer.onFail(e, "getDirectory(\"cache\") in loadDataFromURL(\"" + sFileURL + "\") failed")});
		}, function(e){vtrainer.onFail(e, "requestFileSystem in loadDataFromURL(\"" + sFileURL + "\") failed")});
	},

	loadDataFromLocalFS: function(sKey, sFileURL) {
		console.log("███ loading local file: " + sFileURL);
		// get file
        window.resolveLocalFileSystemURL(sFileURL, function(fileEntry) {
			fileEntry.file(function(file) {
				var freader = new FileReader();
				freader.onloadend = function(evt) {
					// got xml as string, parse it
					var parser = new DOMParser();
					var xmlDoc = parser.parseFromString(evt.target.result, "text/xml");
					vtrainer.loadXML(sKey, xmlDoc);
					// done loading, signal it
					vtrainer.signalDoneLoading();
					console.log("███ finished loading local file, left: " + vtrainer.nToLoadFiles);
				};
				freader.readAsText(file);
			}, function(e){vtrainer.onFail(e, "getting file in loadDataFromLocalFS(\"" + sFileURL + "\") failed")});
		}, function(e){vtrainer.onFail(e, "resolveLocalFileSystemURL in loadDataFromLocalFS(\"" + sFileURL + "\") failed")});
	},

	loadDataFromInternal: function(sKey, sFileURL) {
		console.log("███ loading internal file: " + sFileURL);
		// load DOM
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.open("GET", sFileURL, true);
		xmlhttp.setRequestHeader("Accept", "application/xml");
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4) {
				if (xmlhttp.status == 200) {
					var xmlDoc = xmlhttp.responseXML;
					vtrainer.loadXML(sKey, xmlDoc);
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
	// a favorite. Expects a string.
	toggleFav: function(vocable) {
		var checked;
		if (vocable in this.oFavs) {
			delete this.oFavs[vocable];
			// TODO slice
			checked = false;
		} else {
			// TODO: info.html, was das benutzt, hat kein ocurrenthanzi, welches aber in next benutzt wird
			// TODO: ich sollte entweder in favs nur die hanzi speichern oder kA
			this.oFavs[vocable] = true;
			checked = true;
		}
		console.log("███ toggle: " + vocable + " - " + checked);
		localStorage.setItem("favs", JSON.stringify(this.oFavs));
		return checked;
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
		var aFiles = Object.keys(this.oData);
		var favsArray = Object.keys(this.oFavs);

		if (!this.oCurrentHanzi) {
			var sFileURL = aFiles[Math.floor(Math.random() * aFiles.length)];
			tempElement = this.oData[sFileURL][Math.floor(Math.random() * this.oData[sFileURL].length)];
		} else {
			do {
				// TODO correct random probability
				if ((favsArray.length > 0) && (Math.floor(Math.random() / CONST_FAV_PROBABILITY) < 1)) {
					// if there are favorites and we got a corresponding random or when all data are favorites
					// get a random favorite
					var randomIndex = Math.floor(Math.random() * favsArray.length);
					// search for the whole vocable
					var found = undefined;
					for (var sFileURL in this.oData)
						if (this.oData.hasOwnProperty(sFileURL))
							for (var i = 0; i < this.oData[sFileURL].length && !found; i++)
								if (this.oData[sFileURL][i].vocable == favsArray[randomIndex])
									found = this.oData[sFileURL][i];

					tempElement = found;
				} else {
					var sFileURL = aFiles[Math.floor(Math.random() * aFiles.length)];
					// get a random element (which also could be a favorite)
					// (try to get the one with lowest # of occs)
					for (i = 0; i < occSteps; i++) {
						var randomIndex = Math.floor(Math.random() * this.oData[sFileURL].length);
						if (!tempElement || (tempElement.occurrences-tempElement.shown) > (this.oData[sFileURL][randomIndex].occurrences-this.oData[sFileURL][randomIndex].shown))
							tempElement = this.oData[sFileURL][randomIndex];
					}
				}
				// now test if it's the same element as the current displayed
				currentStep++;
			} while (this.oCurrentHanzi.vocable == tempElement.vocable && currentStep < maxSteps)
		}
		this.oCurrentHanzi = tempElement;

		tempElement.occurrences++;
		// save data
		localStorage.setItem("data", JSON.stringify(this.oData));
	},

	show: function() {
		this.oCurrentHanzi.shown++;
	},

	// TTS for current element
	playAudio: function() {
		var hanzi = this.oCurrentHanzi.vocable;
		if (!this.aAudioBuffer[hanzi]) {
			if (this.getTTSServerURL()) {
				// load the audio
				console.log("███ loading audio...");
				var url = this.getTTSServerURL() + hanzi;

				window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
					fileSystem.root.getDirectory("cache", {create: true, exclusive: false}, function(dir) {
						dir.getDirectory("audio", {create: true, exclusive: false}, function(subdir) {
							var sCachedFilePath = subdir.nativeURL + hanzi + ".mp3";
							vtrainer.downloadFile(url, sCachedFilePath, function (url, out) {
								// audio loaded, cache and play it
								audio = new Media(sCachedFilePath);
								vtrainer.aAudioBuffer[hanzi] = audio;
								audio.play();
							}, function(e){
								vtrainer.onFail(
									e, "couldn't download \"" + e.source + "\":\nerror code: " + e.code
									+ "\nhttp status: " + e.http_status
								);
							});
						}, function(e){vtrainer.onFail(e, "getDirectory(\"cache/audio\") in playAudio(\"" + hanzi + "\") failed")});
					}, function(e){vtrainer.onFail(e, "getDirectory(\"cache\") in playAudio(\"" + hanzi + "\") failed")});
				}, function(e){vtrainer.onFail(e, "requestFileSystem in playAudio(\"" + hanzi + "\") failed")});
			} else {
				alert("You need a working TTS-URL for this feature.");
			}
		} else {
			// play the audio
			this.aAudioBuffer[hanzi].play();
		}
	},
	// download the file from url to outPath
	downloadFile: function(sURL, sOutPath, onSuccess, onFail) {
		var fileTransfer = new FileTransfer();
		fileTransfer.download(
			encodeURI(sURL),
			sOutPath,
			function(entry) {
				// TODO entry.fullPath returns something strange
				console.log("download complete: " + entry.fullPath);
				onSuccess(sURL, sOutPath);
			},
			onFail,
			false,
			{
				headers: {
				}
			}
		);
	},
	saveSettings: function() {
		localStorage.setItem("settings", JSON.stringify(this.oSettings));
		console.log("███ saved settings");
	},
	loadSettings: function(onSuccess) {
		var version = 1;
		// try to load from persistent memory and if nothing's there, initialize it
		if (localStorage.getItem("settings")) {
			console.log("███ loading settings");
			this.oSettings = JSON.parse(localStorage.getItem("settings"));
			if (this.oSettings.nVersion == version) {
				// settings seem to alright
				onSuccess();
				return;
			}
		}
		console.log("███ reinitializing settings");
		// initialize with default settings
		this.oSettings = {
			oFiles: {
				"https://raw.githubusercontent.com/MaLoe/chitra/master/vocabulary/en_numbers.xml": { checked : true, name : "numbers en" }
				// TODO: radicals
			},
			sAudioURL: "",
			sMode: "to_trans",
			nMinNextSteps: 5, // TODO
			nMaxNextSteps: 10, // TODO
			nVersion: version // change this to force an update/reinitialization of settings
		}
		// if a settings file is present, load it and overwrite values
		window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
			fileSystem.root.getFile("settings.json", null, function(fileEntry) {
				fileEntry.file(function(file) {
					var reader = new FileReader();
					reader.onloadend = function(evt) {
						console.log("███ overwriting settings by file");
						try {
							var overwrites = JSON.parse(evt.target.result);
							// overwrite settings
							for (var setting in overwrites) {
								if (overwrites.hasOwnProperty(setting)) {
									vtrainer.oSettings[setting] = overwrites[setting];
								}
							}
						} catch (e) {
							vtrainer.onFail("couldn't parse settings file\n" + e);
						}
						onSuccess();
					};
					reader.onerror = function(e){
						// settings file probably not found, let's continue with our standard settings
						onSuccess();
					};
					reader.readAsText(file);
				});
			}, function(e){
				// settings file probably not found
				onSuccess();
			});
		}, function(e){vtrainer.onFail(e, "requestFileSystem in loadSettings() failed")});
	},
	// fail function which displays an alert
	onFail: function(error, msg) {
		var msg = msg ? msg : "Error:";
		// TODO: do this only if debug or if msg undefined
		msg += "\n\n" + JSON.stringify(error, null, "  ");

		if (navigator.notification)
			navigator.notification.alert(msg, null, Error, 'OK');
		else
			alert(msg);
	},

	// ███████████████ getter/setter ██████████████████████████████████████████████████████████████████████
	getDir: function(onSuccess) {
		// TODO: get main directory -> data/org.chitra or sdcard/org.chitra?
		// TODO: replace all calls to getRootDir
		return null;
	},
	// vocable related
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
		return this.oData;
	},
	isFavorite: function(vocable) {
		return (vocable in this.oFavs)
	},
	getFavorites: function() {
		return this.oFavs;
	},
	// settings related
	getTTSServerURL: function() {
		return this.oSettings.sAudioURL;
	},
	setTTSServerURL: function(sURL) {
		this.oSettings.sAudioURL = sURL;
		this.saveSettings();
	},
	getMode: function() {
		return this.oSettings.sMode;
	},
	setMode: function(sMode) {
		this.oSettings.sMode = sMode;
		this.saveSettings();
	},
	getFileSelections: function() {
		return this.oSettings.oFiles;
	},
	setFileSelection: function(sUrl, bChecked) {
		this.oSettings.oFiles[sUrl].checked = bChecked;
		this.saveSettings();
	},
	setFile: function(sUrl, bChecked, sName) {
		this.oSettings.oFiles[sUrl] = { checked: bChecked, name: sName };
		this.saveSettings();
	}
};
