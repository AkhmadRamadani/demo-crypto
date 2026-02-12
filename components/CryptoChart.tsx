'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';
import { format } from 'date-fns';

interface CryptoData {
  s: string;
  p: string;
  dc: string;
  t: number;
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  BTC: number | null;
  ETH: number | null;
  BTCTrend?: number | null;
  ETHTrend?: number | null;
}

export default function CryptoChart() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [btcPrice, setBtcPrice] = useState<string>('--');
  const [ethPrice, setEthPrice] = useState<string>('--');
  const [btcChange, setBtcChange] = useState<string>('0');
  const [ethChange, setEthChange] = useState<string>('0');
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');

  const [refAreaLeft, setRefAreaLeft] = useState<string>('');
  const [refAreaRight, setRefAreaRight] = useState<string>('');
  const [left, setLeft] = useState<number>(0);
  const [right, setRight] = useState<number>(0);
  const [top, setTop] = useState<number>(0);
  const [bottom, setBottom] = useState<number>(0);

  const [maxDataPoints, setMaxDataPoints] = useState<number>(200);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showBTC, setShowBTC] = useState<boolean>(true);
  const [showETH, setShowETH] = useState<boolean>(true);

  const wsRef = useRef<WebSocket | null>(null);

  // Calculate linear regression trend line
  const calculateTrendLine = (data: ChartDataPoint[], currency: 'BTC' | 'ETH'): number[] => {
    const prices = data
      .map((p, i) => ({ x: i, y: p[currency] }))
      .filter(p => p.y !== null) as { x: number; y: number }[];

    if (prices.length < 2) return [];

    const n = prices.length;
    const sumX = prices.reduce((sum, p) => sum + p.x, 0);
    const sumY = prices.reduce((sum, p) => sum + p.y, 0);
    const sumXY = prices.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = prices.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map((_, i) => {
      if (data[i][currency] === null) return null;
      return slope * i + intercept;
    }) as number[];
  };

  const getTrendLineData = () => {
    if (chartData.length < 10) return getDisplayData();

    const btcTrend = calculateTrendLine(chartData, 'BTC');
    const ethTrend = calculateTrendLine(chartData, 'ETH');

    return getDisplayData().map((point, index) => ({
      ...point,
      BTCTrend: showBTC && btcTrend[index] !== undefined ? btcTrend[index] : null,
      ETHTrend: showETH && ethTrend[index] !== undefined ? ethTrend[index] : null,
    }));
  };

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket('wss://ws.eodhistoricaldata.com/ws/crypto?api_token=demo');
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('Connected');
        ws.send(JSON.stringify({
          action: 'subscribe',
          symbols: 'BTC-USD, ETH-USD'
        }));
      };

      ws.onmessage = (event) => {
        if (isPaused) return;

        try {
          const data: CryptoData = JSON.parse(event.data);
          const price = parseFloat(data.p);
          const changePercent = data.dc;
          const now = Date.now();
          const time = format(now, 'HH:mm:ss');

          if (data.s === 'BTC-USD') {
            setBtcPrice(price.toFixed(2));
            setBtcChange(changePercent);
          } else if (data.s === 'ETH-USD') {
            setEthPrice(price.toFixed(2));
            setEthChange(changePercent);
          }

          setChartData((prevData) => {
            const newData = [...prevData];
            const lastPoint = newData[newData.length - 1];
            const shouldCreateNewPoint = !lastPoint || (now - lastPoint.timestamp) > 500;

            if (shouldCreateNewPoint) {
              newData.push({
                time,
                timestamp: now,
                BTC: data.s === 'BTC-USD' ? price : null,
                ETH: data.s === 'ETH-USD' ? price : null,
              });
            } else {
              if (data.s === 'BTC-USD') lastPoint.BTC = price;
              else if (data.s === 'ETH-USD') lastPoint.ETH = price;
            }

            return newData.length > maxDataPoints
              ? newData.slice(-maxDataPoints)
              : newData;
          });
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onerror = () => setConnectionStatus('Error');
      ws.onclose = () => {
        setConnectionStatus('Disconnected');
        setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();
    return () => wsRef.current?.close();
  }, [isPaused, maxDataPoints]);

  const getChangeColor = (change: string) => {
    const val = parseFloat(change);
    if (val > 0) return 'text-emerald-500';
    if (val < 0) return 'text-rose-500';
    return 'text-slate-400';
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'Connected': return 'bg-emerald-500';
      case 'Disconnected': return 'bg-slate-400';
      case 'Error': return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };

  const zoom = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === '') {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    let leftIdx = 0, rightIdx = 0;
    chartData.forEach((item, idx) => {
      if (item.time === refAreaLeft) leftIdx = idx;
      if (item.time === refAreaRight) rightIdx = idx;
    });

    if (leftIdx > rightIdx) [leftIdx, rightIdx] = [rightIdx, leftIdx];

    const selectedData = chartData.slice(leftIdx, rightIdx + 1);
    let minPrice = Infinity, maxPrice = -Infinity;

    selectedData.forEach(item => {
      if (showBTC && item.BTC) {
        minPrice = Math.min(minPrice, item.BTC);
        maxPrice = Math.max(maxPrice, item.BTC);
      }
      if (showETH && item.ETH) {
        minPrice = Math.min(minPrice, item.ETH);
        maxPrice = Math.max(maxPrice, item.ETH);
      }
    });

    setLeft(leftIdx);
    setRight(rightIdx);
    setBottom(minPrice * 0.999);
    setTop(maxPrice * 1.001);
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  const zoomOut = () => {
    setLeft(0);
    setRight(0);
    setTop(0);
    setBottom(0);
  };

  const getDisplayData = () => {
    return (left === 0 && right === 0) ? chartData : chartData.slice(left, right + 1);
  };

  const getAxisYDomain = () => {
    return (left === 0 && right === 0) ? ['auto', 'auto'] : [bottom, top];
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-1">Crypto Chart</h1>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`}></div>
                <span>{connectionStatus}</span>
              </div>
              <span>•</span>
              <span>{chartData.length} points</span>
            </div>
          </div>
        </div>

        {/* Price Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-orange-200 bg-orange-50/50 rounded-lg p-4">
            <div className="text-xs text-orange-600 font-medium mb-1">BTC-USD</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900">${btcPrice}</span>
              <span className={`text-sm font-medium ${getChangeColor(btcChange)}`}>
                {parseFloat(btcChange) > 0 ? '+' : ''}{btcChange}%
              </span>
            </div>
          </div>

          <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4">
            <div className="text-xs text-blue-600 font-medium mb-1">ETH-USD</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900">${ethPrice}</span>
              <span className={`text-sm font-medium ${getChangeColor(ethChange)}`}>
                {parseFloat(ethChange) > 0 ? '+' : ''}{ethChange}%
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200">
          <select
            value={maxDataPoints}
            onChange={(e) => setMaxDataPoints(Number(e.target.value))}
            className="text-xs border border-slate-200 rounded px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            <option value={50}>50pt</option>
            <option value={100}>100pt</option>
            <option value={200}>200pt</option>
            <option value={500}>500pt</option>
          </select>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowBTC(!showBTC)}
              className={`text-xs px-3 py-1.5 rounded transition-colors ${showBTC ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              BTC
            </button>
            <button
              onClick={() => setShowETH(!showETH)}
              className={`text-xs px-3 py-1.5 rounded transition-colors ${showETH ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              ETH
            </button>
          </div>

          {/* <button
            onClick={() => setIsPaused(!isPaused)}
            className="text-xs px-3 py-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button> */}

          <button
            onClick={zoomOut}
            className="text-xs px-3 py-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Reset
          </button>

          <button
            onClick={() => setChartData([])}
            className="text-xs px-3 py-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Chart */}
        <div className="border border-slate-200 rounded-lg p-6">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={getTrendLineData()}
                onMouseDown={(e: any) => e && setRefAreaLeft(e.activeLabel)}
                onMouseMove={(e: any) => refAreaLeft && e && setRefAreaRight(e.activeLabel)}
                onMouseUp={zoom}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  stroke="#94a3b8"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  allowDataOverflow
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  domain={getAxisYDomain()}
                  allowDataOverflow
                  tickFormatter={(value) => '$' + value.toFixed(0)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: any) => ['$' + parseFloat(value).toFixed(2)]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: '#64748b' }}
                />
                {showBTC && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="BTC"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                      name="Bitcoin"
                      connectNulls
                      animationDuration={300}
                    />
                    <Line
                      type="monotone"
                      dataKey="BTCTrend"
                      stroke="#f97316"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={false}
                      name="BTC Trend"
                      connectNulls
                      animationDuration={300}
                      opacity={0.4}
                    />
                  </>
                )}
                {showETH && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="ETH"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="Ethereum"
                      connectNulls
                      animationDuration={300}
                    />
                    <Line
                      type="monotone"
                      dataKey="ETHTrend"
                      stroke="#3b82f6"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={false}
                      name="ETH Trend"
                      connectNulls
                      animationDuration={300}
                      opacity={0.4}
                    />
                  </>
                )}
                {refAreaLeft && refAreaRight && (
                  <ReferenceArea
                    x1={refAreaLeft}
                    x2={refAreaRight}
                    strokeOpacity={0.3}
                    fill="#cbd5e1"
                    fillOpacity={0.2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-slate-400">
          Click and drag to zoom • Real-time WebSocket data
        </div>
      </div>
    </div>
  );
}