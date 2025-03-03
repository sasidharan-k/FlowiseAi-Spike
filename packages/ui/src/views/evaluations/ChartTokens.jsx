import { CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Bar, BarChart } from 'recharts'
import PropTypes from 'prop-types'

export const ChartTokens = ({ data }) => {
    return (
        <ResponsiveContainer width='95%' height={200}>
            <BarChart
                width={500}
                height={200}
                data={data}
                margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5
                }}
            >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='y' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey='Prompt Tokens' stackId='a' fill='#2233FF' />
                <Bar dataKey='Completion Tokens' stackId='a' fill='#82CA9D' />
            </BarChart>
        </ResponsiveContainer>
    )
}

ChartTokens.propTypes = {
    data: PropTypes.array
}
