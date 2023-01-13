#! /usr/bin/env node

"use strict" ;



const serverKit = require( '..' ) ;
const Router = serverKit.Router ;
const FileRouter = serverKit.FileRouter ;

const log = require( 'logfella' ).global.use( 'HTTP' ) ;



// Set the port, get it from command line if necessary
var port = 8080 ;

if ( process.argv.length > 2 ) {
    port = + process.argv[ 2 ] || 8080 ;
}



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



//var router = new FileRouter( __dirname ) ;
var router = new Router( {
    "/": slash ,
    ".": new FileRouter( __dirname )
} ) ;



serverKit.createServer( {
	port , http: true , verbose: true , catchErrors: false
} , async ( client ) => {
    log.info( "Starting handler" ) ;
    await router.handle( client ) ;
    log.info( "Done handler" ) ;
} ) ;

