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



var fs = require( 'fs' ) ;
var mimeType = require( './mimeType.js' ) ;

var log = require( 'logfella' ).global.use( 'server-kit' ) ;



// Serve a static file: stream it to the client
module.exports = function httpServeFile( filePath , client ) {
	return new Promise( ( resolve , reject ) => {
		var done ,
			stream = fs.createReadStream( filePath ) ;

		stream.on( 'open' , async() => {
			client.response.statusCode = 200 ;
			client.response.setHeader( 'Content-Type' , mimeType( filePath ) ) ;
			stream.pipe( client.response ) ;
		} ) ;

		stream.on( 'end' , async() => {
			if ( done ) { return ; }
			done = true ;
			resolve() ;
		} ) ;

		//client.response.on( 'finish' , async () => {} ) ;

		stream.on( 'error' , async( error ) => {
			log.debug( "error %E" , error ) ;
			if ( done ) { return ; }
			done = true ;

			// We don't care about error in the catch block,
			// it happens if the stream emit an error after being piped

			await client.notFound() ;

			// If we don't care, we don't reject
			//reject( error ) ;
			resolve() ;
		} ) ;
	} ) ;
} ;

