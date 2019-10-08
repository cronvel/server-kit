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

"use strict" ;



const http = require( 'http' ) ;
const fs = require( 'fs' ) ;
const childProcess = require( 'child_process' ) ;

const Promise = require( 'seventh' ) ;
const log = require( 'logfella' ).global.use( 'server-kit' ) ;



/* HIGHLY EXPERIMENTAL!!! */



// Run a CGI script
module.exports = async function( filePath , client ) {
	log.warning( 'runCgi is HIGHLY EXPERIMENTAL!!!' ) ;

	var done , cgi , headerSent = false , headerBuffer = '' ;

	try {
		cgi = childProcess.spawn( filePath ) ;
	}
	catch ( error ) {
		log.verbose( 'runCgi - Synchronous spawn error %E' , error ) ;

		try {
			client.response.setHeader( 'Content-Length' , 0 ) ;
			client.response.setHeader( 'Cache-Control' , 'max-age=0' ) ;
		}
		catch ( error_ ) {}

		return client.notFound() ;
	}

	var promise = new Promise() ;

	/*
		We should handle here:
			- Environment variable of CGI (see: http://en.wikipedia.org/wiki/Common_Gateway_Interface)
			- Send the request body to the CGI exe
	*/

	//cgi.stdout.pipe( client.response ) ;

	cgi.stdout.on( 'data' , ( data ) => {
		var indexOfSpace , statusCode , statusMessage , bodyStart ;

		log.debug( 'runCgi - CGI stdout: \n%s' , data ) ;

		if ( headerSent ) {
			client.response.write( data.toString() ) ;
			return ;
		}

		// This is really temporary:
		data = headerBuffer + data.toString() ;
		var indexOfDoubleNewLine = data.indexOf( "\n\n" ) ;

		if ( indexOfDoubleNewLine === -1 ) {
			// End of header not found
			headerBuffer = data ;
			return ;
		}

		headerBuffer = data.slice( 0 , indexOfDoubleNewLine ) ;
		bodyStart = data.slice( indexOfDoubleNewLine + 2 ) ;

		//console.log( "headerBuffer:" , headerBuffer ) ;
		//console.log( "bodyStart:" , bodyStart ) ;

		var headers = {} ;
		headerBuffer.split( "\n" ).forEach( line => {
			//log.warning( "line: %s" , line ) ;
			var match = line.match( /^([a-zA-Z0-9-]+): +(.*?) *$/ ) ;

			if ( match ) {
				headers[ match[ 1 ].toLowerCase() ] = match[ 2 ] ;
				//log.warning( "Match %I" , match ) ;
			}
			//else { log.warning( "No match" ) ; }
		} ) ;

		log.debug( 'runCgi - CGI headers: \n%I' , headers ) ;

		if ( headers.status ) {
			indexOfSpace = headers.status.indexOf( ' ' ) ;
			if ( indexOfSpace === -1 ) { indexOfSpace = headers.status.length ; }
			statusCode = parseInt( headers.status.slice( 0 , indexOfSpace ) , 10 ) ;
			if ( statusCode < 100 || statusCode > 999 ) { statusCode = 200 ; }
			statusMessage = headers.status.slice( indexOfSpace ).trim() || http.STATUS_CODES[ statusCode ] ;
			delete headers.status ;
		}
		else {
			statusCode = 200 ;
			statusMessage = http.STATUS_CODES[ 200 ] ;
		}

		//client.response.writeHead( 200 , http.STATUS_CODES[ 200 ] + "\r\n" + data.slice( 0 , indexOfDoubleNewLine ) ) ;
		client.response.writeHead( statusCode , statusMessage , headers ) ;
		client.response.write( bodyStart ) ;
		headerSent = true ;

		/*
			We should handle here:
				- Buffer rather than a slow convert to String
				- remember if headers has already been sent in case of multiple data event
				- empty body
				- HTTP status returned by the CGI backend
		*/

	} ) ;

	cgi.stderr.on( 'data' , ( data ) => {
		log.debug( 'runCgi - CGI stderr: \n%s' , data ) ;
	} ) ;

	cgi.on( 'error' , async ( error ) => {
		log.verbose( 'runCgi - CGI error %E' , error ) ;

		if ( done ) { return ; }
		done = true ;

		await client.notFound() ;
		promise.resolve() ;
	} ) ;

	cgi.on( 'exit' , async ( code ) => {
		log.verbose( 'runCgi - CGI exited with code %s' , code ) ;

		if ( done ) { return ; }
		done = true ;

		try {
			client.response.end() ;
		}
		catch ( error_ ) {}

		promise.resolve() ;
	} ) ;

	return promise ;
} ;

