/*
 * License TODO
 */

function initialize () {
	console.log("███ initializing...");
	document.addEventListener("deviceready", onDeviceReady, false);
}

function onDeviceReady () {
	// Get a directory reader and display selected files
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
		//console.log("███ got FS!");
		fileSystem.root.getDirectory("./chinese_vocabulary", { create: true, exclusive: false }, function(directoryEntry) {
			//console.log("███ got dir entry!");

			var directoryReader = directoryEntry.createReader();
			// Get a list of all the entries in the directory
			directoryReader.readEntries(fillTable, onFail);
		}, onFail);
		/*fileSystem.root.getDirectory("/mnt/sdcard/chinese_vocabulary", { create: false, exclusive: false }, function(directoryEntry) {
			console.log("███ got dir entry for mnt/sdcard!");

			var directoryReader = directoryEntry.createReader();
			// Get a list of all the entries in the directory
			directoryReader.readEntries(fillTable, onFail);
		}, onFail);
		fileSystem.root.getDirectory("/mnt/extSdCard/chinese_vocabulary", { create: false, exclusive: false }, function(directoryEntry) {
			console.log("███ got dir entry mnt/extsdcard!");

			var directoryReader = directoryEntry.createReader();
			// Get a list of all the entries in the directory
			directoryReader.readEntries(fillTable, onFail);
		}, onFail);*/
	}, onFail);
	/*window.requestFileSystem(LocalFileSystem.TEMPORARY, 0, function(fileSystem) {
		//console.log("███ got FS!");
		fileSystem.root.getDirectory("./chinese_vocabulary", { create: true, exclusive: false }, function(directoryEntry) {
			//console.log("███ got dir entry!");

			var directoryReader = directoryEntry.createReader();
			// Get a list of all the entries in the directory
			directoryReader.readEntries(fillTable, onFail);
		}, onFail);
	}, onFail);*/

}

function setFileSelection(sUrl, bChecked) {
	console.log("███ setting " + sUrl + " - " + bChecked);
	// get files array
	var aFiles = JSON.parse(localStorage.getItem("files"));
	//console.log("█ before: " + JSON.stringify(aFiles) + "  - len: " + aFiles.length);
	// set new value
	var i = 0;
	while (i < aFiles.length) {
		if (aFiles[i].url == sUrl) {
			//console.log("█ found file at i = " + i);
			break;
		}
		i++;
	}
	if (aFiles.length == i) {
		//console.log("█ creating file at i = " + i);
		aFiles[i] = new Object();
		aFiles[i].url = sUrl;
	}
	aFiles[i].checked = bChecked;
	// save files array
	//console.log("█ after: " + JSON.stringify(aFiles));
	localStorage.setItem("files", JSON.stringify(aFiles));
}

function fillTable(entries) {
	console.log("███ got reader!!!");
	var tableref = document.getElementById("tDataFiles");
	var tbdy = document.createElement("tbody");
    var i, j;
	// display the files found in localstorage which are also still present
	var aFiles = JSON.parse(localStorage.getItem("files"));
	// if we find here new files which aren't in localstorage, display them but unchecked TODO
    for (i=0; i<entries.length; i++) {
		// check settings of currunt file
		var foundFile = -1;
		for (j = 0; j < aFiles.length; j++) {
			if (aFiles[j].url == entries[i].nativeURL && aFiles[j].checked) {
				foundFile = i;
				break;
			}
		}
        //console.log("███ " + entries[i].name);
		var tr = document.createElement("tr");

		var td_filename = document.createElement("td");
		td_filename.appendChild(document.createTextNode(entries[i].name));

		var td_chck = document.createElement("td");
		var chckb = document.createElement("input");
		chckb.type = "checkbox";
		chckb.value = entries[i].nativeURL;
		chckb.checked = foundFile >= 0;
		chckb.onclick = function (event) { setFileSelection(event.target.value, event.target.checked) }
		td_chck.appendChild(chckb);
		td_chck.width = "100";

		tr.appendChild(td_chck);
		tr.appendChild(td_filename);
		tbdy.appendChild(tr);
    }
	tableref.appendChild(tbdy);
	// display also entries which aren't from filetype local_storage
	for (i = 0; i < aFiles.length; i++) {
		if ( ! aFiles[i].url.match(/file:/)) {
			var tr = document.createElement("tr");

			var td_filename = document.createElement("td");
			td_filename.appendChild(document.createTextNode(aFiles[i].url));

			var td_chck = document.createElement("td");
			var chckb = document.createElement("input");
			chckb.type = "checkbox";
			chckb.value = aFiles[i].url;
			chckb.checked = aFiles[i].checked;
			chckb.onclick = function (event) { setFileSelection(event.target.value, event.target.checked) }
			td_chck.appendChild(chckb);
			td_chck.width = "100";

			tr.appendChild(td_chck);
			tr.appendChild(td_filename);
			tbdy.appendChild(tr);
		}
	}
}

function onFail(error) {
	console.log("███ fail :(");
    //alert("Failed while reading data files: " + error.code);
	var tableref = document.getElementById("tDataFiles");
	var tbdy = document.createElement("tbody");
	var tr = document.createElement("tr");
	var td = document.createElement("td");
	td.appendChild(document.createTextNode("Failed while reading data files: " + error.code));
	tr.appendChild(td);
	tbdy.appendChild(tr);
	tableref.appendChild(tbdy);
}