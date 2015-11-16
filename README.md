#express-shopify-webhooks

A custom middleware for express that verifies incoming Shopify webhook requests and allows you to add a custom callback methods for each webhook event. 

## Installation
    npm install express-shopify-webhooks
    
## Features

* Automatically sends a 403 response to any invalid webhook requests (i.e. no signature or invalid HMAC signature)
* Auto-generates routes for each webhook resource/event pair (e.g. `/webhooks/products/create`, `/webhooks/app/uninstalled`, etc...)

In your server file (e.g. app.js), include express-shopify-webhooks, add your `shopify_shared_secret`, and `provide the directory location` of your webhooks method handlers:

~~~
# app.js
var express = require('express');
var path = require('path');

var app = express();

var shopifyWebhooks = require('express-shopify-webhooks');

app.use('/webhooks', shopifyWebhooks({
	directory: path.join(__dirname, '/webhooks_handlers'),
	shopify_shared_secret: 'YOUR_SHOPIFY_SHARED_SECRET'
}));
~~~

### Webhook files

When you specify a directory key in the configuration, the module will look for all javascript files in that directory and will map each of the exported methods to its own route.

The directories should follow a very simple convention. The **module name should be the same as its resource and the module methods should have the same names as the events you want to handle**.

For example, to create a method handler for the `products/create` webhook, simply create a `products.js` module (in the directory you specified above) and export a method named `create`. This will mount a callback function to the `/webhooks/products/create` url. 

A method handler module will look like this:

~~~
# /webhook_handlers/products.js

# maps to: POST /webhooks/products/create
module.exports.create = function(req, res) {
	// create new product 
    res.sendStatus(200);
};

# maps to: POST /webhooks/products/update
module.exports.update = function(req, res) {
	// update product
    res.sendStatus(200);
};

# maps to: POST /webhooks/products/delete
module.exports.delete = function(req, res) {
	// delete device
    res.sendStatus(200);
};
~~~
~~~
# /webhook_handlers/app.js

# maps to: POST /webhooks/app/uninstalled
module.exports.uninstalled = function(req, res) {
	// remove shop from database or mark as inactive
	res.sendStatus(200);
};
~~~

##Configuration options

**require('express-shopify-webhooks')([options])**

* `directory`: directory to load custom webhook method handler files **(required)**
* `shopify_shared_secret`: The Shopify app's shared secret, viewable from the Partner dashboard **(required)**
* `limit`: Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the bytes library for parsing. Defaults to '100kb'. **(optional)**