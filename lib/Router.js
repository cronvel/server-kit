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
	this.treeWalk( this.tree , client ) ;
} ;



Router.prototype.treeWalk = function treeWalk( tree , client ) {
	var next ,
		part = client.pathParts[ client.walkIndex ++ ] ;

	if ( ! part ) {
		if ( tree['/'] ) {
			next = tree['/'] ;
		}
		else if ( tree['.'] ) {
			client.walkIndex -- ;
			next = tree['.'] ;
		}
		else {
			log.verbose( "not found: %s" , client.path ) ;

			// Must use ErrorDocument later
			client.response.writeHead( 404 ) ;
			client.response.end() ;
			return ;
		}
	}
	else if ( tree[ part ] ) {
		next = tree[ part ] ;
	}
	else if ( tree['*'] ) {
		next = tree['*'] ;
	}
	else if ( tree['.'] ) {
		client.walkIndex -- ;
		next = tree['.'] ;
	}
	else {
		log.verbose( "not found: %s" , client.path ) ;

		// Must use ErrorDocument later
		client.response.writeHead( 404 ) ;
		client.response.end() ;
		return ;
	}

	if ( typeof next === 'function' ) {
		next( client ) ;
	}
	else if ( next instanceof CommonRouter ) {
		next.handle( client ) ;
	}
	else {
		this.treeWalk( next , client ) ;
	}
} ;


