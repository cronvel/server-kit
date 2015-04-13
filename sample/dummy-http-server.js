#! /usr/bin/env node


var server = require( '../lib/server.js' ) ;
 
// Set the port, get it from command line if necessary
var port = 8080 ;

if ( process.argv.length > 2 )
{
	port = process.argv[ 2 ] ;
}



server.createServer( port , { http: true , verbose: true , catchErrors: true } , function( client ) {
	//console.log( arguments ) ;
	client.response.writeHeader( 200 ) ;
	client.response.end( 'Plop.' ) ;
} ) ;
