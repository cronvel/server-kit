#! /usr/bin/env node
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



var serverKit = require( '..' ) ;
var Router = serverKit.Router ;
var CaptureRouter = serverKit.CaptureRouter ;
var FileRouter = serverKit.FileRouter ;
var ModuleRouter = serverKit.ModuleRouter ;
var CgiRouter = serverKit.CgiRouter ;



// Set the port, get it from command line if necessary
var port = 8080 ;

if ( process.argv.length > 2 ) {
	port = process.argv[ 2 ] ;
}



function slash( client ) {
	client.response.end( "slash: " + client.pathParts.slice( client.walkIndex ).join( '/' ) ) ;
}

function article( client ) {
	client.response.end( "article: " + client.pathParts.slice( client.walkIndex ).join( '/' ) ) ;
}

function user( client ) {
	client.response.end( "user: " + client.capture.userId + ' -- ' + client.pathParts.slice( client.walkIndex ).join( '/' ) ) ;
}

function userProfile( client ) {
	client.response.end( "userProfile: " + client.capture.userId + ' -- ' + client.pathParts.slice( client.walkIndex ).join( '/' ) ) ;
}

function pathToPage( client ) {
	client.response.end( "path/to/page: " + client.pathParts.slice( client.walkIndex ).join( '/' ) ) ;
}

function wild( client ) {
	client.response.end( "wild: " + client.pathParts.slice( client.walkIndex ).join( '/' ) ) ;
}

function fallback( client ) {
	client.response.end( "fallback: " + client.pathParts.slice( client.walkIndex ).join( '/' ) ) ;
}



var router = new Router( {
	"/": slash ,
	article: article ,
	user: new CaptureRouter( 'userId' , {
		"/": user ,
		profile: userProfile
	} ) ,
	path: {
		to: {
			page: pathToPage ,
		}
	} ,
	files: new FileRouter( __dirname ) ,
	modules: new ModuleRouter( __dirname + '/dummy' ) ,
	cgi: new CgiRouter( __dirname + '/cgi' ) ,
//	"*": wild ,
	".": fallback ,
} ) ;



serverKit.createServer( {
	port: port , http: true , verbose: true , catchErrors: false
} , ( client ) => {

	if ( client.type !== 'http' ) {
		client.response.writeHeader( 400 ) ;
		client.response.end( "This server does not handle " + client.type ) ;
		return ;
	}
	
	router.handle( client ) ;
} ) ;
