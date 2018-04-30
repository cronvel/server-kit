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



var http = require( 'http' ) ;
var url = require( 'url' ) ;

var log = require( 'logfella' ).global.use( 'server-kit' ) ;



function Client( server , options ) {
	this.server = server ;
	this.type = options.type || 'http' ;
	this.protocol = options.protocol || 'http' ;
	this.request = options.request ;
	this.response = options.response || null ;
	this.websocket = options.websocket || null ;

	// Use url.parse() to reliably extract the domain name from the domain+port scheme (should handle domain name, ipv4 and ipv6).
	// Also note that this.request.url only contains the path of the request.
	this.domain = url.parse( '//' + this.request.headers.host , undefined , true ).hostname || null ;
	console.log( this.request.headers.host , this.domain ) ;
	this.method = this.request.method ;
	this.path = url.parse( this.request.url ).pathname ;

	this.headBuffer = options.headBuffer || null ;
	this.socket = options.socket || this.request.socket ;

	// New Router data
	this.pathParts = null ;
	this.walkIndex = 0 ;
	this.capture = null ;
	this.specialHandlers = null ;	// Mostly error documents
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
	if ( this.pathParts ) { return ; }

	this.pathParts = this.path.split( '/' ).filter( part => part ) ;
	this.capture = {} ;
	this.specialHandlers = {} ;

	if ( this.pathParts.some( part => illegalParts[ part ] ) ) {
		log.verbose( "bad path: %s" , this.path ) ;
		this.badRequest() ;
		return false ;
	}

	return true ;
} ;



var defaultErrorHandlers = [
	{ fn: 'badRequest' , code: 400 , body: '<h1>400 - Bad Request.</h1>' } ,
	{ fn: 'unauthorized' , code: 401 , body: '<h1>401 - Unauthorized.</h1>' } ,
	{ fn: 'paymentRequired' , code: 403 , body: '<h1>403 - Payment Required.</h1>' } ,
	{ fn: 'forbidden' , code: 403 , body: '<h1>403 - Forbidden.</h1>' } ,
	{ fn: 'notFound' , code: 404 , body: '<h1>404 - Not Found.</h1>' } ,
	{ fn: 'methodNotAllowed' , code: 405 , body: '<h1>405 - Method Not Allowed.</h1>' } ,
	{ fn: 'internalServerError' , code: 500 , body: '<h1>500 - Internal Server Error.</h1>' }
] ;

defaultErrorHandlers.forEach( sp => {
	Client.prototype[ sp.fn ] = function() {
		if ( this.specialHandlers && this.specialHandlers[ sp.fn ] ) {
			this.specialHandlers[ sp.fn ]( this ) ;
			return ;
		}

		// Double try-catch, because it may fail twice (header already sent, response already sent)
		try {
			this.response.setHeader( 'content-length' , sp.body.length ) ;
			this.response.writeHead( sp.code ) ;
		}
		catch ( error ) {}

		try {
			this.response.end( sp.body ) ;
		}
		catch ( error ) {}
	} ;
} ) ;


