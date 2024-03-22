const _ = require('lodash');
const es = require('elasticsearch');
const logger = require( 'pelias-logger' ).get( 'api' );
const PeliasParameterError = require('../sanitizer/PeliasParameterError');
const PeliasTimeoutError = require('../sanitizer/PeliasTimeoutError');
const OpenLocationCode = require('open-location-code').OpenLocationCode; 

const openLocationCode = new OpenLocationCode();


function isParameterError(error) {
  return error instanceof PeliasParameterError;
}

function isTimeoutError(error) {
  return error instanceof PeliasTimeoutError ||
         error instanceof es.errors.RequestTimeout;
}

function isElasticsearchError(error) {
  const knownErrors = [ es.errors.NoConnections,
                        es.errors.ConnectionFault ];

  return knownErrors.some(function(esError) {
    return error instanceof esError;
  });
}

function sendJSONResponse(req, res, next) {

  // do nothing if no result data set
  const geocoding = _.get(res, 'body.geocoding');

  if (!_.isPlainObject(geocoding)) {
    return next();
  }

  const errors = geocoding.errors || [];

  const errorCodes = errors.map(function(error) {
    if (isParameterError(error)) {
      return 400;
    } else if (isTimeoutError(error) || isElasticsearchError(error)) {
      return 502;
    } else {
      return 500;
    }
  });

  const statusCode = Math.max(200, ...errorCodes);

  // respond
  const body = res.body

  // const content = _.transform(res.body, (result, value, key) => {
  //   result['licence'] = 'GTEL MAPS'
    
  //   // Check request valid
  //   result['status'] = 'OK'

  //   // Check request invalid
  //   if(1 === 1){
  //     result['status'] = 'INVALID_REQUEST'
  //     result['error_message'] = res.body
  //   }

  // }, {})

  let content = {
    licence: 'GTEL MAPS'
  }

  content['status'] = 'OK'

  if(1 === 0){
    content['status'] = 'INVALID_REQUEST'
    content['error_message'] = _.upperFirst(_.get(res.body, 'geocoding.errors')?.join(', '))
    content['results'] = []
    return res.status(statusCode).json(content);
  }

  content['results'] = _.get(res.body, 'features', [])
  content['results'] = content['results'].map(feature => {
      // content['plus_code'] = {
  //   'global_code': openLocationCode.encode(47.365590, 8.524997)
  // }
  
    return {
      address_components: _.get(feature, 'properties.addendum.pelias.addressComponents', []),
      formatted_address: _.get(feature, 'properties.name'),
      geometry: {
        location: {
          lat:  _.get(feature, 'geometry.coordinates.name.1'),
          lng: _.get(feature, 'geometry.coordinates.name.0')
        },
        viewport: []

      },
      ...feature,
    }
  })


  return res.status(statusCode).json(content);
  // return res.status(statusCode).json(body);

}

module.exports = sendJSONResponse;
