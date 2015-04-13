#! /usr/bin/env node


var server = require( '../lib/server.js' ) ;
 
// Set the port, get it from command line if necessary
var port = 8080 ;

if ( process.argv.length > 2 )
{
	port = process.argv[ 2 ] ;
}


var count = 0 ;

server.createServer( port , { ws: true , verbose: true , useDomain: true } , function( client ) {
	//console.log( client.websocket ) ;
	
	var id = count ++ ;
	
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


