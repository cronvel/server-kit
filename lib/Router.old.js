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



const http = require( 'http' ) ;
const fs = require( 'fs' ) ;
const childProcess = require( 'child_process' ) ;
//const url = require( 'url' ) ;
//const util = require( 'util' ) ;

const ErrorDocument = require( './ErrorDocument.js' ) ;
const mimeType = require( './mimeType.js' ) ;

const log = require( 'logfella' ).global.use( 'server-kit' ) ;



function Router( type ) {
	if ( ! Router.prototype[ type ] ) { throw new Error( '[server-kit/Router] Unknown router type.' ) ; }

	Object.defineProperties( this , {
		type: { value: type , enumerable: true } ,
		localRootPath: { value: './' , writable: true , enumerable: true } ,
		fallbackRoute: { value: null , writable: true , enumerable: true } ,
		strictRouteMap: { value: {} , writable: true , enumerable: true } ,
		regexpRouteMap: { value: [] , writable: true , enumerable: true } ,
		watchedFiles: { value: {} , writable: true , enumerable: true } ,
		errorDocument: { value: new ErrorDocument() , writable: true , enumerable: true } ,
		indexFile: { value: '' , writable: true , enumerable: true }
	} ) ;

	// Since it binds with the freshly created router, it cannot be done at object's creation
	Object.defineProperty( this , 'requestHandler' , {
		value: Router.prototype[ type ].bind( this )
	} ) ;
}

module.exports = Router ;



// For backward compatibility
Router.create = ( ... args ) => new Router( ... args ) ;



/*
	A router for static files: just set a root folder and it will simply map URL to its descendants,
	serving all static files found.
*/
Router.prototype.simpleStaticRouter = function( client ) {
	if ( ! client.route ) { client.route = client.path ; }

	client.localPath = client.route ;
	client.match = client.route ;

	if ( client.localPath.indexOf( '..' ) !== -1 ) {
		// 403
		log.verbose( "simpleStaticRouter - path %s is forbidden" , client.path ) ;
		this.errorDocument.handler( 403 , client ) ;
		return ;
	}

	if ( client.localPath === '/' ) { client.localPath = '/' + this.indexFile ; }
	if ( client.localPath[ client.localPath.length - 1 ] === '/' ) { client.localPath = client.localPath.slice( 0 , -1 ) ; }

	client.localPath = this.localRootPath + client.localPath ;

	this.serveStatic( client ) ;
} ;



/*
	A router for modules: just set a root folder and it will simply map URL to its descendants,
	executing all JS module files found.
*/
Router.prototype.simpleModuleRouter = function( client ) {
	if ( ! client.route ) { client.route = client.path ; }

	client.localPath = client.route ;
	client.match = client.route ;

	if ( client.localPath === '/' ) { client.localPath = '/' + this.indexFile ; }
	client.localPath = this.localRootPath + client.localPath ;

	this.runModule( client ) ;
} ;



