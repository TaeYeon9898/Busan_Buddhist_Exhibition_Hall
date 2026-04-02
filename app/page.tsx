'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

const PIE_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16']

export default function Home() {
  const [stockData, setStockData] = useState<any[]>([])
  const [inData, setInData] = useState<any[]>([])
  const [outData, setOutData] = useState<any[]>([])
  const [returnData, setReturnData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stock')

  const [searchCode, setSearchCode] = useState('')
  const [searchSellerCode, setSearchSellerCode] = useState('')
  const [searchSupplier, setSearchSupplier] = useState('')
  const [searchCategory, setSearchCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 통계 탭 공통 연도/월 필터
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(0) // 0 = 전체

  // 분류별 출고 Top10 / 회전율 차트 전용 분류 선택
  const [selectedCategoryForOut, setSelectedCategoryForOut] = useState('')
  const [selectedCategoryForTurnover, setSelectedCategoryForTurnover] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: stock } = await supabase.from('product_info').select('*').order('code')
    const { data: inStock } = await supabase.from('in_stock').select('*').order('order_date', { ascending: false })
    const { data: outStock } = await supabase.from('out_stock').select('*').order('out_date', { ascending: false })
    const { data: returnStock } = await supabase.from('return_stock').select('*').order('return_date', { ascending: false })

    setStockData(stock || [])
    setInData(inStock || [])
    setOutData(outStock || [])
    setReturnData(returnStock || [])
    setLoading(false)
  }

  // ─── 실제 데이터에 있는 연도만 추출 ──────────────────────────────────────
  function getAvailableYears(): number[] {
    const set = new Set<number>()
    inData.forEach((item) => { if (item.order_date) set.add(new Date(item.order_date).getFullYear()) })
    outData.forEach((item) => { if (item.out_date) set.add(new Date(item.out_date).getFullYear()) })
    returnData.forEach((item) => { if (item.return_date) set.add(new Date(item.return_date).getFullYear()) })
    return Array.from(set).sort()
  }

  // ─── 분류 목록 (입고+출고+반품 통합) ──────────────────────────────────────
  function getAllCategories(): string[] {
    const set = new Set<string>()
    inData.forEach((item) => { if (item.category) set.add(item.category) })
    outData.forEach((item) => { if (item.category) set.add(item.category) })
    returnData.forEach((item) => { if (item.category) set.add(item.category) })
    return Array.from(set).sort()
  }

  // ─── 입고/출고/반품 차트 (연도+월 필터) ──────────────────────────────────
  // selectedMonth === 0 → 해당 연도 전체 (월별 X축)
  // selectedMonth 1~12 → 해당 연도+월 (일별은 복잡하니 해당 월 단일 막대)
  function getMainChart() {
    if (selectedMonth === 0) {
      // 전체: 선택 연도의 월별 데이터
      return Array.from({ length: 12 }, (_, i) => {
        const m = i
        const 입고 = inData.filter((item) => { const d = new Date(item.order_date); return d.getFullYear() === selectedYear && d.getMonth() === m }).reduce((s, item) => s + (item.order_qty || 0), 0)
        const 출고 = outData.filter((item) => { const d = new Date(item.out_date); return d.getFullYear() === selectedYear && d.getMonth() === m }).reduce((s, item) => s + (item.out_qty || 0), 0)
        const 반품 = returnData.filter((item) => { const d = new Date(item.return_date); return d.getFullYear() === selectedYear && d.getMonth() === m }).reduce((s, item) => s + (item.return_qty || 0), 0)
        return { label: `${i + 1}월`, 입고, 출고, 반품 }
      })
    } else {
      // 월 선택: 해당 연도+월의 일별 데이터
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1
        const 입고 = inData.filter((item) => { const d = new Date(item.order_date); return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth && d.getDate() === day }).reduce((s, item) => s + (item.order_qty || 0), 0)
        const 출고 = outData.filter((item) => { const d = new Date(item.out_date); return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth && d.getDate() === day }).reduce((s, item) => s + (item.out_qty || 0), 0)
        const 반품 = returnData.filter((item) => { const d = new Date(item.return_date); return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth && d.getDate() === day }).reduce((s, item) => s + (item.return_qty || 0), 0)
        return { label: `${day}일`, 입고, 출고, 반품 }
      })
    }
  }

  // ─── 분류 + 공통 연도/월 → 출고 Top10 파이차트 ───────────────────────────
  function getCategoryOutPieChart(category: string) {
    const map: Record<string, number> = {}
    outData.forEach((item) => {
      const d = new Date(item.out_date)
      const yearMatch = d.getFullYear() === selectedYear
      const monthMatch = selectedMonth === 0 || d.getMonth() + 1 === selectedMonth
      if ((item.category || '') === category && yearMatch && monthMatch) {
        const name = item.seller_code || item.code || '기타'
        map[name] = (map[name] || 0) + (item.out_qty || 0)
      }
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
  }

  // ─── 분류별 재고 회전율 Top10 (판매자상품코드 기준 중복 합산) ─────────────
  // 회전율은 출고합계/입고합계 기반이므로 기간 필터 적용 시 출고 기준으로 재계산
  function getTurnoverChart(category: string) {
    const outMap: Record<string, number> = {}
    outData.forEach((item) => {
      const d = new Date(item.out_date)
      const yearMatch = d.getFullYear() === selectedYear
      const monthMatch = selectedMonth === 0 || d.getMonth() + 1 === selectedMonth
      if ((item.category || '') === category && yearMatch && monthMatch) {
        const key = item.seller_code || item.code || '미등록'
        outMap[key] = (outMap[key] || 0) + (item.out_qty || 0)
      }
    })
    const inMap: Record<string, number> = {}
    inData.forEach((item) => {
      const d = new Date(item.order_date)
      const yearMatch = d.getFullYear() === selectedYear
      const monthMatch = selectedMonth === 0 || d.getMonth() + 1 === selectedMonth
      if ((item.category || '') === category && yearMatch && monthMatch) {
        const key = item.seller_code || item.code || '미등록'
        inMap[key] = (inMap[key] || 0) + (item.order_qty || 0)
      }
    })
    const keys = new Set([...Object.keys(outMap), ...Object.keys(inMap)])
    return Array.from(keys)
      .map((key) => ({ name: key, 회전율: inMap[key] > 0 ? parseFloat(((outMap[key] || 0) / inMap[key]).toFixed(2)) : 0 }))
      .filter((item) => item.회전율 > 0)
      .sort((a, b) => b.회전율 - a.회전율)
      .slice(0, 10)
  }

  // ─── 기간 비교 카드 (항상 현재 기준, 필터 무관) ───────────────────────────
  function getMonthComparison() {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear
    const calc = (data: any[], dateKey: string, qtyKey: string, m: number, y: number) =>
      data.filter((item) => { const d = new Date(item[dateKey]); return d.getMonth() === m && d.getFullYear() === y }).reduce((sum, item) => sum + (item[qtyKey] || 0), 0)
    const thisIn = calc(inData, 'order_date', 'order_qty', thisMonth, thisYear)
    const lastIn = calc(inData, 'order_date', 'order_qty', lastMonth, lastMonthYear)
    const thisOut = calc(outData, 'out_date', 'out_qty', thisMonth, thisYear)
    const lastOut = calc(outData, 'out_date', 'out_qty', lastMonth, lastMonthYear)
    const thisReturn = calc(returnData, 'return_date', 'return_qty', thisMonth, thisYear)
    const lastReturn = calc(returnData, 'return_date', 'return_qty', lastMonth, lastMonthYear)
    const diff = (cur: number, prev: number) => { if (prev === 0) return cur > 0 ? '+100%' : '0%'; const p = (((cur - prev) / prev) * 100).toFixed(1); return cur >= prev ? `+${p}%` : `${p}%` }
    const isUp = (cur: number, prev: number) => cur >= prev
    return [
      { label: '입고', this: thisIn, last: lastIn, diff: diff(thisIn, lastIn), up: isUp(thisIn, lastIn) },
      { label: '출고', this: thisOut, last: lastOut, diff: diff(thisOut, lastOut), up: isUp(thisOut, lastOut) },
      { label: '반품', this: thisReturn, last: lastReturn, diff: diff(thisReturn, lastReturn), up: !isUp(thisReturn, lastReturn) },
    ]
  }

  // ─── 재고 소진 예상일 (항상 최근 30일 기준, 필터 무관) ────────────────────
  function getDaysUntilStockout() {
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)
    const recentOutMap: Record<string, number> = {}
    outData.forEach((item) => { const d = new Date(item.out_date); if (d >= thirtyDaysAgo) recentOutMap[item.code] = (recentOutMap[item.code] || 0) + (item.out_qty || 0) })
    return stockData
      .map((item) => { const dailyOut = (recentOutMap[item.code] || 0) / 30; const daysLeft = dailyOut > 0 ? Math.floor((item.current_stock || 0) / dailyOut) : null; return { code: item.code, option: item.option || '', category: item.category || '', current_stock: item.current_stock || 0, dailyOut: parseFloat(dailyOut.toFixed(2)), daysLeft } })
      .filter((item) => item.dailyOut > 0)
      .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999))
      .slice(0, 20)
  }

  // ─── 필터 ─────────────────────────────────────────────────────────────────
  const filteredStock = stockData.filter((item) =>
    (searchCode === '' || item.code?.includes(searchCode)) &&
    (searchSellerCode === '' || item.seller_code?.includes(searchSellerCode)) &&
    (searchSupplier === '' || item.supplier?.includes(searchSupplier)) &&
    (searchCategory === '' || item.category?.includes(searchCategory))
  )
  const lowStockData = stockData.filter((item) =>
    item.current_stock <= item.alarm_qty &&
    (searchCode === '' || item.code?.includes(searchCode)) &&
    (searchSellerCode === '' || item.seller_code?.includes(searchSellerCode)) &&
    (searchSupplier === '' || item.supplier?.includes(searchSupplier)) &&
    (searchCategory === '' || item.category?.includes(searchCategory))
  )
  const filteredIn = inData.filter((item) =>
    (searchCode === '' || item.code?.includes(searchCode)) &&
    (searchSellerCode === '' || item.seller_code?.includes(searchSellerCode)) &&
    (searchSupplier === '' || item.supplier?.includes(searchSupplier)) &&
    (searchCategory === '' || item.category?.includes(searchCategory)) &&
    (startDate === '' || item.order_date >= startDate) &&
    (endDate === '' || item.order_date <= endDate)
  )
  const filteredOut = outData.filter((item) =>
    (searchCode === '' || item.code?.includes(searchCode)) &&
    (searchSellerCode === '' || item.seller_code?.includes(searchSellerCode)) &&
    (searchCategory === '' || item.category?.includes(searchCategory)) &&
    (startDate === '' || item.out_date >= startDate) &&
    (endDate === '' || item.out_date <= endDate)
  )
  const filteredReturn = returnData.filter((item) =>
    (searchCode === '' || item.code?.includes(searchCode)) &&
    (searchSellerCode === '' || item.seller_code?.includes(searchSellerCode)) &&
    (searchCategory === '' || item.category?.includes(searchCategory)) &&
    (startDate === '' || item.return_date >= startDate) &&
    (endDate === '' || item.return_date <= endDate)
  )
  const pendingData = inData.filter((item) =>
    (item.pending_qty || 0) > 0 &&
    (searchCode === '' || item.code?.includes(searchCode)) &&
    (searchSellerCode === '' || item.seller_code?.includes(searchSellerCode)) &&
    (searchSupplier === '' || item.supplier?.includes(searchSupplier)) &&
    (searchCategory === '' || item.category?.includes(searchCategory)) &&
    (startDate === '' || item.order_date >= startDate) &&
    (endDate === '' || item.order_date <= endDate)
  )

  function paginate(data: any[]) { return data.slice((currentPage - 1) * pageSize, currentPage * pageSize) }
  function totalPages(data: any[]) { return Math.ceil(data.length / pageSize) }

  function Pagination({ data }: { data: any[] }) {
    const pages = totalPages(data)
    if (pages <= 1) return null
    return (
      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: pages }, (_, i) => i + 1).map((page) => (
          <button key={page} onClick={() => setCurrentPage(page)}
            className={`px-3 py-1 text-sm rounded ${currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
            {page}
          </button>
        ))}
      </div>
    )
  }

  function changeTab(tab: string) {
    setActiveTab(tab); setCurrentPage(1)
    setSearchCode(''); setSearchSellerCode(''); setSearchSupplier(''); setSearchCategory(''); setStartDate(''); setEndDate('')
  }

  const totalItems = stockData.length
  const lowStockItems = stockData.filter((item) => item.current_stock <= item.alarm_qty).length
  const totalPending = inData.filter((item) => (item.pending_qty || 0) > 0).length

  if (loading) return <div className="p-8">로딩 중...</div>

  const tabs = [
    { id: 'stock', label: '재고 현황' },
    { id: 'in', label: '입고 내역' },
    { id: 'out', label: '출고 내역' },
    { id: 'return', label: '반품 내역' },
    { id: 'chart', label: '통계' },
  ]

  const filterUI = (showSupplier = true, showDate = true) => (
    <div className="flex flex-wrap gap-3 mb-6">
      <input type="text" placeholder="코드 검색" value={searchCode}
        onChange={(e) => { setSearchCode(e.target.value); setCurrentPage(1) }}
        className="border border-gray-300 rounded px-3 py-2 text-sm" />
      <input type="text" placeholder="판매자상품코드 검색" value={searchSellerCode}
        onChange={(e) => { setSearchSellerCode(e.target.value); setCurrentPage(1) }}
        className="border border-gray-300 rounded px-3 py-2 text-sm" />
      {showSupplier && (
        <input type="text" placeholder="거래처 검색" value={searchSupplier}
          onChange={(e) => { setSearchSupplier(e.target.value); setCurrentPage(1) }}
          className="border border-gray-300 rounded px-3 py-2 text-sm" />
      )}
      <input type="text" placeholder="분류 검색" value={searchCategory}
        onChange={(e) => { setSearchCategory(e.target.value); setCurrentPage(1) }}
        className="border border-gray-300 rounded px-3 py-2 text-sm" />
      {showDate && (
        <>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1) }} className="border border-gray-300 rounded px-3 py-2 text-sm" />
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1) }} className="border border-gray-300 rounded px-3 py-2 text-sm" />
        </>
      )}
    </div>
  )

  const monthComparison = getMonthComparison()
  const stockoutData = getDaysUntilStockout()
  const allCategories = getAllCategories()
  const availableYears = getAvailableYears()
  const now = new Date()
  const thisMonthLabel = `${now.getMonth() + 1}월`
  const lastMonthLabel = now.getMonth() === 0 ? '12월' : `${now.getMonth()}월`

  // 차트 제목용 기간 텍스트
  const periodLabel = selectedMonth === 0 ? `${selectedYear}년` : `${selectedYear}년 ${selectedMonth}월`

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">재고 대시보드</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div onClick={() => changeTab('stock')} className="bg-blue-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow">
          <p className="text-sm text-blue-600">전체 품목 수</p>
          <p className="text-3xl font-bold text-blue-800">{totalItems}</p>
        </div>
        <div onClick={() => changeTab('lowstock')} className="bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow">
          <p className="text-sm text-red-600">재고 부족 품목</p>
          <p className="text-3xl font-bold text-red-800">{lowStockItems}</p>
        </div>
        <div onClick={() => changeTab('pending')} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow">
          <p className="text-sm text-yellow-600">미입고 건수</p>
          <p className="text-3xl font-bold text-yellow-800">{totalPending}</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex flex-wrap border-b border-gray-300 mb-6">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => changeTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium ${activeTab === tab.id ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 재고 현황 ─────────────────────────────────────────────────────── */}
      {activeTab === 'stock' && (
        <section>
          {filterUI(true, false)}
          <p className="text-sm text-gray-500 mb-2">총 {filteredStock.length}건</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">코드</th>
                  <th className="border border-gray-300 p-2">분류</th>
                  <th className="border border-gray-300 p-2">거래처</th>
                  <th className="border border-gray-300 p-2">판매자상품코드</th>
                  <th className="border border-gray-300 p-2">옵션</th>
                  <th className="border border-gray-300 p-2">보유재고</th>
                  <th className="border border-gray-300 p-2">이월합계</th>
                  <th className="border border-gray-300 p-2">입고합계</th>
                  <th className="border border-gray-300 p-2">출고합계</th>
                  <th className="border border-gray-300 p-2">반품합계</th>
                </tr>
              </thead>
              <tbody>
                {paginate(filteredStock).map((item: any) => (
                  <tr key={item.id} className={item.current_stock <= item.alarm_qty ? 'bg-red-50' : ''}>
                    <td className="border border-gray-300 p-2">{item.code}</td>
                    <td className="border border-gray-300 p-2">{item.category}</td>
                    <td className="border border-gray-300 p-2">{item.supplier}</td>
                    <td className="border border-gray-300 p-2">{item.seller_code}</td>
                    <td className="border border-gray-300 p-2">{item.option}</td>
                    <td className="border border-gray-300 p-2 text-center font-bold">{item.current_stock}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.carry_over ?? '-'}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.in_total}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.out_total}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.return_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination data={filteredStock} />
        </section>
      )}

      {/* ── 재고 부족 ────────────────────────────────────────────────────── */}
      {activeTab === 'lowstock' && (
        <section>
          {filterUI(true, false)}
          <p className="text-sm text-gray-500 mb-2">총 {lowStockData.length}건</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-red-100">
                  <th className="border border-gray-300 p-2">코드</th>
                  <th className="border border-gray-300 p-2">분류</th>
                  <th className="border border-gray-300 p-2">거래처</th>
                  <th className="border border-gray-300 p-2">판매자상품코드</th>
                  <th className="border border-gray-300 p-2">옵션</th>
                  <th className="border border-gray-300 p-2">보유재고</th>
                  <th className="border border-gray-300 p-2">알람수량</th>
                </tr>
              </thead>
              <tbody>
                {paginate(lowStockData).map((item: any) => (
                  <tr key={item.id} className="bg-red-50">
                    <td className="border border-gray-300 p-2">{item.code}</td>
                    <td className="border border-gray-300 p-2">{item.category}</td>
                    <td className="border border-gray-300 p-2">{item.supplier}</td>
                    <td className="border border-gray-300 p-2">{item.seller_code}</td>
                    <td className="border border-gray-300 p-2">{item.option}</td>
                    <td className="border border-gray-300 p-2 text-center font-bold text-red-600">{item.current_stock}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.alarm_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination data={lowStockData} />
        </section>
      )}

      {/* ── 미입고 ───────────────────────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <section>
          {filterUI(true, true)}
          <p className="text-sm text-gray-500 mb-2">총 {pendingData.length}건</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-yellow-100">
                  <th className="border border-gray-300 p-2">주문날짜</th>
                  <th className="border border-gray-300 p-2">입고번호</th>
                  <th className="border border-gray-300 p-2">분류</th>
                  <th className="border border-gray-300 p-2">거래처</th>
                  <th className="border border-gray-300 p-2">코드</th>
                  <th className="border border-gray-300 p-2">판매자상품코드</th>
                  <th className="border border-gray-300 p-2">옵션</th>
                  <th className="border border-gray-300 p-2">주문수량</th>
                  <th className="border border-gray-300 p-2">입고수량</th>
                  <th className="border border-gray-300 p-2">미입고수량</th>
                </tr>
              </thead>
              <tbody>
                {paginate(pendingData).map((item: any) => (
                  <tr key={item.id} className="bg-yellow-50">
                    <td className="border border-gray-300 p-2">{item.order_date}</td>
                    <td className="border border-gray-300 p-2">{item.in_number}</td>
                    <td className="border border-gray-300 p-2">{item.category}</td>
                    <td className="border border-gray-300 p-2">{item.supplier}</td>
                    <td className="border border-gray-300 p-2">{item.code}</td>
                    <td className="border border-gray-300 p-2">{item.seller_code}</td>
                    <td className="border border-gray-300 p-2">{item.option}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.order_qty}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.in_qty}</td>
                    <td className="border border-gray-300 p-2 text-center font-bold text-yellow-600">{item.pending_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination data={pendingData} />
        </section>
      )}

      {/* ── 입고 내역 ─────────────────────────────────────────────────────── */}
      {activeTab === 'in' && (
        <section>
          {filterUI(true, true)}
          <p className="text-sm text-gray-500 mb-2">총 {filteredIn.length}건</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">주문날짜</th>
                  <th className="border border-gray-300 p-2">입고번호</th>
                  <th className="border border-gray-300 p-2">분류</th>
                  <th className="border border-gray-300 p-2">거래처</th>
                  <th className="border border-gray-300 p-2">코드</th>
                  <th className="border border-gray-300 p-2">판매자상품코드</th>
                  <th className="border border-gray-300 p-2">옵션</th>
                  <th className="border border-gray-300 p-2">주문수량</th>
                  <th className="border border-gray-300 p-2">입고수량</th>
                  <th className="border border-gray-300 p-2">미입고수량</th>
                </tr>
              </thead>
              <tbody>
                {paginate(filteredIn).map((item: any) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 p-2">{item.order_date}</td>
                    <td className="border border-gray-300 p-2">{item.in_number}</td>
                    <td className="border border-gray-300 p-2">{item.category}</td>
                    <td className="border border-gray-300 p-2">{item.supplier}</td>
                    <td className="border border-gray-300 p-2">{item.code}</td>
                    <td className="border border-gray-300 p-2">{item.seller_code}</td>
                    <td className="border border-gray-300 p-2">{item.option}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.order_qty}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.in_qty}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.pending_qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination data={filteredIn} />
        </section>
      )}

      {/* ── 출고 내역 ─────────────────────────────────────────────────────── */}
      {activeTab === 'out' && (
        <section>
          {filterUI(false, true)}
          <p className="text-sm text-gray-500 mb-2">총 {filteredOut.length}건</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">출고날짜</th>
                  <th className="border border-gray-300 p-2">출고번호</th>
                  <th className="border border-gray-300 p-2">분류</th>
                  <th className="border border-gray-300 p-2">코드</th>
                  <th className="border border-gray-300 p-2">판매자상품코드</th>
                  <th className="border border-gray-300 p-2">옵션</th>
                  <th className="border border-gray-300 p-2">출고수량</th>
                  <th className="border border-gray-300 p-2">비고</th>
                </tr>
              </thead>
              <tbody>
                {paginate(filteredOut).map((item: any) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 p-2">{item.out_date}</td>
                    <td className="border border-gray-300 p-2">{item.out_number}</td>
                    <td className="border border-gray-300 p-2">{item.category}</td>
                    <td className="border border-gray-300 p-2">{item.code}</td>
                    <td className="border border-gray-300 p-2">{item.seller_code}</td>
                    <td className="border border-gray-300 p-2">{item.option}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.out_qty}</td>
                    <td className="border border-gray-300 p-2">{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination data={filteredOut} />
        </section>
      )}

      {/* ── 반품 내역 ─────────────────────────────────────────────────────── */}
      {activeTab === 'return' && (
        <section>
          {filterUI(false, true)}
          <p className="text-sm text-gray-500 mb-2">총 {filteredReturn.length}건</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2">반품날짜</th>
                  <th className="border border-gray-300 p-2">반품번호</th>
                  <th className="border border-gray-300 p-2">분류</th>
                  <th className="border border-gray-300 p-2">코드</th>
                  <th className="border border-gray-300 p-2">판매자상품코드</th>
                  <th className="border border-gray-300 p-2">옵션</th>
                  <th className="border border-gray-300 p-2">반품수량</th>
                  <th className="border border-gray-300 p-2">비고</th>
                </tr>
              </thead>
              <tbody>
                {paginate(filteredReturn).map((item: any) => (
                  <tr key={item.id}>
                    <td className="border border-gray-300 p-2">{item.return_date}</td>
                    <td className="border border-gray-300 p-2">{item.return_number}</td>
                    <td className="border border-gray-300 p-2">{item.category}</td>
                    <td className="border border-gray-300 p-2">{item.code}</td>
                    <td className="border border-gray-300 p-2">{item.seller_code}</td>
                    <td className="border border-gray-300 p-2">{item.option}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.return_qty}</td>
                    <td className="border border-gray-300 p-2">{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination data={filteredReturn} />
        </section>
      )}

      {/* ── 통계 탭 ───────────────────────────────────────────────────────── */}
      {activeTab === 'chart' && (
        <section>

          {/* ── 공통 연도/월 필터 ────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-8 flex-wrap">
            <span className="text-sm font-medium text-gray-700">기간 선택</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {availableYears.length === 0
                ? <option>데이터 없음</option>
                : availableYears.map((year) => <option key={year} value={year}>{year}년</option>)
              }
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value={0}>전체</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
          </div>

          {/* ── 이번 달 vs 지난달 비교 (필터 무관) ──────────────────────────── */}
          <h2 className="text-lg font-semibold mb-4">
            이번 달 ({thisMonthLabel}) vs 지난달 ({lastMonthLabel}) 비교
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-10">
            {monthComparison.map((item) => (
              <div key={item.label} className="border rounded-lg p-4 bg-white shadow-sm">
                <p className="text-sm text-gray-500 mb-1">{item.label}</p>
                <div className="flex items-end gap-3">
                  <p className="text-2xl font-bold">{item.this.toLocaleString()}</p>
                  <p className={`text-sm font-medium pb-0.5 ${item.up ? 'text-blue-500' : 'text-red-500'}`}>{item.diff}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1">지난달: {item.last.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* ── 입고/출고/반품 차트 (연도+월 필터 적용) ─────────────────────── */}
          <h2 className="text-lg font-semibold mb-4">{periodLabel} 입고/출고/반품</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={getMainChart()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="입고" fill="#3b82f6" />
              <Bar dataKey="출고" fill="#ef4444" />
              <Bar dataKey="반품" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>

          {/* ── 분류 출고 Top10 파이차트 (공통 연도+월 필터 적용) ─────────────── */}
          <h2 className="text-lg font-semibold mt-12 mb-3">
            {selectedCategoryForOut ? `${periodLabel} ${selectedCategoryForOut} 출고 Top 10` : `${periodLabel} 분류 출고 Top 10`}
          </h2>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <label className="text-sm text-gray-600">분류</label>
            <select value={selectedCategoryForOut} onChange={(e) => setSelectedCategoryForOut(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">-- 분류 선택 --</option>
              {allCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          {selectedCategoryForOut === '' ? (
            <p className="text-sm text-gray-400 py-8 text-center border rounded-lg bg-gray-50">분류를 선택하면 출고 상위 10개 품목이 표시됩니다.</p>
          ) : (
            (() => {
              const pieData = getCategoryOutPieChart(selectedCategoryForOut)
              return pieData.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center border rounded-lg bg-gray-50">{periodLabel} 해당 분류의 출고 데이터가 없습니다.</p>
              ) : (
                <ResponsiveContainer width="100%" height={380}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={140}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {pieData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [value, '출고수량']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )
            })()
          )}

          {/* ── 분류별 재고 회전율 Top10 (공통 연도+월 필터 적용) ────────────── */}
          <h2 className="text-lg font-semibold mt-12 mb-3">
            {selectedCategoryForTurnover ? `${periodLabel} ${selectedCategoryForTurnover} 재고 회전율 Top 10` : `${periodLabel} 분류별 재고 회전율 Top 10`}
          </h2>
          <p className="text-xs text-gray-400 mb-3">※ 회전율 = 출고수량 ÷ 입고수량. 판매자상품코드 기준으로 집계됩니다.</p>
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-gray-600">분류</label>
            <select value={selectedCategoryForTurnover} onChange={(e) => setSelectedCategoryForTurnover(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">-- 분류 선택 --</option>
              {allCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          {selectedCategoryForTurnover === '' ? (
            <p className="text-sm text-gray-400 py-8 text-center border rounded-lg bg-gray-50">분류를 선택하면 재고 회전율 Top 10이 표시됩니다.</p>
          ) : (
            (() => {
              const turnoverData = getTurnoverChart(selectedCategoryForTurnover)
              return turnoverData.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center border rounded-lg bg-gray-50">{periodLabel} 해당 분류의 회전율 데이터가 없습니다.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(300, turnoverData.length * 45)}>
                  <BarChart data={turnoverData} layout="vertical" margin={{ top: 10, right: 60, left: 160, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 'auto']} />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [value, '회전율']} />
                    <Bar dataKey="회전율" fill="#8b5cf6" label={{ position: 'right', fontSize: 12 }} />
                  </BarChart>
                </ResponsiveContainer>
              )
            })()
          )}

          {/* ── 재고 소진 예상일 (필터 무관, 항상 최근 30일 기준) ─────────────── */}
          <h2 className="text-lg font-semibold mt-12 mb-2">재고 소진 예상일 (최근 30일 출고 기준)</h2>
          <p className="text-xs text-gray-400 mb-4">※ 최근 30일 평균 일출고량 기준으로 현재 재고가 며칠 뒤 소진되는지 예측합니다.</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-purple-50">
                  <th className="border border-gray-300 p-2">코드</th>
                  <th className="border border-gray-300 p-2">분류</th>
                  <th className="border border-gray-300 p-2">옵션</th>
                  <th className="border border-gray-300 p-2">보유재고</th>
                  <th className="border border-gray-300 p-2">일평균 출고</th>
                  <th className="border border-gray-300 p-2">소진 예상일</th>
                  <th className="border border-gray-300 p-2">예상 소진일</th>
                </tr>
              </thead>
              <tbody>
                {stockoutData.map((item, idx) => {
                  const daysLeft = item.daysLeft
                  const urgency = daysLeft === null ? 'text-gray-400' : daysLeft <= 7 ? 'text-red-600 font-bold' : daysLeft <= 30 ? 'text-yellow-600 font-semibold' : 'text-green-600'
                  const expectedDate = daysLeft !== null ? new Date(Date.now() + daysLeft * 86400000).toLocaleDateString('ko-KR') : '-'
                  return (
                    <tr key={idx} className={daysLeft !== null && daysLeft <= 7 ? 'bg-red-50' : daysLeft !== null && daysLeft <= 30 ? 'bg-yellow-50' : ''}>
                      <td className="border border-gray-300 p-2">{item.code}</td>
                      <td className="border border-gray-300 p-2">{item.category}</td>
                      <td className="border border-gray-300 p-2">{item.option}</td>
                      <td className="border border-gray-300 p-2 text-center">{item.current_stock}</td>
                      <td className="border border-gray-300 p-2 text-center">{item.dailyOut}</td>
                      <td className={`border border-gray-300 p-2 text-center ${urgency}`}>{daysLeft !== null ? `${daysLeft}일` : '-'}</td>
                      <td className="border border-gray-300 p-2 text-center text-gray-600">{expectedDate}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block"></span> 7일 이내 소진</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 inline-block"></span> 30일 이내 소진</span>
          </div>

        </section>
      )}
    </main>
  )
}
