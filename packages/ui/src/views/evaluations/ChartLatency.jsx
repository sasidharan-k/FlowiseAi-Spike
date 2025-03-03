import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import PropTypes from 'prop-types'

const empty = []

export const ChartLatency = ({ data, dataKey, stroke, onClick }) => {
    return (
        <ResponsiveContainer width='95%' height={200}>
            <LineChart
                onClick={onClick}
                width={500}
                height={200}
                data={data || empty}
                margin={{
                    top: 5,
                    right: 20,
                    left: 20,
                    bottom: 5
                }}
            >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='y' />
                <YAxis />
                <Tooltip />
                <Line type='monotone' dataKey={dataKey} stroke={stroke} activeDot={{ r: 8 }} />
            </LineChart>
        </ResponsiveContainer>
    )
}

ChartLatency.propTypes = {
    data: PropTypes.array,
    dataKey: PropTypes.string,
    stroke: PropTypes.string,
    onClick: PropTypes.func
}
