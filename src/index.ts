import { app } from '@/app.js'
import { appConfig } from '@/config/appConfig.js'

app.listen(appConfig.port, () => {
  console.log(`${appConfig.name} écoute sur http://localhost:${appConfig.port}`)
})
