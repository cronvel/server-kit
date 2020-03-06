#! /usr/bin/env node
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



var serverKit = require( '..' ) ;

// Set the port, get it from command line if necessary
var port = 8080 ;

if ( process.argv.length > 2 ) {
	port = process.argv[ 2 ] ;
}


var count = 0 ;

serverKit.createServer( {
	port: port , http: true , ws: true , verbose: true , catchErrors: false
} , ( client ) => {

	if ( client.type === 'http' ) {
		client.response.writeHeader( 200 ) ;
		client.response.end( 'Plop.' ) ;
	}
	else if ( client.type === 'http.upgrade' ) {
		// Accept all websocket connection, regardless of headers
		client.response.accept( true ) ;
	}
	else if ( client.type === 'ws' ) {
		var id = count ++ ;

		console.log( "Client #" + id + " connected" ) ;

		client.websocket.on( 'message' , ( message ) => {

			//console.log( "Received from #" + id + ": '" + message + "' " + ( typeof message ) + ' ' + message.constructor.name ) ;

			if ( typeof message !== 'string' ) { message = '' + message ; }

			console.log( "Received from #" + id + ": " + message ) ;

			client.websocket.send( message.split( '' ).reverse().join( '' ) , ( error ) => {
				if ( error ) { console.log( "Error:" , error ) ; return ; }
				console.log( "Ack received from #" + id ) ;
			} ) ;
		} ) ;

		client.websocket.on( 'close' , () => {

			console.log( "Client #" + id + " disconnected" ) ;
		} ) ;
	}
	else {
		client.response.writeHeader( 400 ) ;
		client.response.end( "This server does not handle " + client.type ) ;
	}
} ) ;


