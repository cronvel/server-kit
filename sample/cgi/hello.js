#!/usr/bin/env node

"use strict" ;

var content = "Hello world!\nHello world!\nHello world! Hello world! Hello world!\nHello world!" ;

console.log( "Status: 200 Okay" ) ;
console.log( "Server: Bob" ) ;
console.log( "Content-Length: " + content.length + "" ) ;
console.log( "Connection: Close" ) ;
console.log() ;
console.log( content ) ;

