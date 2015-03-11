/*
	The Cedric's Swiss Knife (CSK) - CSK Server toolbox

	Copyright (c) 2015 Cédric Ronvel 
	
	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/



// MIME types by extension, for most common files

function mimeType( path )
{
	var extension = path.replace(/.*[\.\/\\]/, '').toLowerCase();
	
	if ( typeof mimeType.extension[ extension ] === 'undefined' ) {
		// default MIME type, when nothing is found
		return 'application/octet-stream' ;
	}
	
	return mimeType.extension[ extension ] ;
}

module.exports = mimeType ;



mimeType.extension = {
	
	// web essential
	html: 'text/html' ,
	htm: 'text/html' ,
	xhtml: 'application/xhtml+xml' ,
	css: 'text/css' ,
	js: 'application/javascript' ,
	json: 'application/json' ,
	xml: 'application/xml' ,
	xsl: 'application/xml' ,
	xslt: 'application/xslt+xml' ,
	appcache: 'text/cache-manifest' ,
	rss: 'application/rss+xml' ,
	torrent: 'application/x-bittorrent' ,
	
	// compressed
	zip: 'application/zip' ,
	gz: 'application/x-gzip' ,
	tar: 'application/x-tar' ,
	"7z": 'application/x-7z-compressed' ,
	ace: 'application/x-ace-compressed' ,
	bz: 'application/x-bzip' ,
	bz2: 'application/x-bzip2' ,
	rar: 'application/x-rar-compressed' ,
	
	// image (raster)
	jpg: 'image/jpeg' ,
	jpeg: 'image/jpeg' ,
	png: 'image/png' ,
	gif: 'image/gif' ,
	bmp: 'image/bmp' ,
	pcx: 'image/x-pcx' ,
	tga: 'image/x-tga' ,
	tiff: 'image/tiff' ,
	tif: 'image/tiff' ,
	webp: 'image/webp' ,
	
	// image (vecto)
	svg: 'image/svg+xml' ,
	
	// image (misc)
	ico: 'image/x-icon' ,
	
	// text
	txt: 'text/plain' ,
	text: 'text/plain' ,
	conf: 'text/plain' ,
	def: 'text/plain' ,
	log: 'text/plain' ,
	
	// font
	ttf: 'application/x-font-ttf' ,
	ttc: 'application/x-font-ttf' ,
	otf: 'application/x-font-otf' ,
	pcf: 'application/x-font-pcf' ,
	
	// sounds
	au: 'audio/basic' ,
	snd: 'audio/basic' ,
	mid: 'audio/midi' ,
	midi: 'audio/midi' ,
	mp4a: 'audio/mp4' ,
	mp3: 'audio/mpeg' ,
	ogg: 'audio/ogg' ,
	weba: 'audio/webm' ,
	mka: 'audio/x-matroska' ,
	wma: 'audio/x-ms-wma' ,
	wav: 'audio/x-wav' ,
	xm: 'audio/xm' ,
	
	// video
	mp4: 'video/mp4' ,
	mpg: 'video/mpeg' ,
	mpeg: 'video/mpeg' ,
	ogv: 'video/ogg' ,
	mov: 'video/quicktime' ,
	qt: 'video/quicktime' ,
	webm: 'video/webm' ,
	flv: 'video/x-flv' ,
	mkv: 'video/x-matroska' ,
	asf: 'video/x-ms-asf' ,
	asx: 'video/x-ms-asf' ,
	wmv: 'video/x-ms-wmv' ,
	avi: 'video/x-msvideo' ,
	
	// various stoopid player
	swf: 'application/x-shockwave-flash' ,
	xap: 'application/x-silverlight-app' ,
	
	// mail
	eml: 'message/rfc822' ,
	mime: 'message/rfc822' ,
	
	// document
	pdf: 'application/pdf' ,
	nfo: 'text/x-nfo' ,
	rtf: 'application/rtf' ,
	tex: 'application/x-tex' ,
	latex: 'application/x-latex' ,
	texinfo: 'application/x-texinfo' ,
	texi: 'application/x-texinfo' ,
	doc: 'application/msword' ,
	dox: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ,
	xls: 'application/vnd.ms-excel' ,
	xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ,
	ppt: 'application/vnd.ms-powerpoint' ,
	pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ,
	odt: 'application/vnd.oasis.opendocument.text' ,
	csv: 'text/csv' ,
	
	// binary
	bin: 'application/octet-stream' ,
	iso: 'application/x-iso9660-image' ,
	exe: 'application/x-msdownload' ,
	dll: 'application/x-msdownload' ,
	com: 'application/x-msdownload' ,
	msi: 'application/x-msdownload' ,
	
	// card, calendar
	ics: 'text/calendar' ,
	vcard: 'text/vcard' ,
	vcs: 'text/x-vcalendar' ,
	vcf: 'text/x-vcard' ,
	
	// misc
	mathml: 'application/mathml+xml'
} ;



