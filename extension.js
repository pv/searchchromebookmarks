//   Chrome Bookmarks Search Provider for Gnome Shell
//   Copyright (C) 2012  Pauli Virtanen
//   Copyright (C) 2011  Stefano Ciancio
//
//   This library is free software; you can redistribute it and/or
//   modify it under the terms of the GNU Library General Public
//   License as published by the Free Software Foundation; either
//   version 2 of the License, or (at your option) any later version.
//
//   This library is distributed in the hope that it will be useful,
//   but WITHOUT ANY WARRANTY; without even the implied warranty of
//   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
//   Library General Public License for more details.
//
//   You should have received a copy of the GNU Library General Public
//   License along with this library; if not, write to the Free Software
//   Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

//
// This is based on the Firefox bookmarks search plugin by Stefano Ciancio.
//

const Main = imports.ui.main;
const Search = imports.ui.search;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const Util = imports.misc.util;
const St = imports.gi.St;

// Settings

// chromeSearchProvider holds the instance of the search provider
// implementation. If null, the extension is either uninitialized
// or has been disabled via disable().
var chromeSearchProvider = null;

const ChromeBookmarksSearchProvider = new Lang.Class({
    Name: 'ChromeBookmarksSearchProvider',
    Extends: Search.SearchProvider,

    _init: function(name) {
        Search.SearchProvider.prototype._init.call(this, "CHROME BOOKMARKS");

        // Retrieve environment variables
        bookmarkFile = GLib.getenv("CHROME_BOOKMARK_FILE");

        // Check environment variables
	this.bookmarkFilePaths = [];
        if (bookmarkFile != null) {
            // Env Bookmark File defined
            this.bookmarkFilePaths.push(bookmarkFile);
        } else {
            // Default
	    let paths = [".config/google-chrome/Default/Bookmarks",
			 ".config/chromium/Default/Bookmarks"];
	    for each (var path in paths) {
		path = GLib.build_filenamev([GLib.get_home_dir(), path]);
		this.bookmarkFilePaths.push(path);
            }
        }

	// Read the bookmarks
        this._configBookmarks = [];
        this._readBookmarks();

	// Create file monitors
	this._fileMonitors = [];
	for each (var path in this.bookmarkFilePaths) {
            let file = Gio.file_new_for_path(path);
            let monitor = file.monitor(Gio.FileMonitorFlags.NONE, null);
            monitor.connect('changed', Lang.bind(this, this._readBookmarks));
	    this._fileMonitors.push(monitor);
	}

        return true;
    },

    close : function() {
	this._closeFileMonitors();
    },

    _closeFileMonitors : function() {
	for each (var monitor in this._fileMonitors) {
	    monitor.cancel();
	}
	this._fileMonitors = [];
    },

    // Read all bookmarks tree
    _readBookmarks : function () {
	for each (var file in this.bookmarkFilePaths) {
	    this._readBookmarksFromFile(file);
	}
	return true;
    },

    _readBookmarksFromFile : function(file) {
        let filedata;
        try {
            filedata = GLib.file_get_contents(file, null, 0);
        } catch (e) {
            Main.notifyError("Error reading file", e.message);
            return false;
        }

        let jsondata = null;
        if ( (filedata[1].length != 0) && (filedata[1] != null) ) {
            try {
                jsondata = JSON.parse (filedata[1]);
            } catch (e) {
                Main.notifyError("Error parsing file - "+ filedata, e.message);
                return false;
            }
        } else {
            Main.notifyError("Error parsing file - Empty data");
            return false;
        }

        this._readTree(jsondata.roots.bookmark_bar);
        this._readTree(jsondata.roots.other);

        return true;
    },

    _readTree : function (node) {
        if (node.hasOwnProperty('type')) {
            if (node.type == 'url') {
                this._configBookmarks.push([node.name, node.url]);
            }
        }

	for each (var child in node.children) {
	    this._readTree(child);
	}
    },

    getResultMetas: function(resultIds) {
        let metas = [];
        
        for (let i = 0; i < resultIds.length; i++) {
            let resultId = resultIds[i];
            let appSys = Shell.AppSystem.get_default();

            let app = appSys.lookup_heuristic_basename('google-chrome.desktop');
	    let app_name = "google-chrome";
	    if (!app) {
		app = appSys.lookup_heuristic_basename('chromium.desktop');
		app_name = "chromium";
	    }
	    
            let bookmark_name = "";
            if (resultId.name)
                bookmark_name = resultId.name;
            else
                bookmark_name = resultId.url;

            metas.push({ 'id': resultId,
                     'name': bookmark_name,
                     'createIcon': function(size) {
                            let xicon = new Gio.ThemedIcon({name: app_name});
                            return new St.Icon({icon_size: size, gicon: xicon});
                    }
            });
        }
        return metas;
    },

    activateResult: function(id) {
	Gio.app_info_launch_default_for_uri(id.url, 
					    global.create_app_launch_context());
    },

    _checkBookmarknames: function(bookmarks, terms) {
        let searchResults = [];
        for (var i=0; i<bookmarks.length; i++) {
            for (var j=0; j<terms.length; j++) {
                try {
                    let name = bookmarks[i][0];
                    let url = bookmarks[i][1];
                    let searchStr = name+url;
                    let pattern = new RegExp(terms[j],"gi");
                    if (searchStr.match(pattern)) {
                        searchResults.push({
                                'name': name,
                                'url': url
                        });
                    }
                }
                catch(ex) {
                    continue;
                }
            }
        }
        return searchResults;
    },

    getInitialResultSet: function(terms) {
        // check if a found host-name begins like the search-term
        let searchResults = [];
        searchResults = searchResults.concat(this._checkBookmarknames(this._configBookmarks, terms));

        if (searchResults.length > 0) {
            return(searchResults);
        }

        return []
    },

    getSubsearchResultSet: function(previousResults, terms) {
        return this.getInitialResultSet(terms);
    }
});

function init(meta) {
}

function enable() {
    if (chromeSearchProvider == null) {
        chromeSearchProvider = new ChromeBookmarksSearchProvider();
        Main.overview.addSearchProvider(chromeSearchProvider);
    }
}

function disable() {
    if (chromeSearchProvider != null) {
        Main.overview.removeSearchProvider(chromeSearchProvider);
	chromeSearchProvider.close()
        chromeSearchProvider = null;
    }
}
