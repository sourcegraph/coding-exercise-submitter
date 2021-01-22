import { serve } from './cloud-function'
import express from 'express'

const server = express()

server.use(serve)

server.listen(5050, () => {
    console.log('Listening on localhost:5050')
})
