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



const fs = require( 'fs' ) ;
const mimeType = require( './mimeType.js' ) ;

const log = require( 'logfella' ).global.use( 'server-kit' ) ;



// Serve a static file: stream it to the client
module.exports = ( filePath , client , noDefaultErrorHandling = false ) => {
	return new Promise( ( resolve , reject ) => {
		var done ,
			stream = fs.createReadStream( filePath ) ;

		stream.on( 'open' , async () => {
			client.response.statusCode = 200 ;
			client.response.setHeader( 'Content-Type' , mimeType( filePath ) ) ;
			stream.pipe( client.response ) ;
		} ) ;

		stream.on( 'end' , async () => {
			if ( done ) { return ; }
			done = true ;
			resolve() ;
		} ) ;

		//client.response.on( 'finish' , async () => {} ) ;

		stream.on( 'error' , async ( error ) => {
			log.debug( "Can't serve file %s: %E" , filePath , error ) ;

			if ( done ) {
				// Here we don't care about error because it happened after stream being piped
				return ;
			}

			done = true ;

			if ( noDefaultErrorHandling ) {
				reject( error ) ;
			}
			else {
				await client.notFound() ;
				// We don't reject, we have handled it on our own
				resolve() ;
			}
		} ) ;
	} ) ;
} ;

