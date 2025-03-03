import accountApi from '@/api/account'
import PropTypes from 'prop-types'
import { createContext, useContext, useEffect, useState } from 'react'

const ConfigContext = createContext()

export const ConfigProvider = ({ children }) => {
    const [config, setConfig] = useState({})
    const [loading, setLoading] = useState(true)
    const [isEnterpriseLicensed, setEnterpriseLicensed] = useState(false)
    const [isCloud, setCloudLicensed] = useState(false)
    const [isOpenSource, setOpenSource] = useState(false)

    useEffect(() => {
        const userSettings = accountApi.getSettings()
        Promise.all([userSettings])
            .then(([currentSettingsData]) => {
                const finalData = {
                    ...currentSettingsData.data
                }
                setConfig(finalData)

                if (finalData.USER_PLAN) {
                    if (finalData.USER_PLAN === 'enterprise') {
                        setEnterpriseLicensed(true)
                        setCloudLicensed(false)
                        setOpenSource(false)
                    } else if (finalData.USER_PLAN === 'cloud') {
                        setCloudLicensed(true)
                        setEnterpriseLicensed(false)
                        setOpenSource(false)
                    } else {
                        setOpenSource(true)
                        setEnterpriseLicensed(false)
                        setCloudLicensed(false)
                    }
                }

                setLoading(false)
            })
            .catch((error) => {
                console.error('Error fetching data:', error)
                setLoading(false)
            })
    }, [])

    return (
        <ConfigContext.Provider value={{ config, loading, isEnterpriseLicensed, isCloud, isOpenSource }}>{children}</ConfigContext.Provider>
    )
}

export const useConfig = () => useContext(ConfigContext)

ConfigProvider.propTypes = {
    children: PropTypes.any
}
