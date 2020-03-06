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



const http = require( 'http' ) ;
const url = require( 'url' ) ;
const qs = require( 'qs-kit' ) ;
const Lazyness = require( 'lazyness' ) ;

const log = require( 'logfella' ).global.use( 'server-kit' ) ;



function Client( server , options ) {
	this.server = server ;
	this.type = options.type || 'http' ;
	this.protocol = options.protocol || 'http' ;
	this.request = options.request ;
	this.response = options.response || null ;
	this.websocket = options.websocket || null ;

	// Use url.parse() to reliably extract the hostname from the hostname+port scheme (should handle domain name, ipv4 and ipv6).
	// Also note that this.request.url only contains the path of the request.
	this.hostname = url.parse( '//' + this.request.headers.host , undefined , true ).hostname || null ;
	this.method = this.request.method ;	//.toLowerCase() ;
	this.parsedUrl = url.parse( this.request.url ) ;
	this.path = this.parsedUrl.pathname ;

	this.headBuffer = options.headBuffer || null ;
	this.socket = options.socket || this.request.socket ;

	// New Router data
	this.pathParts = null ;
	this.walkIndex = 0 ;
	this.capture = null ;
	this.specialHandlers = null ;	// Mostly error documents
	this.middlewares = null ;
	this.middlewareIndex = 0 ;

	// For userland:
	this.data = null ;
	this.log = null ;
}

module.exports = Client ;



Object.defineProperties( Client.prototype , {
	remainingPath: { get: function() {
		if ( ! this.pathParts ) { return this.path ; }
		return this.pathParts.slice( this.walkIndex ).join( '/' ) ;
		//return this.pathParts.reduce( ( str , part ) => str += str ? '/' + part : part , '' ) ;
	} }
} ) ;



const DEFAULT_QUERY_PARSER_OPTIONS = { brackets: true , autoPush: true , keyPath: true } ;

Lazyness.instanceProperty( Client.prototype , 'query' , client => {
	// Should query be null or an empty object when there is no query?
	//if ( ! client.parsedUrl.query ) { return null ; }

	try {
		return qs.parse( client.parsedUrl.query , ( client.server && client.server.queryParserOptions ) || DEFAULT_QUERY_PARSER_OPTIONS ) ;
	}
	catch ( error ) {
		return error ;
	}
} ) ;

Lazyness.instanceProperty( Client.prototype , 'unicodePath' , client => {
	return decodeURI( client.path ) ;
} ) ;



const illegalParts = {
	"*": true ,
	"/": true ,
	".": true ,
	"..": true ,
	"~": true ,
	"!": true ,
	"^": true
} ;



Client.prototype.routerInit = function() {
	if ( this.pathParts ) { return ; }

	this.pathParts = this.path.split( '/' ).filter( part => part ) ;
	this.capture = {} ;
	//this.data = {} ;

	if ( this.pathParts.some( part => illegalParts[ part ] ) ) {
		log.verbose( "bad path: %s" , this.path ) ;
		this.badRequest() ;
		return false ;
	}

	return true ;
} ;



const defaultErrorHandlers = [
	{ fn: 'badRequest' , code: 400 , body: '<h1>400 - Bad Request.</h1>' } ,
	{ fn: 'unauthorized' , code: 401 , body: '<h1>401 - Unauthorized.</h1>' } ,
	{ fn: 'paymentRequired' , code: 403 , body: '<h1>403 - Payment Required.</h1>' } ,
	{ fn: 'forbidden' , code: 403 , body: '<h1>403 - Forbidden.</h1>' } ,
	{ fn: 'notFound' , code: 404 , body: '<h1>404 - Not Found.</h1>' } ,
	{ fn: 'methodNotAllowed' , code: 405 , body: '<h1>405 - Method Not Allowed.</h1>' } ,
	{ fn: 'internalServerError' , code: 500 , body: '<h1>500 - Internal Server Error.</h1>' }
] ;

defaultErrorHandlers.forEach( sp => {
	Client.prototype[ sp.fn ] = function( client ) {
		client = client || this ;

		if ( client.specialHandlers && client.specialHandlers[ sp.fn ] ) {
			return client.specialHandlers[ sp.fn ]( client ) ;
		}

		// Double try-catch, because it may fail twice (header already sent, response already sent)
		try {
			client.response.writeHead( sp.code ) ;
		}
		catch ( error ) {}

		try {
			client.response.end( sp.body ) ;
		}
		catch ( error ) {}
	} ;
} ) ;

