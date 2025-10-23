import { serve } from 'bun'
import { handleRequest } from './logic'

const server = serve({
  port: 3000,
  routes: {
    '/*': (req) => handleRequest(req),
  },
})

console.log(`Listening on ${server.url}`)
