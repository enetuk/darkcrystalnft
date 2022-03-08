read -p "Enter domain : " domain


sudo /etc/init.d/nginx stop

sudo certbot --standalone certonly -d $domain -d www.$domain

mkdir /home/ubuntu/www/
mkdir /home/ubuntu/www/$domain
mkdir /home/ubuntu/www/$domain/nft

chown -R ubuntu:ubuntu /home/ubuntu/www/$domain

sudo cat > /etc/nginx/sites-enabled/$domain <<EOF
server {
    server_name $domain.by www.$domain.by;
	
	set \$root_path /home/ubuntu/www/$domain;
	root /home/ubuntu/www/$domain;

    listen 80;
    listen 443 ssl http2;

    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/$domain/chain.pem;

	ssl_session_timeout 5m;
	ssl_session_cache shared:SSL:2m;
	ssl_dhparam /etc/nginx/dhparam.pem;
	ssl_session_tickets off;

	ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;
	ssl_prefer_server_ciphers on;
	ssl_ciphers "ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:ECDHE-ECDSA-DES-CBC3-SHA:ECDHE-RSA-DES-CBC3-SHA:EDH-RSA-DES-CBC3-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA:DES-CBC3-SHA:!DSS";

}
EOF

sudo /etc/init.d/nginx start

cat > ~/darkcrystalnft/config.json <<EOF

{
	"url_path": "https://$domain/nft/",
	"file_path": "/home/ubuntu/www/$domain/nft/",
	"seller_fee_basis_points": 100
}

EOF