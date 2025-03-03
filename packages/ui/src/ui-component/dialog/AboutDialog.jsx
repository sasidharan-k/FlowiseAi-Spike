import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import {
    DialogActions,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Paper
} from '@mui/material'
import moment from 'moment'
import axios from 'axios'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { baseURL } from '@/store/constant'
import useConfirm from '@/hooks/useConfirm'
import { useConfig } from '@/store/context/ConfigContext'

const AboutDialog = ({ show, onCancel }) => {
    const portalElement = document.getElementById('portal')

    const { isCloud, config } = useConfig()

    const [data, setData] = useState({})

    const { confirm } = useConfirm()
    const navigate = useNavigate()

    const rollbackToPrev = async () => {
        const prevVersion = localStorage.getItem('FLOWISE_ROLLBACK_VERSION')
        const engineUrl = config?.ENGINE_URL
        if (prevVersion && engineUrl) {
            const confirmPayload = {
                title: `Rollback to v${prevVersion}`,
                description: 'Rollback version will temporarily shut down the apps. Are you sure you want to proceed?',
                confirmButtonName: 'Rollback',
                cancelButtonName: 'Cancel',
                customBtnId: 'btn_initiateRollback'
            }
            const isConfirmed = await confirm(confirmPayload)

            if (isConfirmed) {
                const response = await axios.post(
                    `${engineUrl}/update-customer-instance`,
                    { releaseVersion: prevVersion },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json'
                        }
                    }
                )
                localStorage.removeItem('FLOWISE_ROLLBACK_VERSION')
                const redirectTo = response.data?.redirectTo
                if (redirectTo) {
                    window.location.href = redirectTo
                } else {
                    navigate('/', { replace: true })
                    navigate(0)
                }
            }
        }
    }

    const updateToLatest = async () => {
        const { currentVersion } = data
        const engineUrl = config?.ENGINE_URL

        if (currentVersion && engineUrl) {
            const confirmPayload = {
                title: `Update to Latest Version`,
                description: 'Updating version will temporarily shut down the apps. Are you sure you want to proceed?',
                confirmButtonName: 'Update',
                cancelButtonName: 'Cancel',
                customBtnId: 'btn_initiateUpdate'
            }
            const isConfirmed = await confirm(confirmPayload)

            if (isConfirmed) {
                localStorage.setItem('FLOWISE_ROLLBACK_VERSION', extractVersion(currentVersion))
                const latestVersion = data.name.split('@')[1]
                const response = await axios.post(
                    `${engineUrl}/update-customer-instance`,
                    { releaseVersion: latestVersion },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json'
                        }
                    }
                )
                const redirectTo = response.data?.redirectTo
                if (redirectTo) {
                    window.location.href = redirectTo
                } else {
                    navigate('/', { replace: true })
                    navigate(0)
                }
            }
        }
    }

    const extractVersion = (versionString) => {
        const match = versionString.match(/\d+(\.\d+)*/)
        return match ? match[0] : null
    }

    const compareVersions = (v1, v2) => {
        const version1 = extractVersion(v1)
        const version2 = extractVersion(v2)

        // Split versions into parts and convert to integers
        const parts1 = version1.split('.').map(Number)
        const parts2 = version2.split('.').map(Number)

        // Normalize the length of parts by appending zeros where missing
        const maxLength = Math.max(parts1.length, parts2.length)
        while (parts1.length < maxLength) parts1.push(0)
        while (parts2.length < maxLength) parts2.push(0)

        // Compare version numbers
        for (let i = 0; i < maxLength; i++) {
            if (parts1[i] > parts2[i]) return 'greater'
            if (parts1[i] < parts2[i]) return 'less'
        }
        return 'equal'
    }

    useEffect(() => {
        if (show) {
            const username = localStorage.getItem('username')
            const password = localStorage.getItem('password')

            const latestReleaseReq = axios.get('https://api.github.com/repos/FlowiseAI/Flowise/releases/latest')
            const currentVersionReq = axios.get(`${baseURL}/api/v1/version`, {
                auth: username && password ? { username, password } : undefined,
                headers: { 'Content-type': 'application/json', 'x-request-from': 'internal' }
            })

            Promise.all([latestReleaseReq, currentVersionReq])
                .then(([latestReleaseData, currentVersionData]) => {
                    const finalData = {
                        ...latestReleaseData.data,
                        currentVersion: currentVersionData.data.version
                    }
                    setData(finalData)
                })
                .catch((error) => {
                    console.error('Error fetching data:', error)
                })
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show])

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                Flowise Version
            </DialogTitle>
            <DialogContent>
                {data && (
                    <TableContainer component={Paper}>
                        <Table aria-label='simple table'>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Current Version</TableCell>
                                    <TableCell>Latest Version</TableCell>
                                    <TableCell>Published At</TableCell>
                                    {localStorage.getItem('FLOWISE_ROLLBACK_VERSION') && <TableCell>Previous Version</TableCell>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell component='th' scope='row'>
                                        {data.currentVersion}
                                    </TableCell>
                                    <TableCell component='th' scope='row'>
                                        <a target='_blank' rel='noreferrer' href={data.html_url}>
                                            {data.name}
                                        </a>
                                    </TableCell>
                                    <TableCell>{moment(data.published_at).fromNow()}</TableCell>
                                    {localStorage.getItem('FLOWISE_ROLLBACK_VERSION') && (
                                        <TableCell component='th' scope='row'>
                                            {localStorage.getItem('FLOWISE_ROLLBACK_VERSION')}
                                        </TableCell>
                                    )}
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            {isCloud && (
                <DialogActions sx={{ pb: 2, pl: 2, pr: 2, pt: 0 }}>
                    {data && data.currentVersion && data.name && compareVersions(data.name, data.currentVersion) === 'greater' && (
                        <Button variant='contained' sx={{ borderRadius: '20px' }} onClick={() => updateToLatest()}>
                            Update to latest
                        </Button>
                    )}
                    {data &&
                        data.currentVersion &&
                        localStorage.getItem('FLOWISE_ROLLBACK_VERSION') &&
                        compareVersions(localStorage.getItem('FLOWISE_ROLLBACK_VERSION'), data.currentVersion) === 'less' && (
                            <Button variant='contained' sx={{ borderRadius: '20px' }} onClick={() => rollbackToPrev()}>
                                Rollback to v{localStorage.getItem('FLOWISE_ROLLBACK_VERSION')}
                            </Button>
                        )}
                </DialogActions>
            )}
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AboutDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func
}

export default AboutDialog
