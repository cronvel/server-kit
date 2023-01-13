#! /usr/bin/env node

"use strict" ;



const fs = require( 'fs' ) ;
const serverKit = require( '..' ) ;
const Router = serverKit.Router ;
const FileRouter = serverKit.FileRouter ;



var port = + process.argv[ 2 ] || 8080 ;
var root = process.argv[ 3 ] ? fs.realpathSync( process.argv[ 3 ] ) : process.cwd() ;



console.log( "Simple file router.\nUsage is: server-kit-file-router [port] [root-path]" ) ;
console.log( "Port:" , port , "\nRoot path:" , root ) ;



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
    ".": new FileRouter( root )
} ) ;



serverKit.createServer( {
	port , http: true , verbose: true , catchErrors: false
} , async ( client ) => {
    await router.handle( client ) ;
} ) ;

