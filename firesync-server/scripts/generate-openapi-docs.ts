import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  definition: {
    info: {
      title: 'Hello World',
      version: '1.0.0'
    },
    servers: [
      {
        url: 'https://{project}.firesync.live',
        description: 'FireSync Cloud server',
        variables: {
          project: {
            description: 'Name of your FireSync Cloud project'
          }
        }
      },
      {
        url: 'http://localhost:5000',
        description: 'Local FireSync server'
      }
    ]
  },
  apis: ['./src/server/http/controllers/*.ts']
}

const run = async () => {
  const openapiSpecification = await swaggerJsdoc(options)
  console.log(JSON.stringify(openapiSpecification, null, 2))
}

run()
