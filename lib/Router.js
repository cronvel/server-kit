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



var CommonRouter = require( './CommonRouter.js' ) ;
//var ErrorDocument = require( './ErrorDocument.js' ) ;

var log = require( 'logfella' ).global.use( 'server-kit' ) ;



function Router( tree = {} ) {
	this.tree = tree ;
}

module.exports = Router ;

Router.prototype = Object.create( CommonRouter.prototype ) ;
Router.prototype.constructor = Router ;



Router.prototype.handle = function handle( client ) {
	if ( ! client.pathParts && ! client.routerInit() ) { return ; }
	return this.treeWalk( client , this.tree ) ;
} ;



Router.prototype.treeWalk = async function treeWalk( client , pointer , overidePart , notFound = 'notFound' ) {
	if ( this.isEndPoint( pointer ) ) {
		return this.execEndPoint( client , pointer ) ;
	}

	// There are a special/error handler, update the client NOW
	if ( pointer['!!'] ) {
		client.specialHandlers = pointer['!!'] ;
	}
	else if ( pointer['!'] ) {
		if ( ! client.specialHandlers ) {
			client.specialHandlers = pointer['!'] ;
		}
		else if ( client.specialHandlers.__mixed ) {
			Object.assign( client.specialHandlers , pointer['!'] ) ;
		}
		else {
			client.specialHandlers = Object.assign( { __mixed: true } , client.specialHandlers , pointer['!'] ) ;
		}
	}

	if ( pointer['^'] ) {
		if ( ! client.middlewares ) { client.middlewares = [] ; }
		if ( Array.isArray( pointer['^'] ) ) { client.middlewares.push( ... pointer['^'] ) ; }
		else { client.middlewares.push( pointer['^'] ) ; }
	}

	var nextPointer ,
		part = overidePart || client.pathParts[ client.walkIndex ++ ] ;

	if ( ! part ) {
		if ( pointer['/'] ) {
			nextPointer = pointer['/'] ;
		}
		else if ( pointer['.'] ) {
			client.walkIndex -- ;
			nextPointer = pointer['.'] ;
		}
		else {
			log.verbose( "%s: %s" , notFound , client.path ) ;
			//return client[ notFound ]() ;
			return this.execEndPoint( client , client[ notFound ] ) ;
		}
	}
	else if ( pointer[ part ] ) {
		nextPointer = pointer[ part ] ;
	}
	else if ( pointer['*'] ) {
		nextPointer = pointer['*'] ;
	}
	else if ( pointer['.'] ) {
		client.walkIndex -- ;
		nextPointer = pointer['.'] ;
	}
	else {
		log.verbose( "%s: %s" , notFound , client.path ) ;
		//return client[ notFound ]() ;
		return this.execEndPoint( client , client[ notFound ] ) ;
	}

	return this.treeWalk( client , nextPointer ) ;
} ;

