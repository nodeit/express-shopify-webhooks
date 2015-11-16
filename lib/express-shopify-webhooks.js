/**
 * express-shopify-webhooks
 * Copyright(c) 2015 Chris Gregory
 * MIT Licensed
 */


'use strict';


/**
 * Module dependencies.
 */

var fs = require('fs');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var debug = require('debug')('express-shopify-webhooks');


var shopifyWebhooks = module.exports = function(options) {

    shopifyWebhooks.validateOptions(options);

    var router = express.Router();

    // Verify webhook's origin
    router.use(bodyParser.json({
        limit: options.limit || '50mb',
        verify: shopifyWebhooks.validateSignature
    }));

    // Block invalid webhook requests
    router.use(shopifyWebhooks.requireValidSignature);
 
    // Mount webhook handlers to router from user specified directory
    fs.readdirSync(options.directory).forEach(function(file) {
        
        if (!file || file === 'index.js') return;
        if (path.extname(file) !== '.js') return;
        
        var routes = require(path.join(options.directory, file));
        
        shopifyWebhooks.getMethodNames(routes).forEach(function(route) {
            var uri = shopifyWebhooks.buildRouteUrl(file, route);
            router.post(uri, routes[route]); // mount webhook handler
            debug('Added route: %s', uri);
        });

    });

    return router;

};

shopifyWebhooks.validateOptions = function(options) {

    debug('options', options);

    if (!options.directory)
        throw new Error('You have not set a webhook directory. See options.directory.');

    if (!fs.existsSync(options.directory))
        throw new Error('The webhook directory you provided does not exist: ' + options.directory);

    if (!options.shopify_shared_secret)
        throw new Error('You have not provided your Shopify shared secret. See options.shopify_shared_secret.');

};

shopifyWebhooks.requireValidSignature = function(req, res, next) {
    debug('Valid Signature?', req.validShopifyWebhook);
    if (!req.validShopifyWebhook) return res.sendStatus(403);
    next();
};

shopifyWebhooks.validateSignature = function(req, res, buffer, encoding) {
    req.validShopifyWebhook = false;
    var headerHmac = req['headers']['x-shopify-hmac-sha256'];
    if (headerHmac) {
        var hmac = crypto.createHmac('sha256', options.shopify_shared_secret);
        hmac.update(buffer);
        var calculatedHmac = hmac.digest('base64');
        if (calculatedHmac === headerHmac)
            req.validShopifyWebhook = true;
    }
};

shopifyWebhooks.buildRouteUrl = function(filename, route) {
    return [
        '/',
        filename.split('.')[0],
        '/',
        route
    ].join('');
};

shopifyWebhooks.getMethodNames = function(obj) {
    return Object.getOwnPropertyNames(obj)
};
