#! /usr/bin/env node
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



const serverKit = require( '..' ) ;
const Router = serverKit.Router ;
const BaseRouter = serverKit.BaseRouter ;
const ProtocolRouter = serverKit.ProtocolRouter ;
const HostnameRouter = serverKit.HostnameRouter ;
const MethodRouter = serverKit.MethodRouter ;
const CaptureRouter = serverKit.CaptureRouter ;
const FileRouter = serverKit.FileRouter ;
const File = serverKit.File ;
const ProxyRouter = serverKit.ProxyRouter ;
const ModuleRouter = serverKit.ModuleRouter ;
const CgiRouter = serverKit.CgiRouter ;
const CorsMiddleware = serverKit.CorsMiddleware ;

const log = require( 'logfella' ).global.use( 'sample' ) ;



// Set the port, get it from command line if necessary
const port = 8080 ;

if ( process.argv.length > 2 ) {
	port = process.argv[ 2 ] ;
}



function slash( client ) {
	client.response.end( "slash: " + client.pathParts.slice( client.walkIndex ).join( '/' ) ) ;
}

function article( client ) {
	client.response.end( "article: " + client.pathParts.slice( client.walkIndex ).join( '/' ) ) ;
}

function userList( client ) {
	client.response.end( "users: Bob, Ben, Bill, Boris." ) ;
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

function slowPage( client ) {
	return new Promise( resolve => {
		setTimeout( () => {
			client.response.end( "slow page! " + client.pathParts.slice( client.walkIndex ).join( '/' ) ) ;
			resolve() ;
		} , 2000 ) ;
	} ) ;
}

function wild( client ) {
	client.response.end( "wild: " + client.pathParts.slice( client.walkIndex ).join( '/' ) ) ;
}

function fallback( client ) {
	client.response.end( "fallback: " + client.pathParts.slice( client.walkIndex ).join( '/' ) ) ;
}

function getRes( client ) {
	client.response.end( "GET res" ) ;
}

function postRes( client ) {
	client.response.end( "POST res" ) ;
}

function getLocalhost( client ) {
	client.response.end( "get localhost" ) ;
}

function getLoopback( client ) {
	client.response.end( "get loopback" ) ;
}

function upgrade( client ) {
	console.log( "upgrade" ) ;
	client.response.accept( true ) ;
}

function ws( client ) {
	console.log( "ws" ) ;
	client.websocket.on( 'message' , ( message ) => {
		if ( typeof message !== 'string' ) { message = '' + message ; }
		client.websocket.send( message.split( '' ).reverse().join( '' ) ) ;
	} ) ;
}

function notFound( client ) {
	var body = "<h1>Hey! Whatcha ya da'ing?</h1>" ;
	
	try {
		client.response.writeHead( 404 , "Whatcha ya da'ing?" ) ;
	}
	catch ( error ) {}
	
	try {
		client.response.end( body ) ;
	}
	catch ( error ) {}
}

function notFound2( client ) {
	var body = "<h1>Arya craiz'?</h1>" ;
	
	try {
		client.response.writeHead( 404 , "Arya craiz'?" ) ;
	}
	catch ( error ) {}
	
	try {
		client.response.end( body ) ;
	}
	catch ( error ) {}
}

async function loggerMiddleware( client , next ) {
	log.warning( "This is the logger middleware! starting now" ) ;
	await next() ;
	log.warning( "Logger middleware ending now" ) ;
}

async function bobMiddleware( client , next ) {
	client.response.setHeader( 'bob' , 'Bob!' ) ;
	log.info( "Bob?" ) ;
	await next() ;
	log.info( "Bob!" ) ;
}



var router = new Router( {
	"^": [
		new CorsMiddleware() ,
		loggerMiddleware ,
		bobMiddleware
	] ,
	//"/": slash ,
	"/": new File( __dirname + '/dummy/hello.js' ) ,
	article: article ,
	user: {
		"/" : userList ,
		".": new CaptureRouter( 'userId' , {
			"^": loggerMiddleware ,
			"/": user ,
			profile: userProfile
		} ) ,
	} ,
	path: {
		to: {
			page: pathToPage ,
			"slow-page": slowPage ,
			"!": {
				notFound: notFound2
			}
		}
	} ,
	dynamic: new ProtocolRouter( {
		http: new File( __dirname + '/dummy/hello.js' ) ,
		"http.upgrade": upgrade ,
		ws: ws
	} ) ,
	res: new MethodRouter( {
		GET: getRes ,
		POST: postRes
	} ) ,
	dom: new HostnameRouter( {
		localhost: getLocalhost ,
		"127.0.0.1": getLoopback
	} ) ,
	files: new FileRouter( __dirname ) ,
	hello: new File( __dirname + '/dummy/hello.js' ) ,
	proxy: new ProxyRouter( {
		cacheDirectory: __dirname + '/proxy-cache' ,
		remoteProtocol: 'http' ,
		remoteHostname: 'texttospeech.responsivevoice.org' ,
		remoteBasePath: '/v1/text:synthesize' ,
		remoteBaseQuery: {
			engine: 'g1' ,
			name: '' ,
			key: 'thekey'
		}
	} ) ,
	modules: new ModuleRouter( __dirname + '/dummy' ) ,
	cgi: new CgiRouter( __dirname + '/cgi' ) ,
//	"*": wild ,
//	".": fallback ,
	"!!": {
		notFound: notFound
	}
} ) ;

//router = new BaseRouter( '/inside/www' , router ) ;


serverKit.createServer( {
	port: port , http: true , ws: true , verbose: true , catchErrors: false
} , async ( client ) => {
	log.info( "Starting handler" ) ;
	await router.handle( client ) ;
	log.info( "Done handler" ) ;
} ) ;

