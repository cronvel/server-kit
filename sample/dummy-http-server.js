#! /usr/bin/env node


var server = require( '../lib/server.js' ) ;
 
// Set the port, get it from command line if necessary
var port = 8080 ;

if ( process.argv.length > 2 )
{
	port = process.argv[ 2 ] ;
}



server.createServer( { port: port , http: true , verbose: true , catchErrors: false } , function( client ) {
	
	if ( client.type !== 'http' )
	{
		client.response.writeHeader( 400 ) ;
		client.response.end( "This server do not handle " + client.type ) ;
		return ;
	}
	
	client.response.writeHeader( 200 ) ;
	client.response.end( 'Plop.' ) ;
} ) ;
