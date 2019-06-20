const program = require('commander');
const fs = require('fs');
const express = require('express');
const https = require('https');
const httpProxy = require('http-proxy');

let configFilePath = '';
program.version('1.0.0')
    .arguments('<configFilePath>')
    .action((cfg) => {
        configFilePath = cfg;
    })
    .parse(process.argv);

if (!configFilePath) {
    console.error('\nConfig file path parameter missing in args >%s<\n', program.args.join(' '));
    program.outputHelp();
    process.exit(1);
}

const file = fs.readFileSync(configFilePath, 'utf8');
const config = JSON.parse(file);

if (!config.https ||
    !config.https.key ||
    !config.https.cert ||
    !config.servers ||
    !Array.isArray(config.servers) ||
    config.servers.length < 1 ||
    !config.servers[0].rules ||
    !Array.isArray(config.servers[0].rules) ||
    config.servers[0].rules.length < 1 ||
    !config.servers[0].rules[0].path ||
    !config.servers[0].rules[0].target) {
    console.error('\nConfig format must be like: \n' +
        '{\n' +
        '  "https": {\n' +
        '    "key": "./certificates/private.key",\n' +
        '    "cert": "./certificates/public-certificate.pem"\n' +
        '  },\n' +
        '  "servers": [\n' +
        '    {\n' +
        '      "port": 7443,\n' +
        '      "rules": [\n' +
        '        {\n' +
        '          "path": "/*",\n' +
        '          "target": "https://www.google.com"\n' +
        '        }\n' +
        '      ]\n' +
        '    }\n' +
        '  ]\n' +
        '}\n\n', configFilePath);
    program.outputHelp();
    process.exit(1);
}

config.servers.forEach(server => {
    const proxy = httpProxy.createProxyServer({
        key: fs.readFileSync(config.https.key, 'utf8'),
        cert: fs.readFileSync(config.https.cert, 'utf8'),
        secure: false,
        changeOrigin: true,
        autoRewrite: true,
        followRedirects: true
    });

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
            const url = req.url.replace(path, '');
            req.url = url === '' ? '/' : url;
            proxy.web(req, res, {target: rule.target});
        });
    });

    httpsServer.listen(server.port);
});
