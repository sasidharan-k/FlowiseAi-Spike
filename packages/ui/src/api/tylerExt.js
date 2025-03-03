import client from './client'

const copyWorkspace = (body) => client.post('/tylerExt/copy-workspace-data', body)

export default {
    copyWorkspace
}
