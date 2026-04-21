'use client'

import dynamic from 'next/dynamic'

// Skip SSR entirely — avoids Node.js 22+ Web Storage conflict with Next.js 15
const App = dynamic(() => import('@/components/App'), { ssr: false })

export default function Home() {
  return <App />
}
