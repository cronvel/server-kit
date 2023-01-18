#! /usr/bin/env node

"use strict" ;



const fs = require( 'fs' ) ;
const serverKit = require( '..' ) ;
const Router = serverKit.Router ;
const FileRouter = serverKit.FileRouter ;

const Logfella = require( 'logfella' ) ;
//Logfella.global.configure( { minLevel: 'info' } ) ;
Logfella.global.configure( { minLevel: 'verbose' } ) ;

const log = Logfella.global.use( 'server-kit' ) ;



var port = 8080 ;
var root = process.cwd() ;
var listDirectory = false ;



// Parse command line arguments

var optionName = null ;
for ( let index = 2 ; index < process.argv.length ; index ++ ) {
	let arg = process.argv[ index ] ;

	if ( arg.startsWith( '--' ) ) {
		optionName = arg.slice( 2 ) ;

		switch ( optionName ) {
			case 'list' :
				listDirectory = true ;
				optionName = null ;
				break ;
			default :
				break ;
		}
	}
	else {
		switch ( optionName ) {
			case 'port' :
				port = + arg || 8080 ;
				break ;
			case 'root' :
				root = fs.realpathSync( arg ) ;
				break ;
			default :
				break ;
		}

		optionName = null ;
	}
}



console.log( "Simple file router.\nUsage is: server-kit-file-router [--port <port>] [--root <path>] [--list]" ) ;
console.log( "Port:" , port , "\nRoot path:" , root , "\nList directory:" , listDirectory ) ;



function slash( client ) {
	var body = "<h1>You're on /</h1><p>You should add something after that slash, bro! ;)</p>" ;

	try {
		client.response.writeHead( 200 ) ;
	}
	catch ( error ) {}

	try {
		client.response.end( body ) ;
	}
	catch ( error ) {}
}



var router ;

if ( listDirectory ) {
	router = new FileRouter( root , { directoryHtml: true } ) ;
}
else {
	router = new Router( {
		"/": slash ,
		".": new FileRouter( root )
	} ) ;
}



serverKit.createServer(
	{
		port ,
		http: true ,
		verbose: true ,
		catchErrors: true
	} ,
	client => router.handle( client )
) ;

