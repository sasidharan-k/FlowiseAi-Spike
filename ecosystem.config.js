module.exports = {
    apps: [
        {
            name: 'FlowiseCloud2.0.2@AzureAMI_v07082024',
            script: 'pnpm',
            args: 'start',
            env: {
                PORT: 3000,
                NODE_ENV: 'production'
            },
            // On a machine with 2 GiB of memory, setting max memory size of V8's old memory section to 1536 (1.5 GiB) to leave some memory for other uses and avoid swapping.
            node_args: ['--optimize-for-size', '--max-old-space-size=1536']
        }
    ]
}
