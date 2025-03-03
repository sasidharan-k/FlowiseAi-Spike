import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import PropTypes from 'prop-types'

const COLORS = ['#00C49F', '#0088FE', '#FF8042']
const RADIAN = Math.PI / 180

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
        <text x={x} y={y} fill='white' textAnchor={x > cx ? 'start' : 'end'} dominantBaseline='central'>
            {`${(percent * 100).toFixed(2)}%`}
        </text>
    )
}

export const ChartPassPrnt = ({ data }) => {
    return (
        <ResponsiveContainer width='95%' height={200}>
            <PieChart>
                <Pie
                    cx='50%'
                    cy='50%'
                    labelLine={false}
                    outerRadius={100}
                    fill='#8884d8'
                    dataKey='value'
                    data={data}
                    label={renderCustomizedLabel}
                >
                    {[data].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    )
}

ChartPassPrnt.propTypes = {
    data: PropTypes.array
}
