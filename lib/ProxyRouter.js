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
const path = require( 'path' ) ;

const log = require( 'logfella' ).global.use( 'server-kit' ) ;



function ProxyRouter( params ) {
	this.cacheDirectory = params.cacheDirectory ;
	this.remoteBaseUrl = params.remoteBaseUrl ;
	this.remoteBaseQuery = params.remoteBaseQuery ;
	this.queryOptions = params.queryOptions || {} ;
}

module.exports = ProxyRouter ;

ProxyRouter.prototype = Object.create( CommonHandler.prototype ) ;
ProxyRouter.prototype.constructor = ProxyRouter ;



ProxyRouter.prototype.handle = function( client ) {
	if ( ! client.pathParts && ! client.routerInit() ) { return ; }

	var remotePath = path.join( ... client.pathParts ) ,
		remoteQuery = Object.assign( {} , client.query , this.remoteBaseQuery ) ,
		remotePartialUrl = remotePath + '?' + qs.stringify( remoteQuery , this.queryOptions ) ,
		fingerprint = hash.fingerprint( { remotePath , remoteQuery } , 'sha256' ) ,
		remoteUrl =
			this.remoteBaseUrl
			+ ( this.remoteBaseUrl[ this.remoteBaseUrl.length - 1 ] === '/' || remotePartialUrl[ 0 ] === '/' ? '' : '/' )
			+ remotePartialUrl ;

	log.hdebug( "Proxy -- remotePath: %s , query: %Y , remoteQuery: %Y , remotePartialUrl: %s , remoteUrl: %s , fingerprint: %s" , remotePath , client.query , remoteQuery , remotePartialUrl , remoteUrl , fingerprint ) ;

	//return httpServeFile( path.join( this.cacheBasePath , client.remainingPath ) , client ) ;
} ;

