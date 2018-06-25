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
var url = require( 'url' ) ;
var domain = require( 'domain' ) ;
var EventEmitter = require( 'events' ) ;

var log = require( 'logfella' ).global.use( 'server-kit' ) ;

var Dicer = require( 'server-kit-dicer' ) ;	// Multipart handler
var ws = require( 'ws' ) ;

var Client = require( './Client.js' ) ;
var ErrorDocument = require( './ErrorDocument.js' ) ;

//var util = require( 'util' ) ;

function noop() {}



/*
	new Server( options , requestHandler )
		options: object of options, where:
			port: the port where the server is listening, default to 80
			http: `boolean` spawn an http server
			ws: `boolean` spawn an websocket server
			catchErrors: `boolean` (default: false) catch uncaught userland errors (using try-catch and domain)

	Spawn a new server
*/
function Server( options , requestHandler ) {
	if ( ! options || typeof options !== 'object' ) { options = { http: true , port: 80 } ; }

	this.port = options.port || 80 ;
	this.requestHandler = requestHandler ;
	this.uncaughtError = 0 ;
	this.state = 'init' ;
	this.catchErrors = !! options.catchErrors ;
	this.http = !! options.http ;
	this.ws = !! options.ws ;
	this.multipart = !! options.multipart ;
	this.httpServer = null ;
	this.wsServer = null ;

	if ( this.catchErrors ) {
		this.domain = domain.create() ;
		this.domain.on( 'error' , this.errorHandler.bind( this ) ) ;
		this.domain.run( this.startServer.bind( this ) ) ;
	}
	else {
		this.startServer() ;
	}
}

Server.prototype = Object.create( EventEmitter.prototype ) ;
Server.prototype.constructor = Server ;

module.exports = Server ;



// For backward compatibility
Server.create = ( ... args ) => new Server( ... args ) ;



Server.prototype.startServer = function startServer() {
	var wsUpgradeListenerCount , wsUpgradeListeners ;


	if ( this.http ) {
		// Configure our HTTP server
		this.httpServer = http.createServer() ;

		try {
			// Listen and accept connection to the specified port
			this.httpServer.listen( this.port ) ;
			this.state = 'up' ;
		}
		catch ( error ) {
			if ( ! this.catchErrors ) { throw error ; }

			this.state = 'error' ;

			// Since we exit ATM, we should log even when verbose is off
			log.warning( "Can't open port %i: %E" , this.port , error ) ;
			this.emit( 'error' , error ) ;
		}


		// Request handlers
		this.httpServer.on( 'request' , this.httpRequestHandler.bind( this ) ) ;
		this.httpServer.on( 'upgrade' , this.httpUpgradeRequestHandler.bind( this ) ) ;
		this.httpServer.on( 'connect' , this.httpConnectRequestHandler.bind( this ) ) ;


		// Re-emit those events

		this.httpServer.on( 'error' , ( ... args ) => {
			this.emit( 'error' , ... args ) ;
		} ) ;

		this.httpServer.on( 'listening' , ( ... args ) => {
			log.debug( 'Listening on port %i' , this.port ) ;
			this.emit( 'listening' , ... args ) ;
		} ) ;

		this.httpServer.on( 'close' , ( ... args ) => {
			this.emit( 'close' , ... args ) ;
		} ) ;
	}


	if ( this.ws ) {
		if ( this.httpServer ) {
			wsUpgradeListenerCount = this.httpServer.listeners( 'upgrade' ).length ;

			// If an HTTP server is already created, use it, so it can use 'upgrade' properly over the existing server
			this.wsServer = new ws.Server( { server: this.httpServer } ) ;

			// Looks like a hack here, but we don't want to allow the 'ws' module to trash upgrade request
			// that are specifying another protocol than 'websocket'.
			// So we simply remove the 'ws' module listener.
			wsUpgradeListeners = this.httpServer.listeners( 'upgrade' ) ;

			if ( wsUpgradeListeners.length > wsUpgradeListenerCount ) {
				//log.debug( 'WS listener spotted!' ) ;
				this.httpServer.removeListener( 'upgrade' , wsUpgradeListeners[ wsUpgradeListeners.length - 1 ] ) ;
			}
		}
		else {
			// If no other server has been created, create a new server on this port
			this.wsServer = new ws.Server( { port: this.port } ) ;

			log.debug( 'Spawn a Websocket server on port %i' , this.port ) ;
		}

		this.wsServer.on( 'connection' , this.wsHandler.bind( this ) ) ;
	}
} ;



