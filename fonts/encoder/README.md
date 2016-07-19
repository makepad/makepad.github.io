This is an extract of the guts of glyphy, from: https://code.google.com/p/glyphy/
This utility converts ttf and other font types that freetype can read into the .arcfont GPU font format used by Makepad

Please note these font files are rather big, and uncompressed. They are essentially raw data texture dumps. However, if you serve them with gzip compression its not too bad (around 10x compression)
So this ends up being around 70kbyte for the ascii font table, and around 1-2 mbyte for a full unicode dump of a font. These files will go into your browser cache, if you set up the server correctly.
The reason you have to use gzip transport is because browsers are too slow to do any decent decompression at the JS layer, so we use the compression at the transport layer level.

Other future font handling options are: port glyphy to JS and make a binary bezier format for the browser, and option three make the browser eat ttf files in JS. Those options are more work, but will result in smaller fonts delivered to the browser. For now, this is a good proof of concept.

Usage:

edit your freetype library location in makefile, Its currently set for freetype install by brew on OSX.

	make
	./glyphy input.ttf 0 128 output_ascii.arcfont

Its only a single file to compile, so should be easy to get this working on other platforms, if freetype compiles this should be easy.