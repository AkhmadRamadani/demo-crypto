# Crypto Real-time Trading Chart

A Next.js web application that displays real-time Bitcoin and Ethereum trading data using WebSocket connection to EOD Historical Data API.

## Features

- **Real-time WebSocket Connection**: Connects to EOD Historical Data WebSocket API
- **Live Price Updates**: Displays current BTC-USD and ETH-USD prices
- **Interactive Chart**: Visual representation of price movements over time
- **Price Change Indicators**: Shows daily change percentage with color coding
- **Auto-reconnect**: Automatically reconnects if connection is lost
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Recharts** - Chart visualization library
- **Tailwind CSS** - Styling
- **WebSocket API** - Real-time data connection

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
```bash
cd crypto-realtime-chart
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

### WebSocket Connection

The app connects to:
```
wss://ws.eodhistoricaldata.com/ws/crypto?api_token=demo
```

### Subscription Message

On connection, it sends:
```json
{
  "action": "subscribe",
  "symbols": "BTC-USD, ETH-USD"
}
```

### Data Format

Receives real-time updates in this format:
```json
{
  "s": "BTC-USD",        // Symbol
  "p": "67296.1396",     // Price
  "q": "1",              // Quantity
  "dc": "-2.2728",       // Daily change %
  "dd": "-1529.5162",    // Daily change value
  "t": 1770888577913     // Timestamp
}
```

## Features Breakdown

### Price Cards
- Display current BTC and ETH prices
- Show daily change percentage with color coding (green for positive, red for negative)
- Update in real-time as new data arrives

### Live Chart
- Plots price movements over time for both cryptocurrencies
- Maintains last 50 data points for performance
- Uses different colors for BTC (orange) and ETH (blue)
- Interactive tooltips on hover

### Connection Status
- Visual indicator showing connection state
- Message counter to track data flow
- Auto-reconnect functionality

## Customization

### Adjust Chart Data Points
Change the `maxDataPoints` variable in `components/CryptoChart.tsx`:
```typescript
const maxDataPoints = 50; // Change to desired number
```

### Add More Cryptocurrencies
Modify the subscription message in `components/CryptoChart.tsx`:
```typescript
const subscribeMessage = {
  action: 'subscribe',
  symbols: 'BTC-USD, ETH-USD, LTC-USD' // Add more symbols
};
```

### Styling
The app uses Tailwind CSS. Modify classes in the components or update `tailwind.config.js` for global theme changes.

## Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
crypto-realtime-chart/
├── app/
│   ├── globals.css       # Global styles with Tailwind
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   └── CryptoChart.tsx   # Main chart component with WebSocket
├── public/               # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## Notes

- Uses the demo API token for testing
- For production use, obtain a proper API key from EOD Historical Data
- WebSocket connection automatically reconnects on disconnect
- Chart updates smoothly without flickering

## License

MIT
