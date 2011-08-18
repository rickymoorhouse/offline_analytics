/*  Web App Offline Analytics - for Javascript mobile web apps  */


var WAOA = {
	db:		null,
	localDatabase: 	false,
	_url:	'',

	init: function(url) {
		WAOA._url = url;
		try {
		    if (!window.openDatabase) {
			WAOA.localDatabase = false;
		    } else {
			var shortName = 'WAOA';
			var version = '1.0';
			var displayName = 'Web App Offline Analytics';
			var maxSize = 10 * 1024 * 1024; //  10 MB
			WAOA.db = openDatabase(shortName, version, displayName, maxSize);
			WAOA.db.transaction(function (transaction) {  
				transaction.executeSql('CREATE TABLE IF NOT EXISTS action(timestamp REAL NOT NULL,action TEXT NOT NULL, data TEXT NOT NULL);', [], WAOA.nullDataHandler, WAOA.errorHandler);  
				console.log('create table');
			}); 
			// TODO: include way to send the data to the server
			WAOA.localDatabase = true; 
			
			//prePopulate();
			WAOA.db.transaction(function (transaction) {  
				transaction.executeSql("SELECT * FROM action;", [],  
				WAOA.sendToServer, WAOA.errorHandler);  
			});  

		    }
		} catch(e) {

		    if (e == 2) {
			// Version number mismatch.
			console.log("Invalid database version - need to rebuild.");
			WAOA.localDatabase = false; 
		    } else {
			console.log("Unknown error "+e+".");
			WAOA.localDatabase = false;
		    }
		    return;
		}
	},
	track:	function(path,data) {
		timestamp = new Date().getTime();
		console.log(path,data,timestamp);
		// Are we online?
		if(navigator.onLine) {
			WAOA.pushData(path,data,timestamp,function() {console.log('success');});
		} else {
			if (WAOA.localDatabase) {
			// Oh we're offline...lets just cache it until we're online again
				WAOA.db.transaction(function (tx) {
				tx.executeSql("INSERT INTO action VALUES(?,?,?)", [timestamp,path,data]);
				});
			} else {
				console.log('oops');
			}
		}
	},
	pushData:	function(path,data,timestamp,onComplete) {
		var formData = new FormData();

		formData.append("timestamp", timestamp);
		formData.append("path", path);
		formData.append("data", data);

		var xhr = new XMLHttpRequest();
		xhr.open("POST", "http://rickymoorhouse.co.uk/waoa/dummy.php");
		xhr.send(formData);
		xhr.onreadystatechange = function (aEvt) {
			if (xhr.readyState == 4) {
				if(xhr.status == 200) { 
					onComplete();				
				} else {
					console.log('Error', xhr.statusText);
				}
			}
		}
		
	},
	sendToServer:	function(transaction, results){
		// Loop through data in local DB row by row
		for (var i=0; i<results.rows.length; i++) {
			var row=results.rows.item(i);
			console.log(row);
			WAOA.pushData(row.path,row.data,row.timestamp,function() {
				console.log(xhr.responseText)
			
				WAOA.db.transaction(function (transaction2) {  
					transaction2.executeSql("DELETE FROM action WHERE timestamp= ? ;", [row.timestamp],  
					WAOA.nullDataHandler, WAOA.errorHandler);  
				});  
			});

		}
	},
	nullDataHandler: function(param1) {
		console.log(param1);
	},
	errorHandler: function(param1) {
		console.log('ERR',param1);
	}
}
