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

function noop() {}



function CommonHandler() {}
module.exports = CommonHandler ;



// Should be derivated
CommonHandler.prototype.handle = function handle( client ) {
	client.response.end() ;
} ;



// Check if it's an end point
CommonHandler.prototype.isEndPoint = endPoint =>
	typeof endPoint === 'function' || ( endPoint instanceof CommonHandler ) || Array.isArray( endPoint ) ;



CommonHandler.prototype.execEndPoint = function execEndPoint( client , endPoint ) {
	if ( ! client.middlewares ) { client.middlewares = [] ; }

	if ( Array.isArray( endPoint ) ) { client.middlewares.push( ... endPoint ) ; }
	else { client.middlewares.push( endPoint ) ; }

	return this.execChain( client ) ;
} ;



CommonHandler.prototype.execChain = async function execChain( client ) {
	var next = () => {
		var middleware = client.middlewares[ client.middlewareIndex ++ ] ;
		if ( ! middleware ) { return ; }
		if ( typeof middleware === 'function' ) { return middleware( client , next ) ; }
		return middleware.handle( client , next ) ;
	} ;

	await next() ;
	
	if ( ! client.response.finished ) { client.response.end() ; }
} ;

