FROM node:14-alpine

RUN  apk update && apk add curl && curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin 

# Create app directory
ENV NODE_ENV=production

WORKDIR /app

RUN mkdir -p users

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)


RUN npm install 
# If you are building your code for production
# RUN npm ci --only=production

EXPOSE 3000
CMD [ "node", "js/server.js" ]