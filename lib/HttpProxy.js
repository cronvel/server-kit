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



const CommonHandler = require( './CommonHandler.js' ) ;
const httpServeFile = require( './httpServeFile.js' ) ;

const qs = require( 'qs-kit' ) ;
const hash = require( 'hash-kit' ) ;
const Promise = require( 'seventh' ) ;

const path = require( 'path' ) ;
const fs = require( 'fs' ) ;
const http = require( 'http' ) ;
const https = require( 'https' ) ;

const log = require( 'logfella' ).global.use( 'server-kit' ) ;



/*
	ATM, it is just a really simple proxy.
	It only supports GET method ATM.
	No header are sent to remote, but all headers are received from remote.
	If enabled, the URL and query string can be used to build up a cache.

	TODO:
		* Hooks: allowing one to transform the remote request, and another hook to transform the downstream response.
		* A query map, renaming properties
*/
function HttpProxy( params ) {
	this.cacheDirectory = params.cacheDirectory || null ;	// if set, the proxy can cache request
	this.cacheDirectoryChecked = false ;

	this.remoteProtocol = params.remoteProtocol ;
	this.remotePort = params.remotePort ;
	this.remoteHostname = params.remoteHostname ;
	this.remoteBasePath = params.remoteBasePath ;
	this.remoteBaseQuery = params.remoteBaseQuery ;

	this.upstreamHook = params.upstreamHook ;
	this.downstreamHook = params.downstreamHook ;

	this.queryOptions = params.queryOptions || {} ;

	// Default remote protocol and port
	if ( ! this.remoteProtocol && ! this.remotePort ) {
		this.remoteProtocol = 'http' ;
		this.remotePort = 80 ;
	}
	else if ( ! this.remoteProtocol ) {
		this.remoteProtocol =
			this.remotePort === 80 ? 'http' :
			this.remotePort === 443 ? 'https' :
			'http' ;
	}
	else if ( ! this.remotePort ) {
		this.remotePort =
			this.remoteProtocol === 'http' ? 80 :
			this.remoteProtocol === 'https' ? 443 :
			80 ;
	}
}

module.exports = HttpProxy ;

HttpProxy.prototype = Object.create( CommonHandler.prototype ) ;
HttpProxy.prototype.constructor = HttpProxy ;



HttpProxy.prototype.handle = async function( client ) {
	if ( ! client.pathParts && ! client.routerInit() ) { return ; }
	if ( client.method !== 'GET' ) { client.methodNotAllowed() ; return ; }

	var fingerprint , localFilePath , module_ , params , remoteFullPath ,
		remoteRequest = {
			query: Object.assign( {} , client.query , this.remoteBaseQuery ) ,
			path: client.remainingPath
		} ;

	//log.hdebug( "Proxy -- remotePath: %s , incomming query: %Y" , remotePath , client.query ) ;


	// Call the upstream hook to modify few params, should come BEFORE trying the cache
	if ( this.upstreamHook ) { this.upstreamHook( remoteRequest ) ; }
	remoteFullPath = path.join( this.remoteBasePath , remoteRequest.path ) + '?' + qs.stringify( remoteRequest.query , this.queryOptions ) ;


	// First, try the cache...
	if ( this.cacheDirectory ) {
		fingerprint = hash.fingerprint(
			{
				remoteProtocol: this.remoteProtocol ,
				remoteHostname: this.remoteHostname ,
				remoteBasePath: this.remoteBasePath ,
				remotePath: remoteRequest.path ,
				remoteQuery: remoteRequest.query
			} ,
			'sha256'
		) ;

		localFilePath = path.join( this.cacheDirectory , fingerprint ) ;
		//log.hdebug( "Proxy [cache] -- fingerprint: %s , localFilePath: %s" , fingerprint , localFilePath ) ;

		try {
			await fs.promises.access( localFilePath , fs.constants.R_OK ) ;
			//log.hdebug( "Proxy [cache hit]" ) ;
			client.response.setHeader( 'X-Server-Kit-Proxy-Cache' , 'hit' ) ;
			return httpServeFile( localFilePath , client ) ;
		}
		catch ( error ) {
			//log.hdebug( "Proxy [cache miss]" ) ;

			if ( ! this.cacheDirectoryChecked ) {
				await fs.promises.access( this.cacheDirectory , fs.constants.X_OK )
					.catch( () => fs.promises.mkdir( this.cacheDirectory , { recursive: true } ) )
					.then( () => this.cacheDirectoryChecked = true ) ;
			}
		}
	}


	// Cache miss, now we have to perform the actual query
	client.response.setHeader( 'X-Server-Kit-Proxy-Cache' , 'miss' ) ;

	module_ =
		this.remoteProtocol === 'http' ? http :
		this.remoteProtocol === 'https' ? https :
		http ;

	params = {
		//protocol: this.remoteProtocol ,
		port: this.remotePort ,
		hostname: this.remoteHostname ,
		path: remoteFullPath ,
		method: 'GET'
	} ;

	await this.remoteRequest( module_ , params , client , localFilePath ) ;
} ;



HttpProxy.prototype.remoteRequest = function( module_ , params , client , localFilePath = null ) {
	var localFileStream ,
		promise = new Promise() ;

	//log.hdebug( "Remote request: %Y" , params ) ;

	if ( localFilePath ) {
		localFileStream = fs.createWriteStream( localFilePath ) ;
	}

	var request = module_.request( params , remoteResponse => {
		//let totalSize = 0 ;
		//log.hdebug( "Remote response -- status: %s , headers: %Y" , remoteResponse.statusCode , remoteResponse.headers ) ;

		client.response.writeHead( remoteResponse.statusCode , remoteResponse.headers ) ;

		remoteResponse.on( 'data' , chunk => {
			//totalSize += chunk.length ;
			//log.hdebug( "transfering %kB , data: %Y" , chunk.length , chunk ) ;
			client.response.write( chunk ) ;
			if ( localFileStream ) { localFileStream.write( chunk ) ; }
		} ) ;

		remoteResponse.on( 'end' , () => {
			//log.hdebug( "No more data in remoteResponse. Total size: %kB" , totalSize ) ;
			client.response.end() ;
			if ( localFileStream ) { localFileStream.end() ; }
			promise.resolve() ;
		} ) ;
	} ) ;

	request.on( 'error' , error => {
		//log.error( "problem with request: %E" , error ) ;
		promise.reject( error ) ;
	} ) ;

	// Write data to request body (only GET request ATM)
	//request.write( body ) ;
	request.end() ;

	return promise ;
} ;

