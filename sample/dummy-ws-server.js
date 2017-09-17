#! /usr/bin/env node
/*
	Server Kit
	
	Copyright (c) 2015 - 2017 Cédric Ronvel
	
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
var server = require( '../lib/server.js' ) ;
 
// Set the port, get it from command line if necessary
var port = 8080 ;

if ( process.argv.length > 2 )
{
	port = process.argv[ 2 ] ;
}


var count = 0 ;

server.createServer( { port: port , ws: true , verbose: true , catchErrors: false } , function( client ) {
	
	var id ;
	
	if ( client.type !== 'ws' )
	{
		client.response.writeHeader( 400 ) ;
		client.response.end( "This server does not handle " + client.type ) ;
		return ;
	}
	
	id = count ++ ;
	
	console.log( "Client #" + id + " connected" ) ;
	
	client.websocket.on( 'message' , function( message ) {
		
		console.log( "Received from #" + id + ": " + message ) ;
		
		client.websocket.send( message.split( '' ).reverse().join( '' ) , function ack( error ) {
			if ( error ) { console.log( "Error:" , error ) ; return ; }
			console.log( "Ack received from #" + id ) ;
		} ) ;
	} ) ;
	
	client.websocket.on( 'close' , function() {
		
		console.log( "Client #" + id + " disconnected" ) ;
	} ) ;
} ) ;


