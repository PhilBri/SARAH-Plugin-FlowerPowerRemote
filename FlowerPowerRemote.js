/*__________________________________________________
|              FlowerPowerRemote V 1.0              |
|                                                   |
| Author : Phil Bri ( 13/07/2014 )                  |
| Description :                                     |
|    Parrot Flower-Power Plugin for SARAH project   |
|    (See http://encausse.wordpress.com/s-a-r-a-h/) |
|___________________________________________________|
*/
var FlowerPower 	= require ( './lib/Flower-Power.js' ),
	fs 				= require ( 'fs' ),
	api,
	config,
	myPlants 		= {},
	myPlantData		= {},
	myPlantStatus 	= {},
	access;

var flowerpowerLog = function ( txt, log, callback ) {

	console.log ( 'FlowerPowerRemote => ' + log + ' = ' + txt );
	if ( callback ) { callback ({ 'tts' : txt }) }
};

var getData = function ( data ) {

	var str;
	var myInstruc = myPlantData[data.name][data.mode];

	if ( myInstruc != undefined && myInstruc.instruction_key == data.mode + '_unavailable' )
		return 'Paramètre désactivé, modifiez les réglages ';

	switch ( data.mode ) {
		case 'battery_level' :
			myInstruc = myPlantStatus[data.name][data.mode];
			temp = myInstruc.level_percent.toFixed ( 0 );
		break;
		case 'light' :
			var temp = ( myInstruc.gauge_values.current_value * 53.93 ).toFixed ( 0 );
		break;
		default :
			var temp = myInstruc.gauge_values.current_value.toFixed ( 1 );
		break;
	}

	temp 	= 	temp.replace ( '.', ',' );
	str		= 	( data.ttsAction ).replace ( 'X', data.gender );
	str 	= 	str.replace ( 'Y', ( data.name ).toString());
	str 	= 	str.replace ( 'Z', temp );
	return str;
};

exports.init = function ( SARAH ) {

	config 	= SARAH.ConfigManager.getConfig ();
	config 	= config.modules.flowerpowerremote;  

	api = new FlowerPower ({	username 		: config.username,
								password 		: config.password,
								client_id 		: config.client_id,
								client_secret 	: config.client_secret,
								grant_type		: 'password' });

	api.on ( 'error', function ( err, e ) { console.log ( 'Erreur [' + err + ']', e ); SARAH.speak ('erreur flower power') });

	api.on ( 'authenticated', function ( token ) {

		flowerpowerLog ( 'Ok', 'Authentification' );
		access = token;

		api.getGarden ( function ( err, locations, sensors ) {

			if ( err ) throw "Error";

			var	config_xml 	= '';
			locations.forEach ( function ( plant ) {

				config_xml	+= 	'\r\t\t\t\t\t\t\t<item>' + 	plant.plant_nickname
							+ 	'\r\t\t\t\t\t\t\t\t<tag>out.action.name="' + plant.plant_nickname + '";</tag>'
							+	'\r\t\t\t\t\t\t\t</item>\r\n';

				flowerpowerLog ( 'OK', plant.plant_nickname );
				myPlants[plant.plant_nickname] = plant.sensor_serial;
			});

			var file 	= 	__dirname + "\\" + 'FlowerPowerRemote.xml';
			var regexp 	= 	new RegExp ( '§[^§]+§', 'gm' );
			var xml  	= 	fs.readFileSync ( file, 'utf8' );
				xml    	= 	xml.replace ( regexp, "§ -->\n" + config_xml + "<!-- §" );

			fs.writeFileSync 	( file, xml, 'utf8' );
			flowerpowerLog 		( Object.keys(myPlants).length , 'Plantes trouvées' );
			flowerpowerLog 		( 'OK', 'Mise à jour fichier FlowerPowerRemote.xml' );
		});
	});

	api.on ( "have-garden", function () {

		api.getStatus ( function ( err, locations, status ) {

			if ( err ) throw "Error";

			var keys = Object.keys ( myPlants );
			var ks = Object.keys ( locations );

			for ( var i = 0; i < keys.length; i++ )
				myPlantData[keys[i]] = locations[ks[i]];
		
			ks = Object.keys ( status )
			for ( var i = 0; i < keys.length; i++ )
				myPlantStatus[keys[i]] = status[ks[i]];

		});
	});
}

exports.action = function ( data , callback , config , SARAH ) {
	
	if ( data.mode == 'nbPlants' )
		return flowerpowerLog ( Object.keys ( myPlants ).length + data.ttsAction, data.mode, callback );

	if ( data.mode == 'plantNames' ) {
		var str = 'Les noms des plantes sont '
		for ( var key in myPlants )
			str = str + key + '; ';
		return flowerpowerLog ( str, data.mode, callback )
	}

	flowerpowerLog ( getData ( data ), data.mode, callback );
}
