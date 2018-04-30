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



var Router = require( './Router.js' ) ;

var log = require( 'logfella' ).global.use( 'server-kit' ) ;



/*
	This router is like the normal Router, but skip a basePath
*/

function BaseRouter( basePath , tree = {} ) {
	this.basePathParts = Array.isArray( basePath ) ? basePath : basePath.split( '/' ).filter( part => part ) ;
	this.tree = tree ;
}

module.exports = BaseRouter ;

BaseRouter.prototype = Object.create( Router.prototype ) ;
BaseRouter.prototype.constructor = BaseRouter ;



BaseRouter.prototype.handle = function handle( client ) {
	if ( ! client.pathParts && ! client.routerInit() ) { return ; }

	var i , iMax ;

	if ( client.pathParts.length - client.walkIndex < this.basePathParts.length ) {
		log.verbose( "not found: %s" , client.path ) ;
		return client.notFound() ;
	}

	for ( i = 0 , iMax = this.basePathParts.length ; i < iMax ; i ++ ) {
		if ( this.basePathParts[ i ] !== client.pathParts[ client.walkIndex ++ ] ) {
			log.verbose( "not found: %s" , client.path ) ;
			return client.notFound() ;
		}
	}

	return this.treeWalk( client , this.tree ) ;
} ;

