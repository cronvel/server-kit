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
var events = require( 'events' ) ;

var ws = require( 'ws' ) ;
//var util = require( 'util' ) ;





var server = {} ;
module.exports = server ;



// Add submodules
server.ErrorDocument = require( './ErrorDocument.js' ) ;
server.Router = require( './Router.js' ) ;
server.mimeType = require( './mimeType.js' ) ;





			/* Server class */



server.Server = function Server() { throw new Error( '[server-kit] Cannot create a Server object directly, use .createServer() instead.' ) ; } ;
server.Server.prototype = Object.create( events.EventEmitter.prototype ) ;
server.Server.prototype.constructor = server.Server ;



/*
	createServer( options , requestHandler )
		options: object of options, where:
			port: the port where the server is listening, default to 80
			http: `boolean` spawn an http server
			ws: `boolean` spawn an websocket server
			verbose: `boolean` (default: false) log connection on STDOUT, errors on STDERR
			catchErrors: `boolean` (default: false) catch uncaught userland errors (using try-catch and domain)
	
	Spawn a new server
*/
server.createServer = function createServer( options , requestHandler )
{
	if ( ! options || typeof options !== 'object' ) { options = { http: true , port: 80 } ; }
	
	var srv = Object.create( server.Server.prototype , {
		port: { value: options.port || 80 , enumerable: true } ,
		requestHandler: { value: requestHandler , enumerable: true } ,
		uncaughtError: { value: 0 , writable: true , enumerable: true } ,
		state: { value: 'init' , writable: true , enumerable: true } ,
		verbose: { value: !! options.verbose , writable: true , enumerable: true } ,
		catchErrors: { value: !! options.catchErrors , enumerable: true } ,
		http: { value: !! options.http , enumerable: true } ,
		ws: { value: !! options.ws , enumerable: true } ,
		httpServer: { value: undefined , writable: true , enumerable: true } ,
		wsServer: { value: undefined , writable: true , enumerable: true }
	} ) ;
	
	if ( srv.catchErrors )
	{
		srv.domain = domain.create() ;
		srv.domain.on( 'error' , srv.errorHandler.bind( srv ) ) ;
		srv.domain.run( srv.startServer.bind( srv ) ) ;
	}
	else
	{
		srv.startServer() ;
	}
	
	return srv ;
} ;



server.Server.prototype.startServer = function startServer()
{
	var self = this ;
	
	if ( this.http )
	{
		// Configure our HTTP server
		this.httpServer = http.createServer( function( request , response ) {
			
			if ( self.verbose ) { console.log( "[server/http:" + self.port + "] received request for path: " + request.url ) ; }
			
			var client = Object.create( server.Client.prototype , {
				server: { value: self , enumerable: true } ,
				protocol: { value: 'http' , enumerable: true } ,
				path: { value: url.parse( request.url ).pathname , enumerable: true } ,
				request: { value: request , enumerable: true } ,
				response: { value: response , enumerable: true }
			} ) ;
			
			try {
				self.requestHandler( client ) ;
			}
			catch ( error ) {
				if ( ! self.catchErrors ) { throw error ; }
				
				if ( self.verbose )
				{
					console.error( "[server/http:" + self.port + "] requestHandler uncaught exception: " , error ) ;
					//CSK.debug.dumpError( error ) ;
					console.error( error ) ;
				}
				
				server.ErrorDocument.defaultHandler( 500 , client ) ;
			}
		} ) ;
		
		try {
			// Listen and accept connection to the specified port
			self.httpServer.listen( self.port ) ;
			self.state = 'up' ;
			
			if ( self.verbose ) { console.log( '[server/http] Spawn a server on port ' + self.port ) ; }
		}
		catch ( error ) {
			if ( ! this.catchErrors ) { throw error ; }
			
			this.state = 'error' ;
			
			// Since we exit ATM, we should log even when verbose is off
			console.error( "[server/http] Can't open port " + this.port + ':' ) ;
			//CSK.debug.dumpError( error ) ;
			console.error( error ) ;
			console.error( '[server/http] Exit' ) ;
			process.exit( 1 ) ;
		}
		
		// Re-emit events
		this.httpServer.on( 'error' , function( error ) {
			self.emit( 'error' , error ) ;
		} ) ;
		
		this.httpServer.on( 'close' , function() {
			self.emit( 'close' ) ;
		} ) ;
	}
	
	
	if ( this.ws )
	{
		if ( this.httpServer )
		{
			// If an HTTP server is already created, use it, so it can use 'upgrade' properly over HTTP,
			// the port cannot be shared without that
			this.wsServer = new ws.Server( { server: this.httpServer } ) ;
		}
		else
		{
			// If no other server have been created, create a new server on this port
			this.wsServer = new ws.Server( { port: this.port } ) ;
		}
		
		if ( self.verbose ) { console.log( '[server/ws] Spawn a server on port ' + self.port ) ; }
		
		this.wsServer.on( 'connection' , function( websocket ) {
			
			if ( self.verbose ) { console.log( "[server/ws:" + self.port + "] Connection received - request for path: " + websocket.upgradeReq.url ) ; }
			
			var client = Object.create( server.Client.prototype , {
				server: { value: self , enumerable: true } ,
				protocol: { value: 'ws' , enumerable: true } ,
				path: { value: websocket.upgradeReq.url , enumerable: true } ,
				upgradeRequest: { value: websocket.upgradeReq , enumerable: true } ,
				websocket: { value: websocket , enumerable: true }
			} ) ;
			
			try {
				self.requestHandler( client ) ;
			}
			catch ( error ) {
				if ( ! self.catchErrors ) { throw error ; }
				
				if ( self.verbose )
				{
					console.error( "[server/ws:" + self.port + "] requestHandler uncaught exception: " , error ) ;
					//CSK.debug.dumpError( error ) ;
					console.error( error ) ;
				}
				
				server.ErrorDocument.defaultHandler( 500 , client ) ;
			}
		} ) ;
	}
} ;



server.Server.prototype.errorHandler = function errorHandler( error )
{
	// For instance, we increment the number of uncaught error,
	// Later it could be a good idea to restart the server when this number reaches some limits.
	this.uncaughtError ++ ;
	
	if ( this.verbose )
	{
		console.error( "[server/http:" + this.port + "] Uncaught async error (#" + this.uncaughtError + "): " ) ;
		//CSK.debug.dumpError( error ) ;
		console.error( error ) ;
	}
} ;



// Shortcut
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



// An instance of Client is passed to server's callback.
// It does not contains any methods ATM... 
server.Client = function Client() { throw new Error( '[server-kit] Cannot create a Client object directly, use .spawn() instead.' ) ; } ;



