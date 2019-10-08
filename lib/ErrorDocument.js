/*
	Server Kit

	Copyright (c) 2015 - 2019 Cédric Ronvel

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



// For instance, it's very simple, but it later it will be possible to customize each error document

"use strict" ;



const http = require( 'http' ) ;
//const util = require( 'util' ) ;



function ErrorDocument( handlerType ) {
	this.handler = ErrorDocument.defaultHandler ;
	if ( handlerType ) { this.setHandler( handlerType ) ; }
}

module.exports = ErrorDocument ;



// For backward compatibility
ErrorDocument.create = ( ... args ) => new ErrorDocument( ... args ) ;



ErrorDocument.prototype.setHandler = function( handlerType ) {
	switch ( handlerType ) {
		//case 'defaultHandler' :
		default :
			this.handler = ErrorDocument.defaultHandler ;
			break ;
	}
} ;



ErrorDocument.defaultHandler = function( code , client ) {
	if ( client.protocol === 'ws' ) {
		return ;
	}

	client.response.writeHead( code , { 'Content-Type': 'text/html' } ) ;
	client.response.write( "<h1>" + code + " - " + http.STATUS_CODES[ code ] + ".</h1>" ) ;
	client.response.end() ;
} ;


