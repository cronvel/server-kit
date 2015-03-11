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
var fs = require( 'fs' ) ;
var childProcess = require( 'child_process' ) ;
//var url = require( 'url' ) ;
//var util = require( 'util' ) ;

var server = require( './server.js' ) ;





function Router() { throw new Error( "[routing] Cannot create a Router object directly, use .Router.create() instead." ) ; } ;
module.exports = Router ;



Router.create = function create( type )
{
	if ( ! Router.prototype[ type ] ) { throw new Error( '[routing] Unknown router type.' ) ; }
	
	var router = Object.create( Router.prototype , {
		type: { value: type , enumerable: true } ,
		localRootPath: { value: './' , writable: true , enumerable: true } ,
		fallbackRoute: { value: undefined , writable: true , enumerable: true } ,
		strictRouteMap: { value: {} , writable: true , enumerable: true } ,
		regexpRouteMap: { value: [] , writable: true , enumerable: true } ,
		watchedFiles: { value: {} , writable: true , enumerable: true } ,
		errorDocumentHandler: { value: server.errorDocument.handler() , writable: true , enumerable: true } ,
		simpleRouterIndex: { value: 'index.js' , writable: true , enumerable: true } ,
	} ) ;
	
	// Since it binds with the freshly created router, it cannot be done at object's creation
	Object.defineProperty( router , 'requestHandler' , {
		value: Router.prototype[ type ].bind( router )
	} ) ;
	
	return router ;
} ;



Router.prototype.simpleModuleRouter = function simpleModuleRouter( client )
{
	if ( ! client.route ) { client.route = client.path ; }
	
	client.localPath = client.route ;
	client.match = client.route ;
	
	if ( client.localPath === '/' ) { client.localPath = '/' + this.simpleRouterIndex ; }
	client.localPath = this.localRootPath + client.localPath ;
	
	this.runModule( client ) ;
} ;



Router.prototype.simpleStaticRouter = function simpleStaticRouter( client )
{
	if ( ! client.route ) { client.route = client.path ; }
	
	client.localPath = client.route ;
	client.match = client.route ;
	
	if ( client.localPath === '/' ) { client.localPath = '/' + this.simpleRouterIndex ; }
	client.localPath = this.localRootPath + client.localPath ;
	
	this.serveStatic( client ) ;
} ;



// TODO: Cleanup things with client.match
Router.prototype.mapRouter = function mapRouter( client )
{
	if ( ! client.route ) { client.route = client.path ; }
	
	var target , nextRoute = client.route , match = client.route ;
	
	
	if ( typeof this.strictRouteMap[ client.route ] !== 'undefined' )
	{
		target = this.strictRouteMap[ client.route ] ;
	}
	else if ( this.regexpRouteMap.length > 0 )
	{
		this.regexpRouteMap.every( function( element ) {
			if ( client.route.search( element.regexp ) !== -1 )
			{
				target = element ;
				nextRoute = client.route.replace( target.regexp , '' ) ;
				return false ;
			}
			return true ;
		} ) ;
	}
	
	
	if ( ! target )
	{
		if ( this.fallbackRoute )
		{
			target = this.fallbackRoute ;
		}
		else
		{
			// This is a 404
			console.log( "[routing] mapRouter 404: " , client.path , client.route ) ;
			this.errorDocumentHandler.handler( 404 , client ) ;
			return ;
		}
	}
	
	//console.log( "[mapRouter] target: " + util.inspect( target ) ) ;
	
	switch ( target.type )
	{
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
				console.log( "[routing] mapRouter 400: " , client.path , client.route , " (protocol: " + client.protocol + ", wanted: " + target.protocol + ")" ) ;
				this.errorDocumentHandler.handler( 400 , client ) ;
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
				console.log( "[routing] mapRouter 400: " , client.path , client.route , " (protocol: " + client.protocol + ", wanted: " + target.protocol + ")" ) ;
				this.errorDocumentHandler.handler( 400 , client ) ;
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
				console.log( "[routing] mapRouter 400: " , client.path , client.route ,  " (protocol: " + client.protocol + ", wanted: " + target.protocol + ")" ) ;
				this.errorDocumentHandler.handler( 400 , client ) ;
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
				console.log( "[routing] mapRouter 400: " , client.path , client.route , " (protocol: " + client.protocol + ", wanted: " + target.protocol + ")" ) ;
				this.errorDocumentHandler.handler( 400 , client ) ;
				return ;
			}
			//*/
			
			client.match = target.regexp ;
			client.route = nextRoute ;
			target.target( client ) ;
			break ;
		
		default :
			// Bad router entry
			console.log( "[routing] mapRouter - Bad router entry for path: " , client.path , client.route ) ;
			//delete this.strictRouteMap[ client.route ] ;
			break ;
	}
} ;



