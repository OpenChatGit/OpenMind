import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];

const ChartRenderer = ({ config }) => {
  const [error, setError] = useState(null);

  try {
    const { type, data, options = {} } = typeof config === 'string' ? JSON.parse(config) : config;
    
    if (!data || !Array.isArray(data)) {
      return <div style={{ color: '#ff6b6b', padding: '1rem' }}>Invalid chart data</div>;
    }

    const chartStyle = {
      background: 'rgba(30, 30, 30, 0.6)',
      borderRadius: '12px',
      padding: '1rem',
      border: '1px solid rgba(255,255,255,0.08)',
      margin: '0.5rem 0'
    };

    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    };

    const axisStyle = { fill: '#888', fontSize: 12 };
    const gridStyle = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' };

    const dataKeys = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'name' && k !== 'label') : [];
    const xKey = options.xKey || 'name';

    const renderChart = () => {
      switch (type?.toLowerCase()) {
        case 'line':
          return (
            <LineChart {...commonProps}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey={xKey} tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip contentStyle={{ background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Legend />
              {dataKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ fill: COLORS[i % COLORS.length] }} />
              ))}
            </LineChart>
          );

        case 'bar':
          return (
            <BarChart {...commonProps}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey={xKey} tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip contentStyle={{ background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Legend />
              {dataKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          );

        case 'pie':
          const pieKey = dataKeys[0] || 'value';
          return (
            <PieChart>
              <Pie
                data={data}
                dataKey={pieKey}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#888' }}
              >
                {data.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Legend />
            </PieChart>
          );

        case 'area':
          return (
            <AreaChart {...commonProps}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey={xKey} tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip contentStyle={{ background: '#2c2c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
              <Legend />
              {dataKeys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.3} />
              ))}
            </AreaChart>
          );

        default:
          return <div style={{ color: '#888', padding: '1rem' }}>Unknown chart type: {type}</div>;
      }
    };

    return (
      <div style={chartStyle}>
        {options.title && (
          <div style={{ color: '#ececec', fontSize: '1rem', fontWeight: '500', marginBottom: '1rem', textAlign: 'center' }}>
            {options.title}
          </div>
        )}
        <ResponsiveContainer width="100%" height={options.height || 300}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    );
  } catch (e) {
    return (
      <div style={{ color: '#ff6b6b', padding: '1rem', background: 'rgba(255,107,107,0.1)', borderRadius: '8px' }}>
        Error parsing chart: {e.message}
      </div>
    );
  }
};

export default ChartRenderer;