/*
	A router that maps URLs to something else.
	Route should be added to it.
*/
// TODO: Cleanup things with client.match
Router.prototype.mapRouter = function( client ) {
	if ( ! client.route ) { client.route = client.path ; }

	var target ,
		nextRoute = client.route ,
		match = client.route ;


	if ( this.strictRouteMap[ client.route ] !== undefined ) {
		target = this.strictRouteMap[ client.route ] ;
	}
	else if ( this.regexpRouteMap.length > 0 ) {
		this.regexpRouteMap.every( ( element ) => {
			if ( client.route.search( element.regexp ) !== -1 ) {
				target = element ;
				nextRoute = client.route.replace( target.regexp , '' ) ;
				return false ;
			}
			return true ;
		} ) ;
	}


	if ( ! target ) {
		if ( this.fallbackRoute ) {
			target = this.fallbackRoute ;
		}
		else {
			// This is a 404
			log.verbose( "mapRouter 404 on path %s, route: %I" , client.path , client.route ) ;
			this.errorDocument.handler( 404 , client ) ;
			return ;
		}
	}


	switch ( target.type ) {
		case 'static' :
			// Serve this file
			client.localPath = this.localRootPath + '/' + target.target ;
			client.match = match ;
			this.serveStatic( client ) ;
			break ;

		case 'module' :
			// Run this module
			if ( client.protocol !== target.protocol && target.protocol !== 'all' ) {
				// This is a 400
				log.verbose( "mapRouter 400 - bad protocol (protocol: %s, expected: %s) on path %s, route: %I" , client.protocol , target.protocol , client.path , client.route ) ;
				this.errorDocument.handler( 400 , client ) ;
				return ;
			}

			client.localPath = this.localRootPath + '/' + target.target ;
			client.match = match ;
			this.runModule( client ) ;
			break ;

		case 'watchedModule' :
			// Run this watched module
			if ( client.protocol !== target.protocol && target.protocol !== 'all' ) {
				// This is a 400
				log.verbose( "mapRouter 400 - bad protocol (protocol: %s, expected: %s) on path %s, route: %I" , client.protocol , target.protocol , client.path , client.route ) ;
				this.errorDocument.handler( 400 , client ) ;
				return ;
			}

			client.localPath = this.localRootPath + '/' + target.target ;
			client.match = match ;
			this.runWatchedModule( client ) ;
			break ;

		case 'cgi' :
			// Run this cgi module
			if ( client.protocol !== target.protocol && target.protocol !== 'all' ) {
				// This is a 400
				log.verbose( "mapRouter 400 - bad protocol (protocol: %s, expected: %s) on path %s, route: %I" , client.protocol , target.protocol , client.path , client.route ) ;
				this.errorDocument.handler( 400 , client ) ;
				return ;
			}

			client.localPath = this.localRootPath + '/' + target.target ;
			client.match = match ;
			this.runCgi( client ) ;
			break ;

		case 'function' :
			// This is a callback function, so it can be a userland inline, or a subrouter
			//*
			if ( client.protocol !== target.protocol && target.protocol !== 'all' ) {
				// This is a 400
				log.verbose( "mapRouter 400 - bad protocol (protocol: %s, expected: %s) on path %s, route: %I" , client.protocol , target.protocol , client.path , client.route ) ;
				this.errorDocument.handler( 400 , client ) ;
				return ;
			}
			//*/

			client.match = target.regexp ;
			client.route = nextRoute ;
			target.target( client ) ;
			break ;

		default :
			// Bad router entry
			log.error( "mapRouter - Bad router entry on path %s, route: %I" , client.path , client.route ) ;
			//delete this.strictRouteMap[ client.route ] ;
			break ;
	}
} ;



Router.prototype.addRoute = function( match , target , type , protocol ) {
	switch ( type ) {
		case 'module' :
		case 'watchedModule' :
		case 'static' :
		case 'cgi' :
			break ;
		default :
			type = 'module' ;
			break ;
	}

	switch ( protocol ) {
		case 'http' :
		case 'ws' :
		case 'all' :
			break ;
		default :
			protocol = 'all' ;
			break ;
	}


	var typeofTarget = typeof target ;
	if ( typeofTarget === 'object' ) { typeofTarget = target.constructor.name ; }

	switch ( typeofTarget ) {
		case 'string' :
			target = { protocol: protocol , type: type , target: target } ;
			break ;

		case 'function' :
			target = { protocol: protocol , type: 'function' , target: target } ;
			break ;

		default :
			// Bad router entry
			log.error( "addRoute - Bad target type: %s" , typeofTarget ) ;
			break ;
	}


	var typeofMatch = typeof match ;
	if ( ! match ) { typeofMatch = 'fallback' ; }
	else if ( typeofMatch === 'object' ) { typeofMatch = match.constructor.name ; }

	switch ( typeofMatch ) {
		case 'string' :
			this.strictRouteMap[ match ] = target ;
			break ;

		case 'RegExp' :
			target.regexp = match ;
			this.regexpRouteMap.push( target ) ;
			break ;

		case 'fallback' :
			this.fallbackRoute = target ;
			break ;

		default :
			log.error( "addRoute - cannot add route of type: %s" , typeofMatch ) ;
			break ;
	}
} ;



