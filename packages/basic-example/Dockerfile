FROM node:22-alpine

WORKDIR /usr/src/app

# copy all sources
COPY . ./

# install dependencies
RUN npm ci --include-workspace-root -w @web3dsurvey/api-server --audit=false --fund=false

# build
RUN npx nx run-many -t build -p @web3dsurvey/api-server

# run server
EXPOSE 8080
# set env var NODE_ENV to production
ENV NODE_ENV=production

WORKDIR /usr/src/app/services/api-server
CMD ["node", "--no-warnings", "--experimental-strip-types", "--experimental-transform-types", "./src/server.ts"]