Server.prototype.wsHandler = function wsHandler( websocket , upgradeReq ) {
	log.debug( "Websocket port %i - connection established, request on path: %s" , this.port , upgradeReq.url ) ;

	// The ws module does not has an event when the websocket is closing...
	// This is the big nasty hack to do it: replace the readyState property by a getter/setter
	var readyState = websocket.readyState ;

	Object.defineProperty( websocket , 'readyState' , {
		get: function() { return readyState ; } ,
		set: function( v ) {
			readyState = v ;
			if ( readyState === ws.CLOSING ) {
				websocket.emit( 'end' ) ;
			}
		}
	} ) ;


	var client = new Client( this , {
		type: 'ws' ,
		protocol: 'ws' ,
		request: upgradeReq ,
		websocket: websocket
	} ) ;

	try {
		this.requestHandler( client ) ;
	}
	catch ( error ) {
		if ( ! this.catchErrors ) { throw error ; }

		log.error( "Websocket port %i - requestHandler uncaught exception: %E" , this.port , error ) ;
		ErrorDocument.defaultHandler( 500 , client ) ;
	}
} ;



var multipartBoundaryRegex = /^multipart\/.+?(?:; boundary=(?:(?:"(.+)")|(?:([^\s]+))))$/ ;

Server.prototype.httpRequestHandler = function httpRequestHandler( request , response ) {
	var client , multipartBoundary ;

	log.debug( "Http port %i - received request on path: %s" , this.port , request.url ) ;

	client = new Client( this , {
		type: 'http' ,
		protocol: 'http' ,
		request: request ,
		response: response
	} ) ;

	if ( this.multipart && request.headers['content-type'] && request.headers['content-type'].slice( 0 , 10 ) === 'multipart/' ) {
		log.debug( 'multipart detected' ) ;

		// Get the multipart boundary
		multipartBoundary = request.headers['content-type'].match( multipartBoundaryRegex ) ;

		if ( ! multipartBoundary ) {
			log.debug( 'bad multipart content-type (or missing boundary)' ) ;
			ErrorDocument.defaultHandler( 500 , client ) ;
			return ;
		}

		multipartBoundary = multipartBoundary[ 1 ] || multipartBoundary[ 2 ] ;

		// Create the Dicer object and put it into the multipart property
		request.multipart = new Dicer( { boundary: multipartBoundary , maxHeaderPairs: 20 } ) ;

		// Pipe the current request into Dicer
		request.pipe( request.multipart ) ;
	}

	try {
		this.requestHandler( client ) ;
	}
	catch ( error ) {
		if ( ! this.catchErrors ) { throw error ; }

		log.error( "Http port %i - requestHandler uncaught exception: %E" , this.port , error ) ;
		ErrorDocument.defaultHandler( 500 , client ) ;
	}
} ;



Server.prototype.httpUpgradeRequestHandler = function httpUpgradeRequestHandler( request , socket , headBuffer_ ) {
	var client , response , headBuffer ;

	// From the 'ws' module:
	// copy headBuffer to avoid retention of large slab buffers used in node core
	headBuffer = Buffer.allocUnsafe( headBuffer_.length ) ;
	headBuffer_.copy( headBuffer ) ;

	log.debug(
		"Http port %i - received an UPGRADE request to the '%s' protocol on path: %s" ,
		this.port , request.headers.upgrade , request.url
	) ;

	// Force a response object:
	response = new http.ServerResponse( request ) ;
	response.assignSocket( socket ) ;

	client = new Client( this , {
		type: 'http.upgrade' ,
		protocol: 'http' ,
		request: request ,
		response: response ,
		headBuffer: headBuffer ,
		socket: socket
	} ) ;


	response.accept = accepted => {

		if ( arguments.length && ! accepted ) {
			response.writeHeader( 400 , {} ) ;
			response.end() ;
			return ;
		}

		switch ( request.headers.upgrade.toLowerCase() ) {
			case 'websocket' :
				if ( ! this.ws ) {
					//this.sendHttpOverSocket( socket , 400 , {} , '' , true ) ;
					response.writeHeader( 400 , {} ) ;
					response.end() ;
					return ;
				}

				// From the 'ws' module:
				this.wsServer.handleUpgrade( request , socket , headBuffer , websocket => {
					this.wsServer.emit( 'connection' + request.url , websocket , request ) ;
					this.wsServer.emit( 'connection' , websocket , request ) ;
				} ) ;

				break ;

			default :
				//this.sendHttpOverSocket( socket , 400 , {} , '' , true ) ;
				response.writeHeader( 400 , {} ) ;
				response.end() ;
		}
	} ;

	try {
		this.requestHandler( client ) ;
	}
	catch ( error ) {
		if ( ! this.catchErrors ) { throw error ; }

		log.error( "Http port %i - requestHandler uncaught exception: %E" , this.port , error ) ;
		ErrorDocument.defaultHandler( 500 , client ) ;
	}
} ;



