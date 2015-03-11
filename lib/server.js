/*
	The Cedric's Swiss Knife (CSK) - CSK Server toolbox

	Copyright (c) 2015 Cédric Ronvel 
	
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



// Load modules
var http = require( 'http' ) ;
var url = require( 'url' ) ;
var domain = require( 'domain' ) ;

var ws = require( 'ws' ) ;
//var util = require( 'util' ) ;





var server = {} ;
module.exports = server ;



// Add submodules
server.errorDocument = require( './errorDocument.js' ) ;
server.mimeType = require( './mimeType.js' ) ;
server.Router = require( './Router.js' ) ;





			/* Server class */



server.Server = function Server() { throw new Error( '[server] Cannot create a Server object directly, use .createServer() instead.' ) ; } ;



// Spawn a new server
// create( port , [options] , requestHandler )
server.Server.create = function create( port , options , requestHandler )
{
	if ( arguments.length === 2 ) { requestHandler = options ; options = undefined ; }
	if ( ! options ) { options = { http: true } ; }
	
	var srv = Object.create( server.Server.prototype , {
		port: { value: port , enumerable: true } ,
		requestHandler: { value: requestHandler , enumerable: true } ,
		domain: { value: domain.create() , enumerable: true } ,
		uncaughtError: { value: 0 , writable: true , enumerable: true } ,
		state: { value: 'init' , writable: true , enumerable: true } ,
		httpServer: { value: undefined , writable: true , enumerable: true } ,
		wsServer: { value: undefined , writable: true , enumerable: true }
	} ) ;
	
	
	srv.domain.on( 'error' , function( error ) {
		
		// For instance, we increment the number of uncaught error,
		// Later it could be a good idea to restart the server when this number reaches some limits.
		srv.uncaughtError ++ ;
		console.log( "[server/http:" + srv.port + "] Uncaught async error (#" + srv.uncaughtError + "): " ) ;
		//CSK.debug.dumpError( error ) ;
		console.log( error ) ;
	} ) ;
	
	
	srv.domain.run( function() {
		
		if ( options.http )
		{
			// Configure our HTTP server
			srv.httpServer = http.createServer( function( request , response ) {
				
				console.log( "[server/http:" + srv.port + "] received request for path: " + request.url ) ;
				
				var client = Object.create( server.Client.prototype , {
					server: { value: srv , enumerable: true } ,
					protocol: { value: 'http' , enumerable: true } ,
					path: { value: url.parse( request.url ).pathname , enumerable: true } ,
					request: { value: request , enumerable: true } ,
					response: { value: response , enumerable: true }
				} ) ;
				
				try {
					srv.requestHandler( client ) ;
				}
				catch ( error ) {
					console.log( "[server/http:" + srv.port + "] requestHandler uncaught exception: " , error ) ;
					//CSK.debug.dumpError( error ) ;
					console.log( error ) ;
					server.errorDocument.defaultHandler( 500 , client ) ;
				}
			} ) ;
			
			try {
				// Listen and accept connection to the specified port
				srv.httpServer.listen( srv.port ) ;
				srv.state = 'up' ;
				console.log( '[server/http] Spawn a server on port ' + srv.port ) ;
			}
			catch ( error ) {
				srv.state = 'error' ;
				console.log( "[server/http] Can't open port " + srv.port + ':' ) ;
				//CSK.debug.dumpError( error ) ;
				console.log( error ) ;
				console.log( '[server/http] Exit' ) ;
				process.exit( 1 ) ;
			}
		}
		
		
		if ( options.ws )
		{
			if ( srv.httpServer )
			{
				// If an HTTP server is already created, use it, so it can use 'upgrade' properly over HTTP,
				// the port cannot be shared without that
				srv.wsServer = new ws.Server( { server: srv.httpServer } ) ;
			}
			else
			{
				// If no other server have been created, create a new server on this port
				srv.wsServer = new ws.Server( { port: srv.port } ) ;
			}
			
			
			srv.wsServer.on( 'connection' , function( websocket ) {
				
				console.log( "[server/ws:" + srv.port + "] Connection received - request for path: " + websocket.upgradeReq.url ) ;
				
				var client = Object.create( server.Client.prototype , {
					server: { value: srv , enumerable: true } ,
					protocol: { value: 'ws' , enumerable: true } ,
					path: { value: websocket.upgradeReq.url , enumerable: true } ,
					upgradeRequest: { value: websocket.upgradeReq , enumerable: true } ,
					websocket: { value: websocket , enumerable: true }
				} ) ;
				
				try {
					srv.requestHandler( client ) ;
				}
				catch ( error ) {
					console.log( "[server/ws:" + srv.port + "] requestHandler uncaught exception: " , error ) ;
					//CSK.debug.dumpError( error ) ;
					console.log( error ) ;
					server.errorDocument.defaultHandler( 500 , client ) ;
				}
			} ) ;
		}
		
	} ) ;
	
	return srv ;
} ;



// Shortcut
server.createServer = server.Server.create ;
server.Server.prototype.close = function close()
{
	if ( this.httpServer ) { this.httpServer.close() ; }
	if ( this.wsServer ) { this.wsServer.close() ; }
	this.state = 'down' ;
} ;



server.Server.prototype.gracefulClose = function gracefulClose()
{
	// TODO
} ;








			/* Client class */



server.Client = function Client() { throw new Error( '[server] Cannot create a Client object directly, use .spawn() instead.' ) ; } ;
server.Client.prototype.constructor = server.Client ;

