#!/usr/bin/env node

const rc = require('rc');
const fs = require('fs');
const express = require('express');
const https = require('https');
const httpProxy = require('http-proxy');

const defaults = {
    logging: "httpsreverseproxy:info",
    https: {
        key: "./certificates/private.key",
        cert: "./certificates/public-certificate.pem"
    },
    servers: [
        {
            port: 8443,
            rules: [
                {
                    path: "/*",
                    target: "https://www.google.ch",
                    removePathFromRequestUrl: false
                }
            ]
        }
    ],
    reloadConfig: false
};

let openServers = [];
let config = rc('httpsreverseproxy', defaults);

process.env.DEBUG_FD = process.env.DEBUG_FD || 1;
process.env.DEBUG = process.env.DEBUG || config.logging;
const d = process.env.DEBUG.split(',');
d.push('httpsreverseproxy:error');
process.env.DEBUG = d.join(',');

const debug = require('debug');
const logdebug = debug('httpsreverseproxy:debug');
const loginfo = debug('httpsreverseproxy:info');
const logerror = debug('httpsreverseproxy:error');

const run = () => {
    logdebug('options: %j', config);

    config.servers.forEach(server => {
        const proxy = httpProxy.createProxyServer({
            key: fs.readFileSync(config.https.key, 'utf8'),
            cert: fs.readFileSync(config.https.cert, 'utf8'),
            secure: false,
            changeOrigin: true,
            autoRewrite: true,
            followRedirects: true
        });
        openServers.push(proxy);

        const app = express();

        const httpsServer = https.createServer({
            key: fs.readFileSync(config.https.key, 'utf8'),
            cert: fs.readFileSync(config.https.cert, 'utf8'),
            rejectUnauthorized: false,
            requestCert: false
        }, app);

        server.rules.forEach(rule => {
            const path = rule.path.replace(/\/$|\/\*$/, '');
            app.all(rule.path, (req, res) => {
                if (rule.removePathFromRequestUrl) {
                    const url = req.url.replace(path, '');
                    req.url = url === '' ? '/' : url;
                }
                proxy.web(req, res, {target: rule.target});
            });
        });

        httpsServer.listen(server.port);
        openServers.push(httpsServer);
    });
};

const close = () => {
    openServers.forEach(server => server.close());
    openServers = [];
};

if (config.reloadConfig === true) {
    const configFile = config.config;
    fs.watchFile(configFile, () => {
        loginfo('config file changed, reloading config options');
        try {
            close();
        } catch (e) {
            logerror('error closing servers');
            logerror(e)
        }
        try {
            config = rc('httpsreverseproxy', defaults);
        } catch (e) {
            logerror('error reloading configuration');
            logerror(e)
        }
        try {
            run();
        } catch (e) {
            logerror('error running servers');
            logerror(e)
        }
    })
}

try {
    run();
} catch (e) {
    logerror('error running servers');
    logerror(e)
}
