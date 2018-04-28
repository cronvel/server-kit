/*
	Server Kit

	Copyright (c) 2015 - 2018 Cédric Ronvel

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



var CommonRouter = require( './CommonRouter.js' ) ;
var httpServeFile = require( './httpServeFile.js' ) ;

var path = require( 'path' ) ;

var log = require( 'logfella' ).global.use( 'server-kit' ) ;



function FileRouter( basePath = './' ) {
	this.basePath = basePath ;
}

module.exports = FileRouter ;

FileRouter.prototype = Object.create( CommonRouter.prototype ) ;
FileRouter.prototype.constructor = FileRouter ;



FileRouter.prototype.handle = function handle( client ) {
	if ( ! client.pathParts && ! client.routerInit() ) { return ; }
	
	// client.routerInit() filter out some undesirable path part already
	// maybe clean up more unusual characters?
	
	httpServeFile( client , path.join( this.basePath , client.remainingPath ) ) ;
} ;

