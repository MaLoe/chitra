/*
 * License TODO
 */

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
Object.size = function(obj) {
	var size = 0, key;
	for (key in obj)
		if (obj.hasOwnProperty(key)) size++;
	return size;
};

var vtrainer = {
	oCurrentHanzi: undefined, /** current hanzi */
	oFavs: {},                /** favorite hanzi */
	oData: {},                /** runtime storage of vocables and their data - Map<FileURL, Collection<Vocable>> */
	aAudioBuffer: [],
	bDoneSettingUpLoaders: false,
	fInitializeCallback: undefined,
	nToLoadFiles: 0,   /** XML loading is based on events, so we can easily end up with some parallel functions waiting for FS while our program is allready at the point where it could try to get the next element. We have to wait until all loaders finish. */

	SETTINGS: {
		TTS: "sAudioURL",
		MODE: "sMode",
		FONTSIZE: "dFontSize"
	},
	MODES: {
		VOCABLE: "to_trans",
		TRANSLATION: "to_vocable",
		AUDIO: "audio"
	},

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

				try {
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
				} catch (e) {
					vtrainer.onFail(e, "Couldn't parse entry #" + i + " in XML '" + sKey + "', failed while reading vocable, pronunciation and translation.");
				}
			}
			console.log("███ parsed XML, entries: " + xmlEntries.length);
		} catch (e) {
			vtrainer.onFail(e, "Couldn't parse XML '" + sKey + "', failed while getting root.children(entry).");
		}
		this.oData[sKey] = aVocabulary;
	},

	//! load data from URL. This is a callback, no return value possible.
	/*!
	 * @param sKey the key, under which it should be saved in data
	 * @param sFileURL URL of a file, from which the data should be loaded
	 */
	loadDataFromURL: function(sKey, sFileURL) {
		vtrainer.getDir(null, function(appDir) {
			// get cache/data dir of our application directory
			var sCachedFilePath = appDir.nativeURL + vtrainer.getCachedURL(sFileURL);

			console.log("███ loading file from url: " + sFileURL + "\n -> checking if cached ("+sCachedFilePath+")");
			// check if file is cached and open it, if not, download it
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
		});
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
			this.oFavs[vocable] = true;
			checked = true;
		}
		console.log("███ toggle: " + vocable + " - " + checked);
		localStorage.setItem("favs", JSON.stringify(this.oFavs));
		return checked;
	},
	getRandomVocable: function() {
		var aFiles = Object.keys(vtrainer.oData);
		var sFileURL = aFiles[Math.floor(Math.random() * aFiles.length)];
		return vtrainer.oData[sFileURL][Math.floor(Math.random() * vtrainer.oData[sFileURL].length)];
	},
	getRandomFavoriteVocable: function() {
		var favsArray = Object.keys(vtrainer.oFavs);
		// TODO: there might be favorites, which files are deactivated
		if (favsArray.length > 0) {
			// if there are favorites and we got a corresponding random or when all data are favorites
			// get a random favorite
			var randomIndex = Math.floor(Math.random() * favsArray.length);
			// search for the whole vocable
			for (var sFileURL in vtrainer.oData)
				if (vtrainer.oData.hasOwnProperty(sFileURL))
					for (var i = 0; i < vtrainer.oData[sFileURL].length; i++)
						if (vtrainer.oData[sFileURL][i].vocable == favsArray[randomIndex])
							return vtrainer.oData[sFileURL][i];
		}
		console.log("███ couldn't get a random favorite vocable");
		return undefined;
	},
	// Next Element
	//
	// picks a random element either normal or from favorites
	next: function() {
		// get a new (different than current) element
		var tempElement = null;
		var currentStepNum = 0;
		var unlike = this.oCurrentHanzi;

		if (!unlike) {
			tempElement = this.getRandomVocable();
		} else {
			// TODO: proper probability
			if ((Object.size(this.oFavs) > 0) && (Math.floor(Math.random() / this.getSetting("dFavProbability")) < 1))
				var randomGetterFunc = this.getRandomFavoriteVocable;
			else
				var randomGetterFunc = this.getRandomVocable;
			do {
				// try to get the one with lowest # of occurences
				for (i = 0; i < this.getSetting("nMinNextSteps"); i++) {
					randomVoc = randomGetterFunc();
					if (randomVoc && (!tempElement || (tempElement.occurrences-tempElement.shown) > (randomVoc.occurrences-randomVoc.shown)))
						tempElement = randomVoc;
				}
				if (!tempElement) {
					// this is a temporary fix while the favGetter is broken TODO: remove this and "(randomVoc &&"
					tempElement = this.getRandomVocable();
				}
				currentStepNum++;
				// now test if it's the same element as the current displayed
			} while (unlike.vocable == tempElement.vocable && currentStepNum < this.getSetting("nMaxNextSteps"))
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
			console.log("███ loading audio for: " + hanzi);
			vtrainer.getDir("cache/audio/", function(audioDir) {
				var sFileName =  hanzi + ".mp3";
				var sCachedFilePath = audioDir.nativeURL + sFileName;
				// try to read from cache first, if not present, load it if TTS set
				audioDir.getFile(sFileName, {create: false}, function() {
					// file exists
					vtrainer.aAudioBuffer[hanzi] = new Media(sCachedFilePath);
					vtrainer.aAudioBuffer[hanzi].play();
				}, function() {
					// file is not cached
					if (vtrainer.getSetting(vtrainer.SETTINGS.TTS)) {
						// download audio file
						var url = vtrainer.getSetting(vtrainer.SETTINGS.TTS) + hanzi;
						vtrainer.downloadFile(url, sCachedFilePath, function (url, out) {
							// audio loaded, cache and play it
							vtrainer.aAudioBuffer[hanzi] = new Media(sCachedFilePath);
							vtrainer.aAudioBuffer[hanzi].play();
						}, function(e){
							vtrainer.onFail(
								e, "couldn't download \"" + e.source + "\":\nerror code: " + e.code
								+ "\nhttp status: " + e.http_status
							);
						});
					} else {
						alert("You need a working TTS-URL for this feature.");
					}
				});
			});
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
				console.log("███ download complete: " + entry.fullPath);
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
		var version = 2;
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
			sMode: this.MODES.VOCABLE,
			dFontSize: 1.0,
			dFavProbability: 0.25,
			nMinNextSteps: 10, // next() - take one element out of a set with this size with the lowest (occurences minus shown)-ratio
			nMaxNextSteps: 100, // next() - this is used to catch anything like only one element or elements with the same id
			nVersion: version // change this to force an update/reinitialization of settings
		}
		onSuccess();
	},
	// fail function which displays an alert
	onFail: function(error, msg) {
		var msg = msg ? msg : "Error:";
		// TODO: do this only if debug or if msg undefined
		if (error != null)
			msg += "\n\n" + JSON.stringify(error, null, "  ");

		if (navigator.notification)
			navigator.notification.alert(msg, null, Error, 'OK');
		else
			alert(msg);
	},

	// ███████████████ getter/setter ██████████████████████████████████████████████████████████████████████
	getDir: function(path, onSuccess) {
		var fullPath = "ChiTra/";
		if (path)
			fullPath +=  path;
		console.log("███ requesting directory: " + fullPath);
		// create directories if not present
		var dirs = fullPath.split("/").reverse();
		window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
			var root = fileSystem.root;

			var createDir = function(dir){
				root.getDirectory(
					dir, {create : true, exclusive : false},
					successCB, function(e) { vtrainer.onFail(e, "failed to create dir " + dir); });
			};

			var successCB = function(entry){
				root = entry;
				if(dirs.length > 0){
					createDir(dirs.pop());
				}else{
					onSuccess(entry);
				}
			};

			createDir(dirs.pop());
		}, function(e){vtrainer.onFail(e, "requestFileSystem failed")});
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
	// cache related
	getCachedURL: function(sURL) {
		return sCachedFilePath = "cache/data/" + sURL.hashCode() + ".xml";
	},
	clearCache: function() {
		vtrainer.getDir("cache", function(cacheDir) {
			cacheDir.removeRecursively(function(){}, vtrainer.onFail);
		});
	},
	cacheFile: function(sURL) {
		vtrainer.getDir(null, function(appDir) {
			var sCachedFilePath = appDir.nativeURL + vtrainer.getCachedURL(sURL);
			vtrainer.downloadFile(sURL, sCachedFilePath, function (url, out) {
				vtrainer.onFail(null, "File cached/reloaded.");
			}, function (e) {
				vtrainer.onFail(
					e, "couldn't cache \"" + e.source + "\":\nerror code: " + e.code
					+ "\nhttp status: " + e.http_status
				);
			});
		});
	},
	fillCache: function() {
		vtrainer.onFail(null, "TODO");
	},
	// settings related
	importSettings: function(sURL) {
		console.log("███ importing settings from: " + sURL);
		// TODO: message/dialog: imported correctly
		// TODO
		// if a settings file is present, load it and overwrite values
		vtrainer.getDir(null, function(appDir) {
			appDir.getFile("settings.json", null, function(fileEntry) {
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
							vtrainer.saveSettings();
							vtrainer.onFail(null, "Imported settings correctly.");
						} catch (e) {
							vtrainer.onFail(e, "couldn't parse settings file");
						}
					};
					reader.onerror = function(e){
						vtrainer.onFail(null, "couldn't read " + appDir.nativeURL + "/settings.json");
					};
					reader.readAsText(file);
				});
			}, function(e){
				// settings file probably not found
			});
		});
	},
	setDefaultSettings: function() {
		// TODO
		localStorage.removeItem("settings");
		localStorage.removeItem("data");
		localStorage.removeItem("favs");
	},
	getSetting: function(key) {
		return this.oSettings[key];
	},
	setSetting: function(key, value) {
		this.oSettings[key] = value;
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