// Shorthands
Router.prototype.addHttpRoute = function( match , target ) { return this.addRoute( match , target , undefined , 'http' ) ; } ;
Router.prototype.addStaticRoute = function( match , target ) { return this.addRoute( match , target , 'static' , 'http' ) ; } ;
Router.prototype.addCgiRoute = function( match , target ) { return this.addRoute( match , target , 'cgi' , 'http' ) ; } ;
Router.prototype.addWsRoute = function( match , target ) { return this.addRoute( match , target , undefined , 'ws' ) ; } ;



Router.prototype.setLocalRootPath = function( localRootPath ) { this.localRootPath = localRootPath ; } ;

// Works only for simple routers
Router.prototype.setIndexFile = function( indexFile ) { this.indexFile = indexFile ; } ;



// Serve a static file: stream it to the client
Router.prototype.serveStatic = function( client ) {
	var stream ;

	stream = fs.createReadStream( client.localPath ) ;

	stream.on( 'open' , () => {
		client.response.statusCode = 200 ;
		client.response.setHeader( 'Content-Type' , mimeType( client.localPath ) ) ;
		stream.pipe( client.response ) ;
	} ) ;

	stream.on( 'error' , ( error ) => {

		// We don't care about error in the catch block,
		// it happens if the stream emit an error after being piped
		log.debug( "error %E" , error ) ;

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
} ;



// Run a module and output it to the client
Router.prototype.runModule = function( client ) {
	var entry ;

	try {
		entry = require.main.require( client.localPath ) ;
	}
	catch ( error ) {
		log.error( "runModule - cannot require %s, error: %E" , client.localPath , error ) ;
		this.errorDocument.handler( 404 , client ) ;
		return ;
	}

	try {
		entry( client ) ;
	}
	catch ( error ) {
		log.error( "runModule - cannot execute %s, error: %E" , client.localPath , error ) ;
		this.errorDocument.handler( 500 , client ) ;
		return ;
	}

	return ;
} ;



// Run a module and output it to the client, when the file change, delete the cache for that module and reload it
Router.prototype.runWatchedModule = function( client ) {
	var resolvedPath , entry , watcher ;

	try {
		resolvedPath = require.main.require.resolve( client.localPath ) ;

		if ( this.watchedFiles[ resolvedPath ] === undefined ) {
			log.info( "runWatchedModule - new file to watch: %s" , resolvedPath ) ;

			watcher = fs.watch( resolvedPath , { persistent: false } ) ;

			watcher.on( 'change' , ( event , filename ) => {
				log.info( "runWatchedModule - %s detected on file %s" , event , filename ) ;
				delete require.main.require.cache[ resolvedPath ] ;
			} ) ;

			watcher.on( 'error' , ( error ) => {
				log.error( "runWatchedModule - error for watched file %s, error: %E" , client.localPath , error ) ;
			} ) ;

			this.watchedFiles[ resolvedPath ] = watcher ;
		}
	}
	catch ( error ) {
		log.error( "runWatchedModule - cannot watch file %s, error: %E" , client.localPath , error ) ;
		this.errorDocument.handler( 404 , client ) ;
		return ;
	}


	try {
		entry = require.main.require( client.localPath ) ;
	}
	catch ( error ) {
		log.error( "runWatchedModule - cannot require %s, error: %E" , client.localPath , error ) ;
		this.errorDocument.handler( 404 , client ) ;
		return ;
	}


	try {
		entry( client ) ;
	}
	catch ( error ) {
		log.error( "runWatchedModule - cannot execute %s, error: %E" , client.localPath , error ) ;
		this.errorDocument.handler( 500 , client ) ;
		return ;
	}

	return ;
} ;



// Run a CGI script
Router.prototype.runCgi = function( client ) {
	log.warning( 'runCgi is HIGHLY EXPERIMENTAL!!!' ) ;

	var cgi , headerSent = false , headerBuffer = '' ;


	cgi = childProcess.spawn( client.localPath ) ;

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

	cgi.on( 'exit' , ( code ) => {
		log.verbose( 'runCgi - CGI exited with code %s' , code ) ;
		client.response.end() ;
	} ) ;
} ;


