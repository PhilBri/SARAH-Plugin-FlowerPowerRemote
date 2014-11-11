/*__________________________________________________
|              Flower-Power V 1.0                   |
|         (Lib for FlowerPowerRemote)               |
|                                                   |
| Author : Phil Bri ( 13/07/2014 )                  |
| Description :                                     |
|    Parrot Flower-Power Plugin for SARAH project   |
|    (See http://encausse.wordpress.com/s-a-r-a-h/) |
|___________________________________________________|
*/
var util 			= require('util'),
	EventEmitter 	= require('events').EventEmitter,
	request 		= require('request'),
	access_token,
	expires_in,
	refresh_token;

const BASE_URL 		= 'https://apiflowerpower.parrot.com';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var FlowerPower = function ( args ) {
	EventEmitter.call( this );
	this.authenticate ( args );
};

util.inherits ( FlowerPower, EventEmitter );

FlowerPower.prototype.authenticate = function ( args, callback ) {
	var form = {
		username		: args.username,
		password		: args.password,
		client_id		: args.client_id,
		client_secret	: args.client_secret,
		grant_type		: 'password',
  	};

	var url = util.format ( '%s/user/v1/authenticate', BASE_URL );

	request ({	url 	: url,
				method	: "POST",
				form 	: form,
	}, function ( err, response, body ) {
		
		if ( err || response.statusCode != 200 ) {
			//throw "FlowerPower => Erreur d'Authentification : (Code " + response.statusCode + ')';
			this.emit ( 'error', response.statusCode, 'Authentification', err );
		}
		else {
			body = JSON.parse( body );

			access_token 	= body.access_token;
			expires_in 		= body.expires_in;
			refresh_token 	= body.refresh_token;
			this.emit ( 'authenticated', access_token );
		}

		if ( callback ) {
			return callback ( access_token );
		}

		return this;

	}.bind ( this ));

	return this;
};

FlowerPower.prototype.getGarden = function ( callback ) {

	// Wait until authenticated.
	if ( ! access_token ) {
		return this.on ( 'authenticated', function () {
			this.getGarden ( callback );
		});
	}

	// var url = util.format ('%s/sensor_data/v2/sync?include_s3_urls=1', BASE_URL);
	var url = util.format ( '%s/sensor_data/v3/sync', BASE_URL );

	var headers = {
		'Authorization': 'Bearer ' + access_token,
	};

	request ({
		url 		: url,
		method 	: "GET",
		headers 	: headers,
	}, function ( err, response, body ) {

		body = JSON.parse ( body );
		this.emit ( 'have-garden', err, body.locations, body.sensors );

		if ( callback )
			return callback ( err, body.locations, body.sensors );

		return this;

	}.bind ( this ));

	return this;
};

FlowerPower.prototype.getStatus = function ( callback ) {

	// Wait until authenticated.
	if ( !access_token ) {
		return this.on ( 'authenticated', function () {
			this.getSamples ( options, callback );
		});
	}

	var url = util.format ( '%s/sensor_data/v3/garden_locations_status', BASE_URL );

	var headers = {
		'Authorization' : 'Bearer ' + access_token
	};

	request ({	url 	: url,
				method	: 'GET',
				headers	: headers,

	}, function ( err, response, body ) {

		body = JSON.parse ( body );
		this.emit ( 'have-status', err, body.locations, body.sensors );

		if (callback) {
			return callback ( err, body.locations, body.sensors );
		}

		return this;
	}.bind ( this ));

	return this;
};

module.exports = FlowerPower;