Router.prototype.addRoute = function addRoute( match , target , type , protocol )
{
	switch ( type )
	{
		case 'module' :
		case 'watchedModule' :
		case 'static' : 
		case 'cgi' : break ;
		default : type = 'module' ; break ;
	}
	
	switch ( protocol )
	{
		case 'http' :
		case 'ws' : 
		case 'all' : break ;
		default : protocol = 'all' ; break ;
	}
	
	
	var typeofTarget = typeof target ;
	if ( typeofTarget === 'object' ) { typeofTarget = target.constructor.name ; }
	
	switch ( typeofTarget )
	{
		case 'string' :
			target = { protocol: protocol , type: type , target: target } ;
			break ;
		
		case 'function' :
			target = { protocol: protocol , type: 'function' , target: target } ;
			break ;
		
		default :
			// Bad router entry
			console.log( "[routing] addRoute - Bad target type: " + typeofTarget ) ;
			break ;
	}
	
	
	var typeofMatch = typeof match ;
	if ( ! match ) { typeofMatch = 'fallback' ; }
	else if ( typeofMatch === 'object' ) { typeofMatch = match.constructor.name ; }
	
	switch ( typeofMatch )
	{
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
			console.log( "[routing] addRoute cannot add route of type: " + typeofMatch ) ;
			break ;
	}
	
	//console.log( "[addRoute] " + util.inspect( target ) ) ;
} ;



// Shortcuts
Router.prototype.addHttpRoute = function addHttpRoute( match , target ) { return this.addRoute( match , target , undefined , 'http' ) ; } ;
Router.prototype.addStaticRoute = function addStaticRoute( match , target ) { return this.addRoute( match , target , 'static' , 'http' ) ; } ;
Router.prototype.addCgiRoute = function addCgiRoute( match , target ) { return this.addRoute( match , target , 'cgi' , 'http' ) ; } ;
Router.prototype.addWsRoute = function addWsRoute( match , target ) { return this.addRoute( match , target , undefined , 'ws' ) ; } ;
	
Router.prototype.setLocalRootPath = function setLocalRootPath( localRootPath ) { this.localRootPath = localRootPath ; } ;
Router.prototype.setSimpleRouterIndex = function setSimpleRouterIndex( simpleRouterIndex ) { this.simpleRouterIndex = simpleRouterIndex ; } ;



Router.prototype.runModule = function runModule( client )
{
	var entry ;
	
	try {
		entry = require.main.require( client.localPath ) ;
	}
	catch ( error ) {
		console.log( "[routing] runModule cannot require '" + client.localPath + "', error: " ) ;
		//CSK.debug.dumpError( error ) ;
		console.log( error ) ;
		this.errorDocumentHandler.handler( 404 , client ) ;
		return ;
	}
	
	try {
		entry( client ) ;
	}
	catch ( error ) {
		console.log( "[routing] runModule cannot execute '" + client.localPath + "', error: " ) ;
		//CSK.debug.dumpError( error ) ;
		console.log( error ) ;
		this.errorDocumentHandler.handler( 500 , client ) ;
		return ;
	}
	
	return ;
} ;



