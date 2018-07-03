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



var log = require( 'logfella' ).global.use( 'server-kit' ) ;



var defaultMethod = {
	HEAD: true ,
	GET: true ,
	POST: true
} ;

var defaultHeaders = {
	"keep-alive": true ,
	"user-agent": true ,
	"x-requested-with": true ,
	"if-modified-since": true ,
	"cache-control": true ,
	"content-type": true
} ;

// See: https://fetch.spec.whatwg.org/#cors-safelisted-request-header
var safeHeaders = {
	"accept-charset": true ,
	"accept-encoding": true ,
	"access-control-request-headers": true ,
	"access-control-request-method": true ,
	"connection": true ,
	"content-length": true ,
	"cookie": true ,
	"cookie2": true ,
	"date": true ,
	"dnt": true ,
	"expect": true ,
	"host": true ,
	"keep-alive": true ,
	"origin": true ,
	"referer": true ,
	"te": true ,
	"trailer": true ,
	"transfer-encoding": true ,
	"upgrade": true ,
	"via": true ,
	"user-agent": true ,

	"accept": true ,
	"accept-language": true ,
	"content-language": true ,
	"content-type": true ,	// but there are additional requirements
	"last-event-id": true ,

	"dpr": true ,
	"downlink": true ,
	"save-data": true ,
	"viewport-width": true ,
	"width": true
} ;

var defaultExposeHeaders = {
	"content-length": true
} ;

var defaultExposeHeadersString = Object.keys( defaultExposeHeaders ).join( ', ' ) ;



function CorsMiddleware( options ) {
	this.origins = '*' ;
	this.credentials = true ;
	this.methods = defaultMethod ;
	this.headers = defaultHeaders ;
	this.exposeHeaders = defaultExposeHeaders ;
	this.exposeHeadersString = defaultExposeHeadersString ;
	this.maxAge = 600 ;

	if ( options ) { this.set( options ) ; }
}

module.exports = CorsMiddleware ;



/*
	Options:
		origins: array or *
		methods: array or *
*/
CorsMiddleware.prototype.set = function set( options ) {
	if ( Array.isArray( options.origins ) ) { this.origins = arrayToObject( options.origins ) ; }
	else if ( options.origins === '*' ) { this.origins = options.origins ; }

	if ( Array.isArray( options.methods ) ) { this.methods = arrayToObject( options.methods ) ; }
	else if ( options.methods === '*' ) { this.methods = options.methods ; }

	if ( Array.isArray( options.headers ) ) { this.headers = arrayToObject( options.headers ) ; }
	else if ( options.headers === '*' ) { this.headers = options.headers ; }

	if ( Array.isArray( options.exposeHeaders ) ) {
		this.exposeHeaders = arrayToObject( options.exposeHeaders ) ;
		this.exposeHeadersString = options.exposeHeaders.join( ', ' ) ;
	}

	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	if ( options.credentials ) { this.credentials = !! options.credentials ; }

	if ( options.maxAge ) { this.maxAge = '' + options.maxAge ; }
} ;



CorsMiddleware.prototype.handle = function handle( client , next ) {
	var reject = false ,
		reqHeaders = client.request.headers ;

	if ( client.method === 'OPTIONS' ) {
		// This is a CORS pre-flight request
		return this.preFlight( client , next ) ;
	}

	if ( reqHeaders.origin ) {
		// CORS normal request
		log.verbose( "CORS request detected" ) ;

		if ( this.origins === '*' ) {
			client.response.setHeader( 'Access-Control-Allow-Origin' , '*' ) ;
		}
		else if ( this.origins[ reqHeaders['origin'] ] ) {
			client.response.setHeader( 'Access-Control-Allow-Origin' , reqHeaders['origin'] ) ;
		}
		else {
			log.verbose( "Rejecting cross-request because of an unwanted origin" ) ;
			reject = true ;
		}

		if ( this.methods !== '*' && ! this.methods[ client.method ] ) {
			log.verbose( "Rejecting cross-request because of an unwanted method" ) ;
			reject = true ;
		}

		if ( this.headers !== '*' && ! Object.keys( reqHeaders ).every( header => safeHeaders[ header ] || this.headers[ header ] ) ) {
			log.verbose( "Rejecting cross-request because of an unwanted header" ) ;
			reject = true ;
		}

		client.response.setHeader( 'Access-Control-Allow-Expose-Headers' , this.exposeHeadersString ) ;

		if ( this.credentials ) { client.response.setHeader( 'Access-Control-Allow-Credentials' , 'true' ) ; }
	}

	if ( reject ) {
		client.response.statusCode = 403 ;
		return ;
	}

	return next() ;
} ;



// CORS pre-flight request (OPTIONS)
CorsMiddleware.prototype.preFlight = function preFlight( client , next ) {
	var reqHeaders = client.request.headers ;

	log.verbose( "CORS Pre-flight request detected" ) ;

	if ( this.origins === '*' ) {
		client.response.setHeader( 'Access-Control-Allow-Origin' , '*' ) ;
	}
	else if ( this.origins[ reqHeaders['origin'] ] ) {
		client.response.setHeader( 'Access-Control-Allow-Origin' , reqHeaders['origin'] ) ;
	}

	if ( this.methods === '*' || this.methods[ reqHeaders['access-control-request-method'] ] ) {
		client.response.setHeader( 'Access-Control-Allow-Methods' , reqHeaders['access-control-request-method'] ) ;
	}

	if ( reqHeaders['access-control-request-headers'] ) {
		if ( this.headers === '*' ) {
			client.response.setHeader( 'Access-Control-Allow-Headers' , reqHeaders['access-control-request-headers'] ) ;
		}
		else {
			client.response.setHeader( 'Access-Control-Allow-Headers' ,
				reqHeaders['access-control-request-headers']
				.split( /, */g )
				.filter( header => this.headers[ header ] )
				.join( ', ' )
			) ;
		}
	}

	client.response.statusCode = 204 ;	// No content
} ;



function arrayToObject( array ) {
	var object = {} ;
	array.forEach( e => object[ e ] = true ) ;
	return object ;
}

