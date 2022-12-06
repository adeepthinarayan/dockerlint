# Go to the respective user folder
cd ./users/$1

trivy config -f json Dockerfile > ./errorlog.json






