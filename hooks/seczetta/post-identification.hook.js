/**
 * SecZetta integration example
 * 
 * This code is provided as a sample integration with SecZetta. Customize to fit your needs.
 * 
 * @module integrations/seczetta
 */

const axios = require("axios");
const URL = require("url").URL;

// seczetta config
const config = {
    SECZETTA_API_KEY: '[seczetta API Key]',
    SECZETTA_BASE_URL: 'https://[seczetta URL]/api',
    SECZETTA_ATTRIBUTE_ID: '[seczetta attribute ID for email]',
    SECZETTA_PROFILE_TYPE_ID: '[seczetta people profile type ID]',
    SECZETTA_ALLOWABLE_RISK: 3,
    SECZETTA_MAXIMUM_ALLOWED_RISK: 6,
    SECZETTA_AUTHENTICATE_ON_ERROR: true,
    SECZETTA_RISK_KEY: 'overall_score'
}

/** This function will be called from the Post identification hook in a blocking manner.
 *
 * @param {Object}   args                                         Input arguments
 * @param {Object}   args.application                             Application related information
 * @param {string}   args.application.name                        Name
 * @param {string}   args.application.client_id                   OAuth client ID
 *
 * @param {Object}   args.oidc_context                            Information about the originating OpenID Connect request
 * @param {string[]} args.oidc_context.acr_values                 ACR values
 * @param {string[]} args.oidc_context.ui_locales                 UI locales
 *
 * @param {Object}   args.customer                                Customer related information
 * @param {string}   args.customer.ip_address                     HTTP client IP coming from the X-Forwarded-For header
 * @param {string[]} args.customer.store                          ID of store containing the customer
 * @param {string[]} args.customer.info                           map holding stored information about the user
 * @param {string}   args.customer.info.id                        ID of the customer
 * @param {Object[]} args.customer.groups                         List of groups the customer is the members of
 * @param {string}   args.customer.location.city                  City of the customer
 * @param {string}   args.customer.location.state                 State of the customer
 * @param {string}   args.customer.location.country               Country of the customer
 * @param {string}   args.customer.location.country_code          Country code of the customer
 * @param {string}   args.customer.location.coordinates.latitude  Latitude coordinate of the customer
 * @param {string}   args.customer.location.coordinates.longitude Longitude coordinate of the customer
 *
 * @param {Object[]} args.authenticators                          List of enrolled authenticators
 * @param {string[]} args.requested_scopes                        Scopes requested in the originating OIDC auth request
 * @param {Object}   args.session                                 Session store
 * @param {Object}   args.continue_context                        Continue context
 *
 * @param {Object}   args.continue_request_parameters               Continue request parameters
 * @param {string}   args.continue_request_parameters.callback_url  Callback url to use after a continue call
 * @param {string}   args.continue_request_parameters.state         State parameter to use after a continue call
 * @param {postIdentificationCallback} callback
 * @param {denyRequestCallback} deny
 */
