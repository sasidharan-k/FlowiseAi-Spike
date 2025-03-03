import path from 'path'
import { NextFunction, Request, Response } from 'express'
import { getFilesListFromStorage, getStoragePath, removeSpecificFileFromStorage } from 'flowise-components'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { getOrgData } from '../../utils'
import { updateStorageUsage } from '../../utils/featureUsage'

const getAllFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appServer = getRunningExpressApp()
        const orgData = await getOrgData(appServer)
        const apiResponse = await getFilesListFromStorage(orgData?.id)
        const filesList = apiResponse.map((file: any) => ({
            ...file,
            // replace org id because we don't want to expose it
            path: file.path.replace(getStoragePath(), '').replace(`${path.sep}${orgData?.id}${path.sep}`, '')
        }))
        return res.json(filesList)
    } catch (error) {
        next(error)
    }
}

const deleteFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appServer = getRunningExpressApp()
        const orgData = await getOrgData(appServer)
        const filePath = req.query.path as string
        const paths = filePath.split(path.sep).filter((path) => path !== '')
        const { totalSize } = await removeSpecificFileFromStorage(orgData?.id, ...paths)
        await updateStorageUsage(orgData.subdomain, totalSize / 1024 / 1024)
        return res.json({ message: 'file_deleted' })
    } catch (error) {
        next(error)
    }
}

export default {
    getAllFiles,
    deleteFile
}
