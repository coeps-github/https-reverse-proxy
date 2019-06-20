# https-reverse-proxy
simple configurable https reverse proxy

## Config
-> https://www.npmjs.com/package/rc

https-reverse-proxy --config config.json

## Default Config
```json
{
    "logging": "httpsreverseproxy:info",
    "https": {
        "key": "./certificates/private.key",
        "cert": "./certificates/public-certificate.pem"
    },
    "servers": [
        {
            "port": 8443,
            "rules": [
                {
                    "path": "/*",
                    "target": "https://www.google.ch",
                    "removePathFromRequestUrl": false
                }
            ]
        }
    ],
    "reloadConfig": false
}
```

## Limitations
If removePathFromRequestUrl is true, the path is removed from the request.url and then handed over to the proxy.
The path ending / or /* is removed and the resulting string is removed from the request.url.
Therefore no complex paths (e.g. wildcards in between, regexp) are possible with this option enabled.
