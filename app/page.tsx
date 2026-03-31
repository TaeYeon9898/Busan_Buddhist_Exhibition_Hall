'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

export default function Home() {
  const [stockData, setStockData] = useState<any[]>([])
  const [inData, setInData] = useState<any[]>([])
  const [outData, setOutData] = useState<any[]>([])
  const [returnData, setReturnData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stock')

  // 필터
  const [searchCode, setSearchCode] = useState('')
  const [searchSupplier, setSearchSupplier] = useState('')
  const [searchCategory, setSearchCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: stock } = await supabase
      .from('product_info')
      .select('*')
      .order('code')

    const { data: inStock } = await supabase
      .from('in_stock')
      .select('*')
      .order('order_date', { ascending: false })

    const { data: outStock } = await supabase
      .from('out_stock')
      .select('*')
      .order('out_date', { ascending: false })

    const { data: returnStock } = await supabase
      .from('return_stock')
      .select('*')
      .order('return_date', { ascending: false })

    setStockData(stock || [])
    setInData(inStock || [])
    setOutData(outStock || [])
    setReturnData(returnStock || [])
    setLoading(false)
  }

  // 월별 차트 데이터
  function getMonthlyChart() {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: `${i + 1}월`,
      입고: 0,
      출고: 0,
      반품: 0,
    }))

    inData.forEach((item) => {
      const date = new Date(item.order_date)
      if (date.getFullYear() === selectedYear) {
        months[date.getMonth()].입고 += item.order_qty || 0
      }
    })

    outData.forEach((item) => {
      const date = new Date(item.out_date)
      if (date.getFullYear() === selectedYear) {
        months[date.getMonth()].출고 += item.out_qty || 0
      }
    })

    returnData.forEach((item) => {
      const date = new Date(item.return_date)
      if (date.getFullYear() === selectedYear) {
        months[date.getMonth()].반품 += item.return_qty || 0
      }
    })

    return months
  }

  // 재고 필터
  const filteredStock = stockData.filter((item) => {
    return (
      (searchCode === '' || item.code?.includes(searchCode)) &&
      (searchSupplier === '' || item.supplier?.includes(searchSupplier)) &&
      (searchCategory === '' || item.category?.includes(searchCategory))
    )
  })

  // 입고 필터
  const filteredIn = inData.filter((item) => {
    return (
      (searchCode === '' || item.code?.includes(searchCode)) &&
      (searchSupplier === '' || item.supplier?.includes(searchSupplier)) &&
      (searchCategory === '' || item.category?.includes(searchCategory)) &&
      (startDate === '' || item.order_date >= startDate) &&
      (endDate === '' || item.order_date <= endDate)
    )
  })

  // 출고 필터
  const filteredOut = outData.filter((item) => {
    return (
      (searchCode === '' || item.code?.includes(searchCode)) &&
      (searchCategory === '' || item.category?.includes(searchCategory)) &&
      (startDate === '' || item.out_date >= startDate) &&
      (endDate === '' || item.out_date <= endDate)
    )
  })

  // 반품 필터
  const filteredReturn = returnData.filter((item) => {
    return (
      (searchCode === '' || item.code?.includes(searchCode)) &&
      (searchCategory === '' || item.category?.includes(searchCategory)) &&
      (startDate === '' || item.return_date >= startDate) &&
      (endDate === '' || item.return_date <= endDate)
    )
  })

  // 페이지네이션
  function paginate(data: any[]) {
    const start = (currentPage - 1) * pageSize
    return data.slice(start, start + pageSize)
  }

  function totalPages(data: any[]) {
    return Math.ceil(data.length / pageSize)
  }

  // 탭 변경시 페이지 초기화
  function changeTab(tab: string) {
    setActiveTab(tab)
    setCurrentPage(1)
    setSearchCode('')
    setSearchSupplier('')
    setSearchCategory('')
    setStartDate('')
    setEndDate('')
  }

  // 요약 카드
  const totalItems = stockData.length
  const lowStockItems = stockData.filter((item) => item.current_stock <= item.alarm_qty).length

  if (loading) return <div className="p-8">로딩 중...</div>

  const tabs = [
    { id: 'stock', label: '재고 현황' },
    { id: 'in', label: '입고 내역' },
    { id: 'out', label: '출고 내역' },
    { id: 'return', label: '반품 내역' },
    { id: 'chart', label: '통계' },
  ]

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">재고 대시보드</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600">전체 품목 수</p>
          <p className="text-3xl font-bold text-blue-800">{totalItems}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">재고 부족 품목</p>
          <p className="text-3xl font-bold text-red-800">{lowStockItems}</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-300 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => changeTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 필터 */}
      {activeTab !== 'chart' && (
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="코드 검색"
            value={searchCode}
            onChange={(e) => { setSearchCode(e.target.value); setCurrentPage(1) }}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          {(activeTab === 'stock' || activeTab === 'in') && (
            <input
              type="text"
              placeholder="거래처 검색"
              value={searchSupplier}
              onChange={(e) => { setSearchSupplier(e.target.value); setCurrentPage(1) }}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
          )}
          <input
            type="text"
            placeholder="분류 검색"
            value={searchCategory}
            onChange={(e) => { setSearchCategory(e.target.value); setCurrentPage(1) }}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          {activeTab !== 'stock' && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1) }}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1) }}
                className="border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </>
          )}
        </div>
      )}

      {/* 재고 현황 */}
      {activeTab === 'stock' && (
        <section>
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
                    <td className="border border-gray-300 p-2 text-center">{item.in_total}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.out_total}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.return_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 페이지네이션 */}
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalPages(filteredStock) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm rounded ${
                  currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 입고 내역 */}
      {activeTab === 'in' && (
        <section>
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
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalPages(filteredIn) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm rounded ${
                  currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 출고 내역 */}
      {activeTab === 'out' && (
        <section>
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
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalPages(filteredOut) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm rounded ${
                  currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 반품 내역 */}
      {activeTab === 'return' && (
        <section>
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
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalPages(filteredReturn) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm rounded ${
                  currentPage === page ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 통계 */}
      {activeTab === 'chart' && (
        <section>
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm font-medium">연도 선택</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {[2023, 2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
          <h2 className="text-lg font-semibold mb-4">{selectedYear}년 월별 입고/출고/반품 현황</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getMonthlyChart()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="입고" fill="#3b82f6" />
              <Bar dataKey="출고" fill="#ef4444" />
              <Bar dataKey="반품" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}
    </main>
  )
}