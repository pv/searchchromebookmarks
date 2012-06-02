What is Search Chrome Bookmarks
===============================

Search Chrome Bookmarks (SCB) is a GNOME Shell extension which
searches the Google Chrome (or Chromium) bookmarks and provides
results in your shell overview.

This extension is based on the "Search Firefox Bookmarks" by
Stefano Ciancio.

How to install
==============

Copy the tarball to $HOME/.local/share/gnome-shell/extensions
and unpack it. A directory called searchchromebookmarks@pav.iki.fi
should be created. 

Restart your GNOME shell (Alt-F2 r is one way) and enable the
extension using gnome-tweak-tool (install it if not present).

If the extension does not install, check the version number in
metadate.json. You may have to change it to work with your
particular version of the GNOME Shell. If this does not fix
the problem, use Looking Glass (Alt-F2 lg) to see what the
error message is.

Current Version
===============

Release 0.1.

Other Info
==========

SCB parses bookmark json files that Chrome stores usually in the dir:

	$HOME/.config/google-chrome/<profile dir>/Bookmarks
	$HOME/.config/chromium/<profile dir>/Bookmarks

SCP tries to retrieve the correct item, but you can suggest the
correct path by two way:

* setting a environment variable, CHROME_BOOKMARK_FILE, with complete
  path of json file backup
