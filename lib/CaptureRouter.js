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



var Router = require( './Router.js' ) ;

var log = require( 'logfella' ).global.use( 'server-kit' ) ;



function CaptureRouter( name , tree = {} ) {
	this.name = name ;
	this.tree = tree ;
}

module.exports = CaptureRouter ;

CaptureRouter.prototype = Object.create( Router.prototype ) ;
CaptureRouter.prototype.constructor = CaptureRouter ;



CaptureRouter.prototype.handle = function handle( client ) {
	if ( ! client.pathParts && ! client.routerInit() ) { return ; }

	var part = client.pathParts[ client.walkIndex ++ ] ;

	if ( ! part ) {
		log.verbose( "not found: %s" , client.path ) ;

		// Must use ErrorDocument later
		client.response.writeHead( 404 ) ;
		client.response.end() ;
		return ;
	}

	client.capture[ this.name ] = part ;

	this.treeWalk( this.tree , client ) ;
} ;

