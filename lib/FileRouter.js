/*
	Server Kit

	Copyright (c) 2015 - 2020 Cédric Ronvel

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

"use strict" ;



const CommonHandler = require( './CommonHandler.js' ) ;
const httpServeFile = require( './httpServeFile.js' ) ;

const path = require( 'path' ) ;
const fs = require( 'fs' ) ;

const log = require( 'logfella' ).global.use( 'server-kit' ) ;



/*
	* basePath: the base (root) path where the files are located.
	* options:
		* includePreviousPart: boolean (default: false), if true, include the previous URL path part.
		* directoryHtml: boolean (default: false), if true and if the local path is a directory, serve a browsable HTML page
			listing files and directories.
			Not compatible with the 'directoryIndex' option.
		* directoryIndex: boolean or string (default: false), if set and if the local path is a directory, try to serve
			index.html (or the provided filename) on that directory.
			Not compatible with the 'directoryHtml' option.
		* autoExtension: boolean or string (default: false), if set and if no file are found on this URL, try adding
			the 'html' (or the provided extension) extension if the URL hasn't one.
*/
function FileRouter( basePath = './' , options = {} ) {
	this.basePath = basePath ;
	this.includePreviousPart = !! options.includePreviousPart ;

	this.directoryHtml = !! options.directoryHtml ;

	// If <path> is a directory, redirect to <path>/index.html
	this.directoryIndex =
		! options.directoryIndex || this.directoryHtml ? false :
		options.directoryIndex === true ? 'index.html' :
		typeof options.directoryIndex === 'string' ? options.directoryIndex :
		false ;

	// If <path> has no extension AND would produce a 404, redirect to <path>.<extension>
	this.autoExtension =
		options.autoExtension === true ? 'html' :
		typeof options.autoExtension === 'string' ? options.autoExtension :
		false ;
}

module.exports = FileRouter ;

FileRouter.prototype = Object.create( CommonHandler.prototype ) ;
FileRouter.prototype.constructor = FileRouter ;



FileRouter.prototype.serveDirectoryHtml = async function( dirPath , client ) {
	client.response.statusCode = 200 ;
	client.response.setHeader( 'Content-Type' , 'text/html' ) ;

	var webPath = client.remainingPath || '/' ,
		extensionSet = new Set() ,
		filterDirectories = client.query.fd === 'yes' ,
		sortDirectories = true , //client.query.sd === 'yes' ,
		contain = ( '' + ( client.query.contain ?? client.query.c ?? '' ) ).toLowerCase() ,
		start = ( '' + ( client.query.start ?? client.query.s ?? '' ) ).toLowerCase() ,
		end = ( '' + ( client.query.end ?? client.query.e ?? '' ) ).toLowerCase() ;

	var content = '<!DOCTYPE html>\n'
		+ '<html>\n'
		+ '<head>\n'
		+ '<meta charset="UTF-8" />\n'
		+ '<title>Server Kit File Router - Directory List</title>\n'
		+ '</head>\n'
		+ '<body>\n' ;

	var entries = await fs.promises.readdir( dirPath , { withFileTypes: true } ) ;

	content += '<h3>' + webPath + '</h3>\n' ;

	var listContent = '' ;

	if ( webPath !== '/' ) {
		listContent += '<a href="../">..</a><br />\n' ;
	}

	if ( sortDirectories ) {
		entries.sort( ( a , b ) => ( b.isDirectory() ? 1 : 0 ) - ( a.isDirectory() ? 1 : 0 ) ) ;
	}

	for ( let entry of entries ) {
		let isDirectory = entry.isDirectory() ,
			name = entry.name + ( isDirectory ? '/' : '' ) ;

		if ( ! isDirectory || filterDirectories ) {
			if ( contain && ! name.toLowerCase().includes( contain ) ) { continue ; }
			if ( start && ! name.toLowerCase().startsWith( start ) ) { continue ; }
			if ( end && ! name.toLowerCase().endsWith( end ) ) { continue ; }
		}

		if ( ! isDirectory ) {
			let extension = path.extname( name ) ;
			if ( extension ) { extensionSet.add( extension ) ; }
		}

		listContent += '<a href="./' + name + '">' + name + '</a><br />\n' ;
	}

	if ( extensionSet.size ) {
		content += "<br />Extensions:" ;

		for ( let extension of extensionSet ) {
			content += ' <a href="./?e=' + extension + '">' + extension + '</a>' ;
		}

		content += ' <a href="./">(all)</a>' ;
		content += "<br /><br />\n" ;
	}

	content += listContent ;
	content += '</body>\n</html>\n' ;

	client.response.write( content ) ;
	client.response.end() ;
} ;



FileRouter.prototype.handle = async function( client ) {
	if ( ! client.pathParts && ! client.routerInit() ) { return ; }

	// client.routerInit() filter out some undesirable path part already
	// maybe clean up more unusual characters?

	var filePath = decodeURI( path.join(
		this.basePath ,
		this.includePreviousPart ? client.lastRemainingPath : client.remainingPath
	) ) ;

	try {
		await httpServeFile( filePath , client , true ) ;
		return ;
	}
	catch ( error ) {
		if ( error.code === 'EISDIR' ) {
			if ( this.directoryHtml ) {
				return this.serveDirectoryHtml( filePath , client ) ;
			}
			else if ( this.directoryIndex ) {
				return httpServeFile( path.join( filePath , this.directoryIndex ) , client ) ;
			}
		}
		else if ( error.code === 'ENOENT' ) {
			if ( this.autoExtension && ! path.extname( filePath ) ) {
				return httpServeFile( filePath + '.' + this.autoExtension , client ) ;
			}
		}

		return client.notFound() ;
	}
} ;

