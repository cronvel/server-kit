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
var fs = require( 'fs' ) ;
var childProcess = require( 'child_process' ) ;

var log = require( 'logfella' ).global.use( 'server-kit' ) ;



/* HIGHLY EXPERIMENTAL!!! */



// Run a CGI script
module.exports = function runCgi( client , filePath ) {
	log.warning( 'runCgi is HIGHLY EXPERIMENTAL!!!' ) ;

	var cgi , headerSent = false , headerBuffer = '' ;


	try {
		cgi = childProcess.spawn( filePath ) ;
	}
	catch ( error ) {
		log.verbose( 'runCgi - Synchronous spawn error %E' , error ) ;
		
		try {
			client.response.statusCode = 404 ;
			client.response.setHeader( 'Content-Length' , 0 ) ;
			client.response.setHeader( 'Cache-Control' , 'max-age=0' ) ;
		}
		catch ( error_ ) {}

		try {
			client.response.end() ;
		}
		catch ( error_ ) {}
		
		return ;
	}
	
	/*
		We should handle here:
			- Environment variable of CGI (see: http://en.wikipedia.org/wiki/Common_Gateway_Interface)
			- Send the request body to the CGI exe
	*/

	//cgi.stdout.pipe( client.response ) ;

	cgi.stdout.on( 'data' , ( data ) => {

		log.debug( 'runCgi - CGI stdout: \n%s' , data ) ;

		if ( headerSent ) {
			client.response.write( data ) ;
			return ;
		}

		// This is really temporary:
		data = headerBuffer + data.toString() ;
		var index = data.indexOf( "\r\n\r\n" ) ;

		if ( index === -1 ) {
			// End of header not found
			headerBuffer += data ;
			return ;
		}

		log.debug( 'runCgi - CGI headers: \n' , data.slice( 0 , index + 2 ) ) ;
		client.response.writeHead( 200 , http.STATUS_CODES[ 200 ] + "\r\n" + data.slice( 0 , index ) ) ;
		client.response.write( data.slice( index + 4 ) ) ;
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

	cgi.on( 'error' , ( error ) => {
		log.verbose( 'runCgi - CGI error %E' , error ) ;
		
		try {
			client.response.statusCode = 404 ;
			client.response.setHeader( 'Content-Length' , 0 ) ;
			client.response.setHeader( 'Cache-Control' , 'max-age=0' ) ;
		}
		catch ( error_ ) {}

		try {
			client.response.end() ;
		}
		catch ( error_ ) {}
	} ) ;
	
	cgi.on( 'exit' , ( code ) => {
		log.verbose( 'runCgi - CGI exited with code %s' , code ) ;
		
		try {
			client.response.end() ;
		}
		catch ( error_ ) {}
	} ) ;
} ;


