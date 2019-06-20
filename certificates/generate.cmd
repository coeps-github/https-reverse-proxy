@echo off
cls
echo Creating CA Certificate...
"C:\Program Files\OpenSSL-Win64\bin\openssl.exe" req -x509 -nodes -days 365 -newkey rsa:2048 -keyout private.key -out public-certificate.pem -config generateConfig.cnf -sha256
