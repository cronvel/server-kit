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

const log = require( 'logfella' ).global.use( 'server-kit' ) ;



/*
	* basePath: the base (root) path where the files are located
	* options:
		* includePreviousPart: boolean (default: false), if true, include the previous URL path part
*/
function FileRouter( basePath = './' , options = {} ) {
	this.basePath = basePath ;
	this.includePreviousPart = !! options.includePreviousPart ;

	// If <path> is a directory, redirect to <path>/index.html
	this.directoryIndex =
		options.directoryIndex === true ? 'index.html' :
		options.directoryIndex && typeof options.directoryIndex === 'string' ? options.directoryIndex :
		false ;

	// If <path> has no extension, redirect to <path>.<extension>
	this.forceExtension =
		options.forceExtension === true ? 'html' :
		options.forceExtension && typeof options.forceExtension === 'string' ? options.forceExtension :
		false ;

	// If <path> has no extension AND would produce a 404, redirect to <path>.<extension>
	this.autoExtension =
		this.forceExtension ? false :
		options.autoExtension === true ? 'html' :
		options.autoExtension && typeof options.autoExtension === 'string' ? options.autoExtension :
		false ;
}

module.exports = FileRouter ;

FileRouter.prototype = Object.create( CommonHandler.prototype ) ;
FileRouter.prototype.constructor = FileRouter ;



FileRouter.prototype.handle = async function( client ) {
	if ( ! client.pathParts && ! client.routerInit() ) { return ; }

	// client.routerInit() filter out some undesirable path part already
	// maybe clean up more unusual characters?

	var filePath = decodeURI( path.join(
		this.basePath ,
		this.includePreviousPart ? client.lastRemainingPath : client.remainingPath
	) ) ;

	// When forceExtension is on, immediately append the extension before wasting I/O
	if ( this.forceExtension && ! path.extname( filePath ) ) {
		filePath += '.' + this.forceExtension ;
	}

	try {
		await httpServeFile( filePath , client , true ) ;
		return ;
	}
	catch ( error ) {
		if ( error.code === 'EISDIR' ) {
			if ( this.directoryIndex ) {
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

