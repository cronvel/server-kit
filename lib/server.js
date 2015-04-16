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
	var self = this , wsUpgradeListener ;
	
	
	if ( this.http )
	{
		// Configure our HTTP server
		this.httpServer = http.createServer() ;
		
		try {
			// Listen and accept connection to the specified port
			this.httpServer.listen( this.port ) ;
			this.state = 'up' ;
			
			if ( this.verbose ) { console.log( '[server/http] Spawn a server on port ' + this.port ) ; }
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
		
		
		// Request handlers
		this.httpServer.on( 'request' , this.httpRequestHandler.bind( this ) ) ;
		this.httpServer.on( 'upgrade' , this.httpUpgradeRequestHandler.bind( this ) ) ;
		this.httpServer.on( 'connect' , this.httpConnectRequestHandler.bind( this ) ) ;
		
		
		// Re-emit those events
		
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
			// If an HTTP server is already created, use it, so it can use 'upgrade' properly over the existing server
			this.wsServer = new ws.Server( { server: this.httpServer } ) ;
			
			// Looks like a hack here, but we don't want to allow the 'ws' module to trash upgrade request
			// that are specifying another protocol than 'websocket'.
			wsUpgradeListener = this.httpServer.listeners( 'upgrade' ) ;
			wsUpgradeListener = wsUpgradeListener[ wsUpgradeListener.length - 1 ] ;
			this.httpServer.removeListener( 'upgrade' , wsUpgradeListener ) ;
		}
		else
		{
			// If no other server have been created, create a new server on this port
			this.wsServer = new ws.Server( { port: this.port } ) ;
			
			if ( self.verbose ) { console.log( '[server/ws] Spawn a server on port ' + self.port ) ; }
		}
		
		
		this.wsServer.on( 'connection' , function( websocket ) {
			
			if ( self.verbose ) { console.log( "[server/ws:" + self.port + "] Connection received - request for path: " + websocket.upgradeReq.url ) ; }
			
			var client = Object.create( server.Client.prototype , {
				type: { value: 'ws' , enumerable: true } ,
				protocol: { value: 'ws' , enumerable: true } ,
				server: { value: self , enumerable: true } ,
				path: { value: websocket.upgradeReq.url , enumerable: true } ,
				request: { value: websocket.upgradeReq , enumerable: true } ,
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



server.Server.prototype.httpRequestHandler = function httpRequestHandler( request , response )
{
	var client ;
	
	if ( this.verbose ) { console.log( "[server/http:" + this.port + "] received request for path: " + request.url ) ; }
	
	client = Object.create( server.Client.prototype , {
		type: { value: 'http' , enumerable: true } ,
		protocol: { value: 'http' , enumerable: true } ,
		server: { value: this , enumerable: true } ,
		path: { value: url.parse( request.url ).pathname , enumerable: true } ,
		request: { value: request , enumerable: true } ,
		response: { value: response , enumerable: true }
	} ) ;
	
	try {
		this.requestHandler( client ) ;
	}
	catch ( error ) {
		if ( ! this.catchErrors ) { throw error ; }
		
		if ( this.verbose )
		{
			console.error( "[server/http:" + this.port + "] requestHandler uncaught exception: " , error ) ;
			//CSK.debug.dumpError( error ) ;
			console.error( error ) ;
		}
		
		server.ErrorDocument.defaultHandler( 500 , client ) ;
	}
} ;



server.Server.prototype.httpUpgradeRequestHandler = function httpUpgradeRequestHandler( request , socket , headBuffer_ )
{
	var self = this , client , response , headBuffer ;
	
	// From the 'ws' module:
	// copy headBuffer to avoid retention of large slab buffers used in node core
	headBuffer = new Buffer( headBuffer_.length ) ;
	headBuffer_.copy( headBuffer ) ;
	
	if ( this.verbose )
	{
		console.log(
			"[server/http:" + this.port + "] received UPGRADE to the '" + request.headers.upgrade +
			"' protocol for path: " + request.url
		) ;
	}
	
	// Force a response object:
	response = new http.ServerResponse( request ) ;
	response.assignSocket( socket ) ;
	
	client = Object.create( server.Client.prototype , {
		type: { value: 'http.upgrade' , enumerable: true } ,
		protocol: { value: 'http' , enumerable: true } ,
		server: { value: this , enumerable: true } ,
		path: { value: url.parse( request.url ).pathname , enumerable: true } ,
		request: { value: request , enumerable: true } ,
		response: { value: response , enumerable: true } ,
		headBuffer: { value: headBuffer , enumerable: true } ,
		socket: { value: socket , enumerable: true }
	} ) ;
	
	
	//console.log( request ) ;
	//console.log( response ) ;
	
	response.accept = function( accepted )
	{
		if ( arguments.length && ! accepted )
		{
			response.writeHeader( 400 , {} ) ;
			response.end() ;
			return ;
		}
		
		switch ( request.headers.upgrade.toLowerCase() )
		{
			case 'websocket' :
				if ( ! self.ws )
				{
					//self.sendHttpOverSocket( socket , 400 , {} , '' , true ) ;
					response.writeHeader( 400 , {} ) ;
					response.end() ;
					return ;
				}
				
				// From the 'ws' module:
				self.wsServer.handleUpgrade( request , socket , headBuffer , function( websocket ) {
					self.wsServer.emit('connection' + request.url , websocket ) ;
					self.wsServer.emit('connection' , websocket ) ;
				} ) ;
				
				break ;
			
			default :
				//self.sendHttpOverSocket( socket , 400 , {} , '' , true ) ;
				response.writeHeader( 400 , {} ) ;
				response.end() ;
		}
	} ;
	
	try {
		this.requestHandler( client ) ;
	}
	catch ( error ) {
		if ( ! this.catchErrors ) { throw error ; }
		
		if ( this.verbose )
		{
			console.error( "[server/http:" + this.port + "] requestHandler uncaught exception: " , error ) ;
			//CSK.debug.dumpError( error ) ;
			console.error( error ) ;
		}
		
		server.ErrorDocument.defaultHandler( 500 , client ) ;
	}
} ;



server.Server.prototype.httpConnectRequestHandler = function httpConnectRequestHandler( request , socket , headBuffer_ )
{
	var client , response , headBuffer ;
	
	// From the 'ws' module:
	// copy headBuffer to avoid retention of large slab buffers used in node core
	headBuffer = new Buffer( headBuffer_.length ) ;
	headBuffer_.copy( headBuffer ) ;
	
	if ( this.verbose )
	{
		console.log( "[server/http:" + this.port + "] received CONNECT for path: " + request.url ) ;
	}
	
	// Force a response object:
	response = new http.ServerResponse( request ) ;
	response.assignSocket( socket ) ;
	
	client = Object.create( server.Client.prototype , {
		type: { value: 'http.connect' , enumerable: true } ,
		protocol: { value: 'http' , enumerable: true } ,
		server: { value: this , enumerable: true } ,
		path: { value: url.parse( request.url ).pathname , enumerable: true } ,
		request: { value: request , enumerable: true } ,
		response: { value: response , enumerable: true } ,
		headBuffer: { value: headBuffer , enumerable: true } ,
		socket: { value: socket , enumerable: true }
	} ) ;
	
	
	// There is an issue: https://github.com/joyent/node/issues/7019
	// Any body advertised by "Content-Length" > 0 or "Transfer-Encoding: chunked" will cause a parse error 
	// for a node.js client receiving the response, so we should set "Content-Length: 0" and forbid any write.
	
	//response.setHeader( 'Connection' , 'close' ) ;
	response.setHeader( 'Content-Length' , 0 ) ;
	response.write = function() {} ;
	response.end = function( data , encoding , callback ) {
		return http.ServerResponse.prototype.end.call( response , undefined , undefined , callback ) ;
	} ;
	
	try {
		this.requestHandler( client ) ;
	}
	catch ( error ) {
		if ( ! this.catchErrors ) { throw error ; }
		
		if ( this.verbose )
		{
			console.error( "[server/http:" + this.port + "] requestHandler uncaught exception: " , error ) ;
			//CSK.debug.dumpError( error ) ;
			console.error( error ) ;
		}
		
		server.ErrorDocument.defaultHandler( 500 , client ) ;
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
		//console.trace( error , errorHandler ) ;
	}
} ;



/*
	Useful when no facilities can be used.
	
	Most of time, this trick can be used instead:
		var response = new http.ServerResponse( request ) ;
		response.assignSocket( socket ) ;
*/
server.Server.prototype.sendHttpOverSocket = function sendHttpOverSocket( socket , statusCode , headers , body , destroy )
{
	var key , responseHead = '' ;
	
	if ( body )
	{
		if ( ! Buffer.isBuffer( body ) )
		{
			if ( typeof body !== 'string' ) { body = JSON.stringify( body ) ; }
			body = new Buffer( body ) ;
		}
		
		// This is not done automatically!
		headers['Content-Length'] = body.length ;
	}
	                                                                
	
	responseHead += 'HTTP/1.1 ' + statusCode + ' ' + http.STATUS_CODES[ statusCode ] + '\r\n' ;
	
	for ( key in headers )
	{
		responseHead.push( key + ': ' + headers[ key ] + '\r\n' ) ;
	}
	
	responseHead += '\r\n' ;
	
	try {
		socket.write( responseHead ) ;
		
		if ( body )
		{
			socket.write( body ) ;
		}
	}
	catch ( error ) {
		// Not sure how to handle that ATM. We will just destroy the sockect for instance.
		destroy = true ;
	}
	finally {
		if ( destroy )
		{
			try {
				socket.destroy() ;
			}
			catch ( error ) {
			}
		}
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