Router.prototype.runWatchedModule = function runWatchedModule( client )
{
	var resolvedPath , entry , watcher ;
	
	try {
		resolvedPath = require.main.require.resolve( client.localPath ) ;
		
		if ( typeof this.watchedFiles[ resolvedPath ] === 'undefined' )
		{
			console.log( "[routing] New file to watch: " + resolvedPath ) ;
			
			watcher = fs.watch( resolvedPath , { persistent: false } ) ;
			
			watcher.on( 'change' , function( event , filename ) {
				console.log( "[routing] " + event + " detected on file " + filename ) ;
				delete require.main.require.cache[ resolvedPath ] ;
			} ) ;
			
			watcher.on( 'error' , function( error ) {
				console.log( "[routing] runWatchedModule error for watched file: '" + client.localPath + "', error: " ) ;
				//CSK.debug.dumpError( error ) ;
				console.log( error ) ;
			} ) ;
			
			this.watchedFiles[ resolvedPath ] = watcher ;
		}
	}
	catch ( error ) {
		console.log( "[routing] runWatchedModule cannot watch: '" + client.localPath + "', error: " ) ;
		//CSK.debug.dumpError( error ) ;
		console.log( error ) ;
		this.errorDocumentHandler.handler( 404 , client ) ;
		return ;
	}
	
	
	try {
		entry = require.main.require( client.localPath ) ;
	}
	catch ( error ) {
		console.log( "[routing] runWatchedModule cannot require: '" + client.localPath + "', error: " ) ;
		//CSK.debug.dumpError( error ) ;
		console.log( error ) ;
		this.errorDocumentHandler.handler( 404 , client ) ;
		return ;
	}
	
	
	try {
		entry( client ) ;
	}
	catch ( error ) {
		console.log( "[routing] runWatchedModule cannot execute: '" + client.localPath + "', error: " ) ;
		//CSK.debug.dumpError( error ) ;
		console.log( error ) ;
		this.errorDocumentHandler.handler( 500 , client ) ;
		return ;
	}
	
	return ;
} ;



Router.prototype.runCgi = function runCgi( client )
{
	console.log( '[routing] runCgi is HIGHLY EXPERIMENTAL!!!' ) ;
	
	var cgi , headerSent = false , headerBuffer = '' ;
	
	
	cgi = childProcess.spawn( client.localPath ) ;
	
	/*
		We should handle here:
			- Environment variable of CGI (see: http://en.wikipedia.org/wiki/Common_Gateway_Interface)
			- Send the request body to the CGI exe
	*/
	
	//cgi.stdout.pipe( client.response ) ;
	
	cgi.stdout.on( 'data' , function( data ) {
		
		console.log( '[routing] runCgi - CGI stdout: ' /*+ data*/ ) ;
		
		if ( headerSent )
		{
			client.response.write( data ) ;
			return ;
		}
		
		// This is really temporary:
		data = headerBuffer + data.toString() ;
		var index = data.indexOf( "\r\n\r\n" ) ;
		
		if ( index === -1 )
		{
			// End of header not found
			headerBuffer += data ;
			return ;
		}
		
		console.log( '[routing] runCgi - CGI headers: \n' + data.slice( 0 , index + 2 ) ) ;
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
	
	cgi.stderr.on( 'data' , function( data ) {
		console.log( '[routing] runCgi - CGI stderr: ' + data ) ;
	} ) ;
	
	cgi.on( 'exit' , function( code ) {
		console.log( '[routing] runCgi - CGI exited with code ' + code ) ;
		client.response.end() ;
	} ) ;
} ;



Router.prototype.serveStatic = function serveStatic( client )
{
	var self = this ;
	
	fs.readFile( client.localPath , function( error , data ) {
		
		if ( error )
		{
			// 404
			console.log( "[routing] serveStatic cannot read file: '" + client.localPath + "', error: " ) ;
			//CSK.debug.dumpError( error ) ;
			console.log( error ) ;
			self.errorDocumentHandler.handler( 404 , client ) ;
			return ;
		}
		
		client.response.writeHead( 200 , { 'Content-Type' : server.mimeType( client.localPath ) } ) ;
		client.response.write( data ) ;
		client.response.end() ;
	} ) ;
} ;



