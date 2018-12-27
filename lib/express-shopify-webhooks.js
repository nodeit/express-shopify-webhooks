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
var crypto = require('crypto');
var bodyParser = require('body-parser');
var debug = require('debug')('express-shopify-webhooks');

var express = require.main.require('express'); // peer dependency


var shopifyWebhooks = module.exports = function(options) {

    shopifyWebhooks.validateOptions(options);
    shopifyWebhooks.options = options;

    var router = express.Router();

    // Verify webhook's origin
    router.use(bodyParser.json({
        limit: options.limit || '50mb',
        verify: shopifyWebhooks.validateSignature
    }));

    // Block invalid webhook requests
    router.use(shopifyWebhooks.requireValidSignature);

    shopifyWebhooks.mountCustomMiddleware(router);
    shopifyWebhooks.mountWebhookHandlers(router);

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

shopifyWebhooks.mountCustomMiddleware = function(router) {
    var customMiddlewarePath = path.join(shopifyWebhooks.options.directory, 'index.js');
    if (fs.existsSync(customMiddlewarePath)) {
        var customMiddleware = require(customMiddlewarePath);
        shopifyWebhooks.getMethodNames(customMiddleware).forEach(function(method) {
            router.use(customMiddleware[method]);
        });
    }
};

// Mount webhook handlers to router from user specified directory
shopifyWebhooks.mountWebhookHandlers = function(router) {
    fs.readdirSync(shopifyWebhooks.options.directory).forEach(function(file) {
        if (!file || file === 'index.js') return;
        if (path.extname(file) !== '.js') return;
        var routes = require(path.join(shopifyWebhooks.options.directory, file));
        shopifyWebhooks.getMethodNames(routes).forEach(function(route) {
            var uri = shopifyWebhooks.buildRouteUrl(file, route);
            router.post(uri, routes[route]); // mount webhook handler
            debug('Added route: %s', uri);
        });
    });
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
        var hmac = crypto.createHmac('sha256', shopifyWebhooks.options.shopify_shared_secret);
        hmac.update(buffer);
        // Shopify seems to have changed the forward slash escaping
        // from a single back slash to double back slashes
        // in this case we want to replace all \/ tuples
        // to \\/
        var calculatedHmac = hmac.digest('base64').replace(/\//g, '\\/');
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
