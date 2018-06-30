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



//var log = require( 'logfella' ).global.use( 'server-kit' ) ;



function CorsMiddleware( options ) {
	this.origin = '*' ;
	this.credentials = true ;
	this.methods = 'HEAD, GET, OPTIONS' ;
	this.headers = 'Keep-Alive, User-Agent, X-Requested-With, If-Modified-Since, Cache-Control, Content-Type' ;
	this.exposeHeaders = 'Content-Length' ;
	this.maxAge = 600 ;
	
	if ( options ) { this.set( options ) ; }
}

module.exports = CorsMiddleware ;



CorsMiddleware.prototype.set = function set( options ) {
	if ( options.origin ) { this.origin = options.origin ; }
	
	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	if ( options.credentials ) { this.credentials = !! options.credentials ; }
	
	if ( options.methods ) {
		this.methods = Array.isArray( options.methods ) ? options.methods.join( ', ' ) : options.methods ;
	}

	if ( options.headers ) {
		this.headers = Array.isArray( options.headers ) ? options.headers.join( ', ' ) : options.headers ;
	}
	
	if ( options.exposeHeaders ) {
		this.exposeHeaders = Array.isArray( options.exposeHeaders ) ? options.exposeHeaders.join( ', ' ) : options.exposeHeaders ;
	}

	if ( options.maxAge ) { this.maxAge = '' + options.maxAge ; }
}



CorsMiddleware.prototype.handle = function handle( client , next ) {
	client.response.setHeader( 'Access-Control-Allow-Origin' , this.origin ) ;
	client.response.setHeader( 'Access-Control-Allow-Methods' , this.methods ) ;
	client.response.setHeader( 'Access-Control-Allow-Headers' , this.headers ) ;
	client.response.setHeader( 'Access-Control-Allow-Expose-Headers' , this.exposeHeaders ) ;
	client.response.setHeader( 'Access-Control-Max-Age' , this.maxAge ) ;
	
	if ( options.credentials ) { client.response.setHeader( 'Access-Control-Allow-Credentials' , 'true' ) ; }
	
	client.response.statusCode = 204 ;	// No content
	//client.response.statusMessage = http.STATUS_CODES[ 204 ] ;
	
	next() ;
	//client.response.end() ;
} ;

