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



var url = require( 'url' ) ;

var log = require( 'logfella' ).global.use( 'server-kit' ) ;



function Client( server , options ) {
	this.server = server ;
	this.type = options.type || 'http' ;
	this.protocol = options.protocol || 'http' ;
	this.request = options.request ;
	this.response = options.response || null ;
	this.websocket = options.websocket || null ;

	this.domain = this.request.headers.host.match( /^[^:]*/ )[ 0 ] || null ;
	this.path = url.parse( this.request.url ).pathname ;

	this.headBuffer = options.headBuffer || null ;
	this.socket = options.socket || this.request.socket ;

	// New Router data
	this.pathParts = null ;
	this.walkIndex = 0 ;
	this.capture = null ;
}

module.exports = Client ;



Object.defineProperties( Client.prototype , {
	remainingPath: { get: function() {
		if ( ! this.pathParts ) { return this.path ; }
		return this.pathParts.slice( this.walkIndex ).join( '/' ) ;
		//return this.pathParts.reduce( ( str , part ) => str += str ? '/' + part : part , '' ) ;
	} }
} ) ;



var illegalParts = {
	"*": true ,
	"/": true ,
	".": true ,
	"..": true ,
	"~": true ,
	"!": true
} ;



Client.prototype.routerInit = function routerInit() {
	this.pathParts = this.path.split( '/' ).filter( part => part ) ;

	if ( this.pathParts.some( part => illegalParts[ part ] ) ) {
		log.verbose( "bad path: %s" , this.path ) ;

		// Must use ErrorDocument later
		this.response.writeHead( 400 ) ;
		this.response.end() ;
		return false ;
	}

	this.capture = {} ;

	return true ;
} ;


