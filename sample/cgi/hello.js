#!/usr/bin/env node

"use strict" ;

var content = "Hello world!" ;

console.log( "HTTP/1.1 200 OK\r" ) ;
console.log( "Server: Bob\r" ) ;
console.log( "Content-Length: " + content.length + "\r" ) ;
console.log( "Connection: Close\r" ) ;
console.log( "\r" ) ;

