module.exports = {
    apps: [
        {
            name: 'flowiseCloudApp_version_xyz',
            script: 'pnpm',
            args: 'start',
            env: {
                PORT: 3000,
                NODE_ENV: 'production'
            }
        }
    ]
}