module.exports = async function({ application, oidc_context, customer, authenticators, requested_scopes, session, continue_context, continue_request_parameters }, callback, deny) {
    // ensure we have proper configuration
    if (!config.SECZETTA_API_KEY || !config.SECZETTA_BASE_URL || !config.SECZETTA_ATTRIBUTE_ID || !config.SECZETTA_PROFILE_TYPE_ID || !config.SECZETTA_ALLOWABLE_RISK || !config.SECZETTA_MAXIMUM_ALLOWED_RISK) {
        console.log("missing required configuration, skipping");
        deny(new DenyRequest("missing required configuration, skipping", ""));
        return
    }

    let uid = customer.info.userName
    let attributeId = config.SECZETTA_ATTRIBUTE_ID;
    let profileTypeId = config.SECZETTA_PROFILE_TYPE_ID;
    const profileRequestUrl = new URL('/api/advanced_search/run', config.SECZETTA_BASE_URL);

    let advancedSearchBody = {
        advanced_search: {
            label: "All Contractors",
            condition_rules_attributes: [{
                    "type": "ProfileTypeRule",
                    "comparison_operator": "==",
                    "value": profileTypeId
                },
                {
                    "type": "ProfileAttributeRule",
                    "condition_object_id": attributeId,
                    "object_type": "NeAttribute",
                    "comparison_operator": "==",
                    "value": uid
                }
            ]
        }
    };

    // we want to check if a profile exists 
    let profileResponse
    try {
        // do the post against the seczetta API
        profileResponse = await axios.post(profileRequestUrl.href, advancedSearchBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token token=' + config.SECZETTA_API_KEY,
                'Accept': 'application/json'
            },
        });

        // check if we got any profiles
        if (profileResponse.data.profiles.length === 0) {
            if (config.SECZETTA_AUTHENTICATE_ON_ERROR && config.SECZETTA_AUTHENTICATE_ON_ERROR) {
                callback(new AllowAuthentication(session));
                return
            }
            deny(new DenyRequest("failed to retrieve profile", ""));
            return
        }
    } catch (profileError) {
        console.log(`error while calling profile API: ${profileError.message}`);
        if (config.SECZETTA_AUTHENTICATE_ON_ERROR && config.SECZETTA_AUTHENTICATE_ON_ERROR == true) {
            callback(new AllowAuthentication(session));
            return
        }
        deny(new DenyRequest("error retrieving profile, failing", ""));
        return
    }

    // now we can check the risk score
    let riskScoreResponse
    let objectId = profileResponse.data.profiles[0].id;
    const riskScoreRequestUrl = new URL('/api/risk_scores?object_id=' + objectId, config.SECZETTA_BASE_URL);
    try {
        riskScoreResponse = await axios.get(riskScoreRequestUrl.href, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token token=' + config.SECZETTA_API_KEY,
                'Accept': 'application/json'
            },
        });
    } catch (riskError) {
        // swallow risk scope API call, default is set to highest risk below
        console.log(`error while calling risk score API: ${riskError.message}`);
        if (config.SECZETTA_AUTHENTICATE_ON_ERROR && config.SECZETTA_AUTHENTICATE_ON_ERROR == true) {
            callback(new AllowAuthentication(session));
            return
        }
        deny(new DenyRequest("error retrieving risk score, failing", ""));
        return
    }

    // should now finally have the risk score, lets add it to the user
    var riskScoreObj = riskScoreResponse.data.risk_scores[riskScoreResponse.data.risk_scores.length - 1];
    const overallScore = riskScoreObj.overall_score;

    // allowableRisk isn't used at the moment - it could be used to require MFA if they are above a certain threshold
    // const allowableRisk = parseInt(config.SECZETTA_ALLOWABLE_RISK, 10);

    // if risk score is above the maximum risk score, fail authN
    const maximumRisk = parseInt(config.SECZETTA_MAXIMUM_ALLOWED_RISK, 10);
    if (maximumRisk && overallScore >= maximumRisk) {
        console.log(`risk score ${overallScore} is greater than maximum of ${maximumRisk}`);
        callback(new ShowErrorMessage("A " + overallScore + " risk score is too high. Maximum acceptable risk is " + maximumRisk, session));
        return
    }

    // otherwise, return success
    console.log("success, letting user authenticate")
    callback(new AllowAuthentication(session));
};

/** @callback postIdentificationCallback
 * @param {AllowAuthentication|RedirectRequest} token
 */

/** @callback denyRequestCallback
 * @param {DenyRequest} error
 */

/** AdditionalAuthenticator */
class AllowAuthentication {
    authentication = null;
    session = {};
    allowRememberedAuthenticators = true;
    authenticatorsToIgnore = [];

    /**
     * @constructor
     * @param {Object} session
     * @param {boolean} allowRememberedAuthenticators
     * @param {Object[]} authenticatorsToIgnore
     */
    constructor(session, allowRememberedAuthenticators = true, authenticatorsToIgnore = []) {
        this.authentication = 'ALLOW';
        this.session = session;
        this.allowRememberedAuthenticators = allowRememberedAuthenticators;
        this.authenticatorsToIgnore = authenticatorsToIgnore;
    }
}

/** RedirectRequest is a global object
 * @constructor
 * @param {string} redirect_url
 * @param {Object} session
 */

/** ShowErrorMessage is a global object
 * @constructor
 * @param {string} error_message
 * @param {Object} session
 */

/** DenyRequest is a global object
 * @constructor
 * @param {string} error
 * @param {string} description
 */