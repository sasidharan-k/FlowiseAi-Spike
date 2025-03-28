import { Request } from 'express'
import * as path from 'path'
import {
    addArrayFilesToStorage,
    getFileFromUpload,
    IDocument,
    mapExtToInputField,
    mapMimeTypeToInputField,
    removeSpecificFileFromUpload
} from 'flowise-components'
import { getRunningExpressApp } from './getRunningExpressApp'
import { getErrorMessage } from '../errors/utils'
import { getOrgDataFromSubdomain } from '.'
import { updateStorageUsage } from './featureUsage'

/**
 * Create attachment
 * @param {Request} req
 */
export const createFileAttachment = async (req: Request) => {
    const appServer = getRunningExpressApp()

    const chatflowid = req.params.chatflowId
    if (!chatflowid) {
        throw new Error(
            'Params chatflowId is required! Please provide chatflowId and chatId in the URL: /api/v1/attachments/:chatflowId/:chatId'
        )
    }

    const chatId = req.params.chatId
    if (!chatId) {
        throw new Error(
            'Params chatId is required! Please provide chatflowId and chatId in the URL: /api/v1/attachments/:chatflowId/:chatId'
        )
    }

    const { orgData } = await getOrgDataFromSubdomain(appServer, req.headers.host as string)

    // Find FileLoader node
    const fileLoaderComponent = appServer.nodesPool.componentNodes['fileLoader']
    const fileLoaderNodeInstanceFilePath = fileLoaderComponent.filePath as string
    const fileLoaderNodeModule = await import(fileLoaderNodeInstanceFilePath)
    const fileLoaderNodeInstance = new fileLoaderNodeModule.nodeClass()
    const options = {
        retrieveAttachmentChatId: true,
        orgId: orgData?.id,
        chatflowid,
        chatId
    }
    const files = (req.files as Express.Multer.File[]) || []
    const fileAttachments = []
    if (files.length) {
        const isBase64 = req.body.base64
        for (const file of files) {
            const fileBuffer = await getFileFromUpload(file.path ?? file.key)
            const fileNames: string[] = []
            // Address file name with special characters: https://github.com/expressjs/multer/issues/1104
            file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
            const { path: storagePath, totalSize } = await addArrayFilesToStorage(
                file.mimetype,
                fileBuffer,
                file.originalname,
                fileNames,
                orgData?.id,
                chatflowid,
                chatId
            )
            await updateStorageUsage(orgData?.subdomain, totalSize / 1024 / 1024)

            const fileInputFieldFromMimeType = mapMimeTypeToInputField(file.mimetype)

            const fileExtension = path.extname(file.originalname)

            const fileInputFieldFromExt = mapExtToInputField(fileExtension)

            let fileInputField = 'txtFile'

            if (fileInputFieldFromExt !== 'txtFile') {
                fileInputField = fileInputFieldFromExt
            } else if (fileInputFieldFromMimeType !== 'txtFile') {
                fileInputField = fileInputFieldFromExt
            }

            await removeSpecificFileFromUpload(file.path ?? file.key)

            try {
                const nodeData = {
                    inputs: {
                        [fileInputField]: storagePath
                    },
                    outputs: { output: 'document' }
                }

                let content = ''

                if (isBase64) {
                    content = fileBuffer.toString('base64')
                } else {
                    const documents: IDocument[] = await fileLoaderNodeInstance.init(nodeData, '', options)
                    content = documents.map((doc) => doc.pageContent).join('\n')
                }

                fileAttachments.push({
                    name: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    content
                })
            } catch (error) {
                throw new Error(`Failed operation: createFileAttachment - ${getErrorMessage(error)}`)
            }
        }
    }

    return fileAttachments
}
