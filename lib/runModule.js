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



// Run a module and output it to the client
module.exports = function runModule( client , filePath ) {
	try {
		var module_ = require.main.require( filePath ) ;
	}
	catch ( error ) {
		log.debug( "runModule - cannot require %s, error: %E" , filePath , error ) ;
		
		try {
			client.response.statusCode = 404 ;
			client.response.end() ;
		}
		catch ( error_ ) {}
		
		return ;
	}

	try {
		module_( client ) ;
	}
	catch ( error ) {
		log.error( "runModule - cannot execute %s, error: %E" , filePath , error ) ;
		
		// Use try/catch: we don't know if the module has done anything with the client yet...
		// By the way, if the error is async, nothing could be done here...
		
		try {
			client.response.statusCode = 500 ;
			client.response.end() ;
		}
		catch ( error_ ) {}
	}
} ;

