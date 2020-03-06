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



exports.Server = require( './Server.js' ) ;
exports.Client = require( './Client.js' ) ;

exports.CommonHandler = require( './CommonHandler.js' ) ;

exports.Router = require( './Router.js' ) ;
exports.BaseRouter = require( './BaseRouter.js' ) ;
exports.CaptureRouter = require( './CaptureRouter.js' ) ;
exports.ProtocolRouter = require( './ProtocolRouter.js' ) ;
exports.HostnameRouter = require( './HostnameRouter.js' ) ;
exports.MethodRouter = require( './MethodRouter.js' ) ;
exports.FileRouter = require( './FileRouter.js' ) ;
exports.File = require( './File.js' ) ;
exports.ModuleRouter = require( './ModuleRouter.js' ) ;
exports.CgiRouter = require( './CgiRouter.js' ) ;

exports.Middlewares = require( './Middlewares.js' ) ;
exports.CorsMiddleware = require( './CorsMiddleware.js' ) ;

exports.ErrorDocument = require( './ErrorDocument.js' ) ;

exports.mimeType = require( './mimeType.js' ) ;

exports.httpServeFile = require( './httpServeFile.js' ) ;
exports.runModule = require( './runModule.js' ) ;
exports.runCgi = require( './runCgi.js' ) ;



// Backward compatitbility
exports.createServer = ( ... args ) => new exports.Server( ... args ) ;

// Logfella tuning
exports.setLogLevel = ( minLevel , maxLevel ) => {
	var log = require( 'logfella' ).global ;
	log.setDomainConfig( 'server-kit' , { minLevel , maxLevel } ) ;
} ;