Server.prototype.httpConnectRequestHandler = function httpConnectRequestHandler( request , socket , headBuffer_ ) {
	var client , response , headBuffer ;

	// From the 'ws' module:
	// copy headBuffer to avoid retention of large slab buffers used in node core
	headBuffer = Buffer.allocUnsafe( headBuffer_.length ) ;
	headBuffer_.copy( headBuffer ) ;

	log.debug( "Http port %i - received a CONNECT on path: %s" , this.port , request.url ) ;

	// Force a response object:
	response = new http.ServerResponse( request ) ;
	response.assignSocket( socket ) ;

	client = new Client( this , {
		type: 'http.connect' ,
		protocol: 'http' ,
		request: request ,
		response: response ,
		headBuffer: headBuffer ,
		socket: socket
	} ) ;


	// There is an issue: https://github.com/joyent/node/issues/7019
	// Any body advertised by "Content-Length" > 0 or "Transfer-Encoding: chunked" will cause a parse error
	// for a node.js client receiving the response, so we should set "Content-Length: 0" and forbid any write.

	//response.setHeader( 'Connection' , 'close' ) ;
	response.setHeader( 'Content-Length' , 0 ) ;
	response.write = noop ;
	response.end = ( data , encoding , callback ) =>
		http.ServerResponse.prototype.end.call( response , undefined , undefined , callback ) ;

	try {
		this.requestHandler( client ) ;
	}
	catch ( error ) {
		if ( ! this.catchErrors ) { throw error ; }

		log.error( "Http port %i - requestHandler uncaught exception: %E" , this.port , error ) ;
		ErrorDocument.defaultHandler( 500 , client ) ;
	}
} ;



Server.prototype.errorHandler = function errorHandler( error ) {
	// For instance, we increment the number of uncaught error,
	// Later it could be a good idea to restart the server when this number reaches some limits.
	this.uncaughtError ++ ;
	log.error( "Http port %i - Uncaught async error #%i: %E" , this.port , this.uncaughtError , error ) ;
} ;



/*
	Useful when no facilities can be used.

	Most of time, this trick can be used instead:
		var response = new http.ServerResponse( request ) ;
		response.assignSocket( socket ) ;
*/
Server.prototype.sendHttpOverSocket = function sendHttpOverSocket( socket , statusCode , headers , body , destroy ) {
	var key , responseHead = '' ;

	if ( body ) {
		if ( ! Buffer.isBuffer( body ) ) {
			if ( typeof body !== 'string' ) { body = JSON.stringify( body ) ; }
			body = Buffer.from( body ) ;
		}

		// This is not done automatically!
		headers['Content-Length'] = body.length ;
	}


	responseHead += 'HTTP/1.1 ' + statusCode + ' ' + http.STATUS_CODES[ statusCode ] + '\r\n' ;

	for ( key in headers ) {
		responseHead.push( key + ': ' + headers[ key ] + '\r\n' ) ;
	}

	responseHead += '\r\n' ;

	try {
		socket.write( responseHead ) ;

		if ( body ) {
			socket.write( body ) ;
		}
	}
	catch ( error ) {
		// Not sure how to handle that ATM. We will just destroy the sockect for instance.
		destroy = true ;
	}
	finally {
		if ( destroy ) {
			try {
				socket.destroy() ;
			}
			catch ( error ) {
			}
		}
	}
} ;



// Shorthand
Server.prototype.close = function close() {
	if ( this.httpServer ) { this.httpServer.close() ; }
	if ( this.wsServer ) { this.wsServer.close() ; }
	this.state = 'down' ;
} ;



Server.prototype.gracefulClose = function gracefulClose() {
	// TODO
} ;


